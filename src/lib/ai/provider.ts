import "server-only";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { getAiProviderName } from "./config";

export const EMBEDDING_DIMENSIONS = 768;

function googleChatModelId() {
  const fromEnv = (process.env.AI_MODEL ?? process.env.GOOGLE_GENERATIVE_AI_MODEL ?? "").trim();
  return fromEnv || "gemini-3.8-flash";
}

/** Chat / vision / structured-output model for the configured provider. */
export function getLanguageModel() {
  const provider = getAiProviderName();
  if (provider === "google") return google(googleChatModelId());
  if (provider === "openai") return openai("gpt-4o-mini");
  throw new Error("AI is not configured");
}

export function getEmbeddingModel() {
  const provider = getAiProviderName();
  if (provider === "google") return google.embeddingModel("gemini-embedding-001");
  if (provider === "openai") return openai.embeddingModel("text-embedding-3-small");
  throw new Error("AI is not configured");
}

export const embeddingProviderOptions = {
  google: { outputDimensionality: EMBEDDING_DIMENSIONS, taskType: "SEMANTIC_SIMILARITY" as const },
  openai: { dimensions: EMBEDDING_DIMENSIONS },
};
