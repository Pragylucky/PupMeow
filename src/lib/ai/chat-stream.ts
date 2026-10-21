import "server-only";
import { streamText } from "ai";
import type { AiProviderName } from "./config";
import { isChatRaceEnabled } from "./config";
import { buildChatModelChain } from "./chat-fallback";
import { flattenAiErrorMessage } from "./errors";

const CHAT_MAX_RETRIES = 1;
const CHAT_TIMEOUT_MS = 22_000;

export type ChatStreamParams = {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxOutputTokens?: number;
  temperature?: number;
};

async function drainTextStream(
  result: ReturnType<typeof streamText>,
  onChunk: (chunk: string) => void,
): Promise<string> {
  let full = "";
  for await (const chunk of result.textStream) {
    if (!chunk) continue;
    full += chunk;
    onChunk(chunk);
  }
  if (!full.trim()) {
    try {
      const rest = await result.text;
      if (rest?.trim()) {
        full = rest;
        onChunk(rest);
      }
    } catch {
      /* ignore */
    }
  }
  return full;
}

async function streamOne(
  model: ReturnType<typeof buildChatModelChain>[number]["model"],
  provider: AiProviderName,
  params: ChatStreamParams,
  onChunk: (chunk: string) => void,
  opts: { maxRetries: number; signal: AbortSignal },
): Promise<{ full: string; provider: AiProviderName } | null> {
  const result = streamText({
    model,
    system: params.system,
    messages: params.messages,
    maxOutputTokens: params.maxOutputTokens ?? 550,
    temperature: params.temperature ?? 0.5,
    maxRetries: opts.maxRetries,
    abortSignal: opts.signal,
  });
  const full = await drainTextStream(result, onChunk);
  if (!full.trim()) return null;
  return { full, provider };
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
  const errors: unknown[] = [];

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
    let local = "";
    try {
      const result = streamText({
        model,
        system: params.system,
        messages: params.messages,
        maxOutputTokens: params.maxOutputTokens ?? 550,
        temperature: params.temperature ?? 0.5,
        maxRetries: 0,
        abortSignal: AbortSignal.any([
          controllers[idx]!.signal,
          AbortSignal.timeout(CHAT_TIMEOUT_MS),
        ]),
      });
      for await (const chunk of result.textStream) {
        if (!chunk) continue;
        if (!claim(provider)) break;
        local += chunk;
        full += chunk;
        onChunk(chunk);
      }
      if (winner === provider && !local.trim()) {
        try {
          const rest = await result.text;
          if (rest?.trim()) {
            local = rest;
            full += rest;
            onChunk(rest);
          }
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      if (controllers[idx]?.signal.aborted && winner && winner !== provider) return;
      errors.push(err);
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

/** Stream Kaia reply — parallel race when multiple keys are set, else single provider. */
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
