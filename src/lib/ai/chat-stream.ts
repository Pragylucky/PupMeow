import "server-only";
import { streamText } from "ai";
import { getAiProviderName, isOpenAiChatFallbackEnabled } from "./config";
import { flattenAiErrorMessage } from "./errors";
import { getLanguageModel, getOpenAiChatModel } from "./provider";

const CHAT_MAX_RETRIES = 1;
const CHAT_TIMEOUT_MS = 28_000;

export type ChatStreamParams = {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxOutputTokens?: number;
  temperature?: number;
};

/** Stream Kaia reply; optional OpenAI fallback when Gemini is slow or down. */
export async function streamChatToWriter(
  params: ChatStreamParams,
  onChunk: (chunk: string) => void,
): Promise<{ full: string; provider: "google" | "openai" }> {
  const chain: { model: ReturnType<typeof getLanguageModel>; provider: "google" | "openai" }[] = [];
  const primary = getAiProviderName();
  if (!primary) throw new Error("AI is not configured");
  chain.push({ model: getLanguageModel(), provider: primary });

  const fallback = getOpenAiChatModel();
  if (fallback && primary === "google" && isOpenAiChatFallbackEnabled()) {
    chain.push({ model: fallback, provider: "openai" });
  }

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
