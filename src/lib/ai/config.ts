/** Safe to import anywhere: reads env only on the server, returns false in the browser. */
export type AiProviderName = "google" | "openai";

export function getAiProviderName(): AiProviderName | null {
  const p = (process.env.AI_PROVIDER ?? "").trim().toLowerCase();
  if (p === "google" && process.env.GOOGLE_GENERATIVE_AI_API_KEY) return "google";
  if (p === "openai" && process.env.OPENAI_API_KEY) return "openai";
  return null;
}

export function isAiEnabled(): boolean {
  return getAiProviderName() !== null;
}
