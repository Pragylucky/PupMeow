/** Safe to import anywhere: reads env only on the server, returns false in the browser. */
export type AiProviderName = "google" | "openai";

function envFlag(name: string, defaultOn = true): boolean {
  const v = (process.env[name] ?? "").trim().toLowerCase();
  if (!v) return defaultOn;
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function trimEnv(name: string): string {
  return (process.env[name] ?? "").trim();
}

/** @ai-sdk/google reads GOOGLE_GENERATIVE_AI_API_KEY — accept common Vercel / copy-paste names. */
export function resolveGoogleGenerativeAiKey(): string | undefined {
  const names = ["GOOGLE_GENERATIVE_AI_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY"] as const;
  for (const name of names) {
    const value = trimEnv(name);
    if (value) {
      if (!trimEnv("GOOGLE_GENERATIVE_AI_API_KEY")) {
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = value;
      }
      return value;
    }
  }
  return undefined;
}

function normalizeProviderName(raw: string): string {
  const p = raw.trim().toLowerCase();
  if (p === "gemini" || p === "google-gemini" || p === "google_gemini") return "google";
  return p;
}

export function getAiProviderName(): AiProviderName | null {
  const googleKey = resolveGoogleGenerativeAiKey();
  const configured = normalizeProviderName(process.env.AI_PROVIDER ?? "");
  const useGoogle = configured === "google" || (!configured && Boolean(googleKey));

  if (useGoogle && googleKey) return "google";
  if (configured === "openai" && trimEnv("OPENAI_API_KEY")) return "openai";
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

/** For ops / Vercel debugging — never includes secrets. */
export function getAiConfigStatus() {
  const googleKey = resolveGoogleGenerativeAiKey();
  const openaiKey = trimEnv("OPENAI_API_KEY");
  const providerRaw = trimEnv("AI_PROVIDER");
  const provider = getAiProviderName();
  return {
    assistant: isAiAssistantEnabled(),
    provider,
    checks: {
      aiEnabledFlag: envFlag("AI_ENABLED", true),
      providerEnv: providerRaw || (googleKey ? "(auto: gemini key present)" : ""),
      googleKey: Boolean(googleKey),
      openaiKey: Boolean(openaiKey),
    },
  };
}
