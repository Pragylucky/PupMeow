import "server-only";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { xai } from "@ai-sdk/xai";
import type { AiProviderName } from "./config";
import {
  getAiProviderName,
  getAuxiliaryLanguageProviderOrder,
  getEmbeddingProviderName,
  hasGroqKey,
  hasOpenAiKey,
  hasXaiKey,
} from "./config";

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

const RETIRED_GROQ_MODELS = new Set([
  "llama-3.3-70b-versatile",
  "llama3-70b-8192",
  "llama3-8b-8192",
  "mixtral-8x7b-32768",
]);

/** Groq retired llama-3.3-70b-versatile (404). Default: fast Qwen on current Groq catalog. */
export function getGroqChatModelId(): string {
  const fromEnv = (process.env.GROQ_MODEL ?? process.env.AI_GROQ_MODEL ?? "").trim();
  if (fromEnv) {
    if (RETIRED_GROQ_MODELS.has(fromEnv)) return "qwen/qwen3.8-27b";
    return fromEnv;
  }
  return "qwen/qwen3.8-27b";
}

export function getCerebrasChatModelId(): string {
  return (process.env.CEREBRAS_MODEL ?? "").trim() || "llama-3.3-70b";
}

let cerebrasProvider: ReturnType<typeof createOpenAI> | null = null;
function cerebras() {
  cerebrasProvider ??= createOpenAI({
    name: "cerebras",
    apiKey: (process.env.CEREBRAS_API_KEY ?? "").trim(),
    baseURL: (process.env.CEREBRAS_BASE_URL ?? "").trim() || "https://api.cerebras.ai/v1",
  });
  return cerebrasProvider;
}

export function getXaiChatModelId(): string {
  return (process.env.XAI_MODEL ?? process.env.GROK_MODEL ?? process.env.AI_XAI_MODEL ?? "").trim() || "grok-4-fast";
}

export function getOpenAiChatModel() {
  if (!hasOpenAiKey()) return null;
  return openai(openAiChatModelId());
}

export function getGroqChatModel() {
  if (!hasGroqKey()) return null;
  return groq(getGroqChatModelId());
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
  if (provider === "groq") return getGroqChatModelId();
  if (provider === "cerebras") return getCerebrasChatModelId();
  return "unknown";
}

export function getChatModelForProvider(provider: AiProviderName) {
  if (provider === "google") return google(googleChatModelId());
  if (provider === "openai") return openai(openAiChatModelId());
  if (provider === "xai") return xai(getXaiChatModelId());
  if (provider === "groq") return groq(getGroqChatModelId());
  if (provider === "cerebras") return cerebras().chat(getCerebrasChatModelId());
  throw new Error("AI is not configured");
}

/** Vision / moderation — prefers Gemini when configured. */
export function getLanguageModel() {
  const order = getAuxiliaryLanguageProviderOrder();
  const provider = order[0];
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
