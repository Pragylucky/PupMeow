import "server-only";
import { generateText, streamText } from "ai";
import type { AiProviderName } from "./config";
import { isChatRaceEnabled } from "./config";
import { buildChatModelChain } from "./chat-fallback";
import { flattenAiErrorMessage } from "./errors";
import { isLikelyTruncatedReply } from "./truncation";

const CHAT_MAX_RETRIES = 1;
/** Short answers arrive faster; the prompt also asks Kaia to keep replies brief. */
export const KAIA_MAX_OUTPUT_TOKENS = 700;
const CHAT_TIMEOUT_MS = 55_000;
/** First provider (cold start) needs more time; fallbacks get a shorter wait. */
const FIRST_PROVIDER_FIRST_TOKEN_MS = 18_000;
const FALLBACK_FIRST_TOKEN_MS = 22_000;

export type ChatStreamParams = {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxOutputTokens?: number;
  temperature?: number;
};

class NoFirstTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoFirstTokenError";
  }
}

function isNoFirstTokenError(err: unknown): boolean {
  return err instanceof NoFirstTokenError || (err instanceof Error && err.name === "NoFirstTokenError");
}

const GOOGLE_CHAT_MAX_OUTPUT_TOKENS = 2048;

/** Provider-specific limits so Gemini thinking doesn't burn the whole budget. */
function modelCallOptions(provider: AiProviderName, params: ChatStreamParams) {
  if (provider === "google") {
    return {
      system: params.system,
      messages: params.messages,
      maxOutputTokens: GOOGLE_CHAT_MAX_OUTPUT_TOKENS,
      providerOptions: {
        google: { thinkingConfig: { thinkingLevel: "low" as const } },
      },
    };
  }
  if (provider === "groq") {
    return {
      system: params.system,
      messages: params.messages,
      maxOutputTokens: params.maxOutputTokens ?? KAIA_MAX_OUTPUT_TOKENS,
      temperature: params.temperature ?? 0.5,
      providerOptions: { groq: { reasoningEffort: "low" as const } },
    };
  }
  return {
    system: params.system,
    messages: params.messages,
    maxOutputTokens: params.maxOutputTokens ?? KAIA_MAX_OUTPUT_TOKENS,
    temperature: params.temperature ?? 0.5,
  };
}

/**
 * Stream one provider to the client.
 * - No first token within 8s → try next provider (unless user already saw text).
 * - No repair pass (avoids duplicate answers).
 */
async function streamOne(
  model: ReturnType<typeof buildChatModelChain>[number]["model"],
  provider: AiProviderName,
  params: ChatStreamParams,
  onChunk: (chunk: string) => void,
  opts: { maxRetries: number; signal: AbortSignal; firstTokenMs: number },
): Promise<{ full: string; provider: AiProviderName } | null> {
  const firstToken = new AbortController();
  const timer = setTimeout(
    () => firstToken.abort(new NoFirstTokenError(`${provider} sent nothing in ${opts.firstTokenMs}ms`)),
    opts.firstTokenMs,
  );
  let full = "";
  try {
    const result = streamText({
      model,
      ...modelCallOptions(provider, params),
      maxRetries: opts.maxRetries,
      abortSignal: AbortSignal.any([opts.signal, firstToken.signal]),
    });
    for await (const chunk of result.textStream) {
      if (!chunk) continue;
      if (!full) clearTimeout(timer);
      full += chunk;
      onChunk(chunk);
    }
    if (!full.trim()) {
      const complete = await Promise.resolve(result.text).catch(() => "");
      if (complete.trim()) {
        full = complete;
        onChunk(complete);
      }
    }
  } catch (err) {
    if (!full) {
      if (isNoFirstTokenError(err) || firstToken.signal.aborted) {
        throw new NoFirstTokenError(`${provider} was too slow to start`);
      }
      throw err;
    }
    console.warn("[ai/chat] stream ended early from", provider, flattenAiErrorMessage(err));
  } finally {
    clearTimeout(timer);
  }
  if (!full.trim()) {
    try {
      const { text } = await generateText({
        model,
        ...modelCallOptions(provider, params),
        maxRetries: opts.maxRetries,
        abortSignal: opts.signal,
      });
      if (text.trim()) {
        full = text;
        onChunk(text);
        console.info("[ai/chat] non-stream fallback from", provider);
      }
    } catch (genErr) {
      console.warn("[ai/chat] generate fallback failed", provider, flattenAiErrorMessage(genErr));
      if (!full) throw genErr;
    }
  }
  if (!full.trim()) return null;
  if (isLikelyTruncatedReply(full)) {
    console.warn("[ai/chat] reply may be cut short from", provider);
  }
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
        maxRetries: i === chain.length - 1 ? CHAT_MAX_RETRIES : 0,
        signal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
        firstTokenMs: i === 0 ? FIRST_PROVIDER_FIRST_TOKEN_MS : FALLBACK_FIRST_TOKEN_MS,
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
    try {
      const out = await streamOne(model, provider, params, (chunk) => {
        if (!claim(provider)) return;
        onChunk(chunk);
      }, {
        maxRetries: 0,
        signal: AbortSignal.any([controllers[idx]!.signal, AbortSignal.timeout(CHAT_TIMEOUT_MS)]),
        firstTokenMs: idx === 0 ? FIRST_PROVIDER_FIRST_TOKEN_MS : FALLBACK_FIRST_TOKEN_MS,
      });
      if (out && winner === provider) full = out.full;
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
