/** Safe to import anywhere: reads env only on the server, returns false in the browser. */
export type AiProviderName = "google" | "openai";

function envFlag(name: string, defaultOn = true): boolean {
  const v = (process.env[name] ?? "").trim().toLowerCase();
  if (!v) return defaultOn;
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function getAiProviderName(): AiProviderName | null {
  const p = (process.env.AI_PROVIDER ?? "").trim().toLowerCase();
  if (p === "google" && process.env.GOOGLE_GENERATIVE_AI_API_KEY) return "google";
  if (p === "openai" && process.env.OPENAI_API_KEY) return "openai";
  return null;
}

export function isAiEnabled(): boolean {
  return getAiProviderName() !== null;
}

/** Kaia chat / vision / write / health — set AI_ENABLED=false to hide without removing keys. */
export function isAiAssistantEnabled(): boolean {
  return isAiEnabled() && envFlag("AI_ENABLED", true);
}

/** LLM moderation on posts/comments (heuristics always run). Off saves an API call per write. */
export function isAiModerationLlmEnabled(): boolean {
  return isAiEnabled() && envFlag("AI_MODERATION_LLM", true);
}

/** Lost & found vision + embeddings (expensive). Heuristic moderation still applies. */
export function isAiLostMatchingEnabled(): boolean {
  return isAiEnabled() && envFlag("AI_LOST_MATCHING", true);
}

/** Per-user daily Kaia budget (server). DB function must allow the same cap. */
export function getAiDailyLimit(): number {
  const n = Number.parseInt(process.env.AI_DAILY_LIMIT ?? "30", 10);
  if (!Number.isFinite(n) || n < 1) return 30;
  return Math.min(n, 30);
}
