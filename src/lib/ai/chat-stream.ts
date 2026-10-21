import "server-only";
import { streamText } from "ai";
import type { AiProviderName } from "./config";
import { buildChatModelChain } from "./chat-fallback";
import { flattenAiErrorMessage } from "./errors";

const CHAT_MAX_RETRIES = 1;
const CHAT_TIMEOUT_MS = 28_000;

export type ChatStreamParams = {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxOutputTokens?: number;
  temperature?: number;
};

/** Stream Kaia reply; tries Gemini then Grok/OpenAI fallbacks when configured. */
export async function streamChatToWriter(
  params: ChatStreamParams,
  onChunk: (chunk: string) => void,
): Promise<{ full: string; provider: AiProviderName }> {
  const chain = buildChatModelChain();

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
