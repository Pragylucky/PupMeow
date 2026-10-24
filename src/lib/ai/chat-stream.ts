import "server-only";
import { generateText, streamText } from "ai";
import type { AiProviderName } from "./config";
import { isChatRaceEnabled } from "./config";
import { buildChatModelChain } from "./chat-fallback";
import { flattenAiErrorMessage } from "./errors";
import { isLikelyTruncatedReply } from "./truncation";

const CHAT_MAX_RETRIES = 1;
/** Match /api/ai/chat maxDuration — short timeouts were cutting replies mid-sentence. */
const CHAT_TIMEOUT_MS = 55_000;

export type ChatStreamParams = {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxOutputTokens?: number;
  temperature?: number;
};

async function drainTextStream(
  result: ReturnType<typeof streamText>,
  onChunk?: (chunk: string) => void,
): Promise<{ full: string; finishReason?: string }> {
  let full = "";
  for await (const chunk of result.textStream) {
    if (!chunk) continue;
    full += chunk;
    onChunk?.(chunk);
  }
  let finishReason: string | undefined;
  try {
    const [complete, reason] = await Promise.all([result.text, result.finishReason]);
    finishReason = reason;
    if (complete.length > full.length) {
      const extra = complete.slice(full.length);
      full = complete;
      onChunk?.(extra);
    } else if (!full.trim() && complete.trim()) {
      full = complete;
      onChunk?.(complete);
    }
  } catch {
    /* stream may already be closed */
  }
  return { full, finishReason };
}

async function repairTruncatedReply(
  model: ReturnType<typeof buildChatModelChain>[number]["model"],
  provider: AiProviderName,
  params: ChatStreamParams,
  partial: string,
  opts: { maxRetries: number; signal: AbortSignal },
): Promise<string> {
  let text = partial;
  if (!isLikelyTruncatedReply(text)) return text;

  console.warn("[ai/chat] repairing truncated stream from", provider);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const out = await generateText({
        model,
        system: params.system,
        messages: params.messages,
        maxOutputTokens: (params.maxOutputTokens ?? 2048) + 512,
        temperature: params.temperature ?? 0.5,
        maxRetries: opts.maxRetries,
        abortSignal: opts.signal,
      });
      if (out.text.trim().length > text.trim().length) text = out.text;
      if (!isLikelyTruncatedReply(text, out.finishReason)) return text;
    } catch (err) {
      console.warn("[ai/chat] repair attempt failed", provider, flattenAiErrorMessage(err));
      break;
    }
  }
  return text;
}

/** Send the final reply to the client once it is complete (avoids showing cut-off streams). */
function flushReplyToClient(streamed: string, final: string, onChunk: (chunk: string) => void) {
  if (!final.trim()) return;
  if (!streamed) {
    onChunk(final);
    return;
  }
  if (final === streamed) {
    return;
  }
  if (final.startsWith(streamed)) {
    const extra = final.slice(streamed.length);
    if (extra) onChunk(extra);
    return;
  }
  onChunk(final);
}

async function streamOne(
  model: ReturnType<typeof buildChatModelChain>[number]["model"],
  provider: AiProviderName,
  params: ChatStreamParams,
  onChunk: (chunk: string) => void,
  opts: { maxRetries: number; signal: AbortSignal },
): Promise<{ full: string; provider: AiProviderName } | null> {
  const parts: string[] = [];
  const result = streamText({
    model,
    system: params.system,
    messages: params.messages,
    maxOutputTokens: params.maxOutputTokens ?? 2048,
    temperature: params.temperature ?? 0.5,
    maxRetries: opts.maxRetries,
    abortSignal: opts.signal,
  });
  try {
    const { full, finishReason } = await drainTextStream(result, (c) => {
      parts.push(c);
      onChunk(c);
    });
    if (!full.trim()) return null;
    const final = await repairTruncatedReply(model, provider, params, full, opts);
    if (!final.trim() || isLikelyTruncatedReply(final)) {
      console.warn("[ai/chat] still truncated after repair from", provider, finishReason ?? "");
      return null;
    }
    flushReplyToClient(parts.join(""), final, onChunk);
    return { full: final, provider };
  } catch (err) {
    if (parts.length) {
      console.warn("[ai/chat] dropped partial stream from", provider, flattenAiErrorMessage(err));
    }
    throw err;
  }
}

