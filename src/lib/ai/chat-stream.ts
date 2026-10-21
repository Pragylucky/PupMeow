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

async function streamSequential(
  chain: ReturnType<typeof buildChatModelChain>,
  params: ChatStreamParams,
  onChunk: (chunk: string) => void,
): Promise<{ full: string; provider: AiProviderName }> {
  let lastErr: unknown;
  for (let i = 0; i < chain.length; i++) {
    const { model, provider } = chain[i]!;
    let full = "";
    try {
      const result = streamText({
        model,
        system: params.system,
        messages: params.messages,
        maxOutputTokens: params.maxOutputTokens ?? 550,
        temperature: params.temperature ?? 0.5,
        maxRetries: CHAT_MAX_RETRIES,
        abortSignal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
      });
      for await (const chunk of result.textStream) {
        full += chunk;
        onChunk(chunk);
      }
      if (full.trim()) return { full, provider };
      lastErr = new Error("Empty response from model");
    } catch (err) {
      lastErr = err;
      if (full.trim()) return { full, provider };
      if (i < chain.length - 1) {
        console.warn("[ai/chat] trying fallback after", provider, flattenAiErrorMessage(err));
      }
    }
  }
  throw lastErr ?? new Error("Kaia couldn't get a reply");
}

/**
 * Start all providers at once; the first to stream text wins. Losers are aborted so
 * the user never sees two answers mixed together (only one winner emits chunks).
 */
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
      if (winner === provider && local.trim()) return;
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

  if (!winner && chain.length > 0) {
    return streamSequential(chain, params, onChunk);
  }

  throw errors[0] ?? new Error("Kaia couldn't get a reply");
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
