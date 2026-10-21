import "server-only";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { xai } from "@ai-sdk/xai";
import type { AiProviderName } from "./config";
import { getAiProviderName, getEmbeddingProviderName, hasOpenAiKey, hasXaiKey } from "./config";

export const EMBEDDING_DIMENSIONS = 768;

/** Default matches Google AI Studio for new API keys (2.x Flash is blocked for new users). */
export function getGoogleChatModelId(): string {
  const fromEnv = (process.env.AI_MODEL ?? process.env.GOOGLE_GENERATIVE_AI_MODEL ?? "").trim();
  return fromEnv || "gemini-3.8-flash";
}

function googleChatModelId() {
  return getGoogleChatModelId();
}

function openAiChatModelId() {
  return (process.env.OPENAI_MODEL ?? process.env.AI_OPENAI_MODEL ?? "").trim() || "gpt-4o-mini";
}

export function getXaiChatModelId(): string {
  return (process.env.XAI_MODEL ?? process.env.GROK_MODEL ?? process.env.AI_XAI_MODEL ?? "").trim() || "grok-4-fast";
}

export function getOpenAiChatModel() {
  if (!hasOpenAiKey()) return null;
  return openai(openAiChatModelId());
}

export function getXaiChatModel() {
  if (!hasXaiKey()) return null;
  return xai(getXaiChatModelId());
}

export function getActiveChatModelId(): string {
  const provider = getAiProviderName();
  if (provider === "google") return getGoogleChatModelId();
  if (provider === "openai") return openAiChatModelId();
  if (provider === "xai") return getXaiChatModelId();
  return "unknown";
}

export function getChatModelForProvider(provider: AiProviderName) {
  if (provider === "google") return google(googleChatModelId());
  if (provider === "openai") return openai(openAiChatModelId());
  if (provider === "xai") return xai(getXaiChatModelId());
  throw new Error("AI is not configured");
}

/** Chat / vision / structured-output model for the configured provider. */
export function getLanguageModel() {
  const provider = getAiProviderName();
  if (!provider) throw new Error("AI is not configured");
  return getChatModelForProvider(provider);
}

export function getEmbeddingModel() {
  const provider = getEmbeddingProviderName();
  if (provider === "google") return google.embeddingModel("gemini-embedding-001");
  if (provider === "openai") return openai.embeddingModel("text-embedding-3-small");
  throw new Error("AI embeddings not configured (keep a Gemini or OpenAI key for lost-pet matching, or set AI_EMBEDDING_PROVIDER)");
}

export const embeddingProviderOptions = {
  google: { outputDimensionality: EMBEDDING_DIMENSIONS, taskType: "SEMANTIC_SIMILARITY" as const },
  openai: { dimensions: EMBEDDING_DIMENSIONS },
};