async function streamSequential(
  chain: ReturnType<typeof buildChatModelChain>,
  params: ChatStreamParams,
  onChunk: (chunk: string) => void,
): Promise<{ full: string; provider: AiProviderName }> {
  let lastErr: unknown;
  for (let i = 0; i < chain.length; i++) {
    const { model, provider } = chain[i]!;
    try {
      const out = await streamOne(model, provider, params, onChunk, {
        maxRetries: CHAT_MAX_RETRIES,
        signal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
      });
      if (out) return out;
      lastErr = new Error(`Empty response from ${provider}`);
      console.warn("[ai/chat] empty stream from", provider);
    } catch (err) {
      lastErr = err;
      if (i < chain.length - 1) {
        console.warn("[ai/chat] trying fallback after", provider, flattenAiErrorMessage(err));
      }
    }
  }
  throw lastErr ?? new Error("Kaia couldn't get a reply");
}

async function streamRace(
  chain: ReturnType<typeof buildChatModelChain>,
  params: ChatStreamParams,
  onChunk: (chunk: string) => void,
): Promise<{ full: string; provider: AiProviderName }> {
  const controllers = chain.map(() => new AbortController());
  let winner: AiProviderName | null = null;
  let full = "";

  const claim = (provider: AiProviderName): boolean => {
    if (winner !== null) return winner === provider;
    winner = provider;
    chain.forEach(({ provider: p }, idx) => {
      if (p !== provider) controllers[idx]?.abort();
    });
    console.info("[ai/chat] race winner", provider);
    return true;
  };

  const run = async (idx: number) => {
    const { model, provider } = chain[idx]!;
    const buffered: string[] = [];
    try {
      const result = streamText({
        model,
        system: params.system,
        messages: params.messages,
        maxOutputTokens: params.maxOutputTokens ?? 2048,
        temperature: params.temperature ?? 0.5,
        maxRetries: 0,
        abortSignal: AbortSignal.any([
          controllers[idx]!.signal,
          AbortSignal.timeout(CHAT_TIMEOUT_MS),
        ]),
      });
      let local = "";
      let finishReason: string | undefined;
      for await (const chunk of result.textStream) {
        if (!chunk) continue;
        if (!claim(provider)) break;
        local += chunk;
        buffered.push(chunk);
      }
      if (winner === provider) {
        try {
          const [complete, reason] = await Promise.all([result.text, result.finishReason]);
          finishReason = reason;
          if (complete.length > local.length) {
            const extra = complete.slice(local.length);
            local = complete;
            buffered.push(extra);
          }
        } catch {
          /* ignore */
        }
      }
      if (winner === provider && local.trim()) {
        const final = await repairTruncatedReply(model, provider, params, local, {
          maxRetries: 0,
          signal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
        });
        if (!isLikelyTruncatedReply(final, finishReason)) {
          full = final;
          flushReplyToClient(buffered.join(""), final, onChunk);
        }
      }
    } catch (err) {
      if (controllers[idx]?.signal.aborted && winner && winner !== provider) return;
      if (!winner) {
        console.warn("[ai/chat] race candidate failed", provider, flattenAiErrorMessage(err));
      }
    }
  };

  await Promise.all(chain.map((_, idx) => run(idx)));

  if (full.trim() && winner) return { full, provider: winner };

  console.warn("[ai/chat] race produced no text, using sequential fallback");
  return streamSequential(chain, params, onChunk);
}

/** Stream Kaia reply — sequential by default; optional parallel race via AI_CHAT_RACE=true. */
export async function streamChatToWriter(
  params: ChatStreamParams,
  onChunk: (chunk: string) => void,
): Promise<{ full: string; provider: AiProviderName }> {
  const chain = buildChatModelChain();
  if (!chain.length) throw new Error("AI is not configured");
  if (chain.length === 1 || !isChatRaceEnabled(chain.length)) {
    return streamSequential(chain, params, onChunk);
  }
  return streamRace(chain, params, onChunk);
}
