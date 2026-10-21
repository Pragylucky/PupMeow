/** Safe to import anywhere: reads env only on the server, returns false in the browser. */
export type AiProviderName = "google" | "openai" | "xai";

function envFlag(name: string, defaultOn = true): boolean {
  const v = (process.env[name] ?? "").trim().toLowerCase();
  if (!v) return defaultOn;
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function trimEnv(name: string): string {
  return (process.env[name] ?? "").trim();
}

function normalizeApiKey(raw: string): string {
  const t = raw.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1).trim();
  }
  return t;
}

/** @ai-sdk/google reads GOOGLE_GENERATIVE_AI_API_KEY — accept common Vercel / copy-paste names. */
export function resolveGoogleGenerativeAiKey(): string | undefined {
  const names = ["GOOGLE_GENERATIVE_AI_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY"] as const;
  const found: string[] = [];
  for (const name of names) {
    const value = normalizeApiKey(trimEnv(name));
    if (value) found.push(value);
  }
  if (!found.length) return undefined;
  const preferred = found.find((k) => isValidGoogleGenerativeAiKey(k)) ?? found[0];
  if (!normalizeApiKey(trimEnv("GOOGLE_GENERATIVE_AI_API_KEY"))) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = preferred;
  }
  return preferred;
}

/** Google AI Studio keys: classic `AIza…` or newer `AQ.…` (both from aistudio.google.com). */
export function isValidGoogleGenerativeAiKey(key: string): boolean {
  const k = key.trim();
  if (k.startsWith("AIza") && k.length >= 20) return true;
  if (k.startsWith("AQ.") && k.length >= 30) return true;
  return false;
}

export function normalizeProviderName(raw: string): string {
  const p = raw.trim().toLowerCase();
  if (p === "gemini" || p === "google-gemini" || p === "google_gemini") return "google";
  if (p === "grok" || p === "xai-grok") return "xai";
  return p;
}

export function hasXaiKey(): boolean {
  return Boolean(trimEnv("XAI_API_KEY"));
}

export function hasProviderKey(provider: AiProviderName): boolean {
  if (provider === "google") {
    const k = resolveGoogleGenerativeAiKey();
    return Boolean(k && isValidGoogleGenerativeAiKey(k));
  }
  if (provider === "openai") return hasOpenAiKey();
  if (provider === "xai") return hasXaiKey();
  return false;
}

const CHAT_FALLBACK_ORDER: AiProviderName[] = ["xai", "openai"];

/** Extra chat providers to try after the primary fails (see AI_CHAT_FALLBACK). */
export function getChatFallbackProviders(primary: AiProviderName): AiProviderName[] {
  const v = trimEnv("AI_CHAT_FALLBACK").toLowerCase();
  if (v === "false" || v === "0" || v === "off" || v === "no") return [];
  if (primary !== "google") return [];

  if (v === "true" || v === "1" || v === "on" || !v) {
    return CHAT_FALLBACK_ORDER.filter((p) => hasProviderKey(p));
  }

  const picked: AiProviderName[] = [];
  for (const part of v.split(/[,|]+/)) {
    const name = normalizeProviderName(part.trim());
    if (name === "google" || name === "openai" || name === "xai") {
      picked.push(name);
    }
  }
  return picked.filter((p) => p !== primary && hasProviderKey(p));
}

export function hasOpenAiKey(): boolean {
  return Boolean(trimEnv("OPENAI_API_KEY"));
}

/** When Google is primary, use OpenAI for Kaia chat if Gemini fails (needs OPENAI_API_KEY). */
export function isOpenAiChatFallbackEnabled(): boolean {
  const primary = getAiProviderName();
  return primary === "google" && getChatFallbackProviders(primary).includes("openai");
}

export function isXaiChatFallbackEnabled(): boolean {
  const primary = getAiProviderName();
  return primary === "google" && getChatFallbackProviders(primary).includes("xai");
}

export function getAiProviderName(): AiProviderName | null {
  const googleKey = resolveGoogleGenerativeAiKey();
  const googleOk = Boolean(googleKey && isValidGoogleGenerativeAiKey(googleKey));
  const configured = normalizeProviderName(process.env.AI_PROVIDER ?? "");

  if (configured === "xai" && hasXaiKey()) return "xai";
  if (configured === "openai" && hasOpenAiKey()) return "openai";
  if (configured === "google" && googleOk) return "google";

  if (!configured) {
    if (googleOk) return "google";
    if (hasXaiKey()) return "xai";
    if (hasOpenAiKey()) return "openai";
  }
  return null;
}

export function isAiEnabled(): boolean {
  const name = getAiProviderName();
  if (!name) return false;
  return hasProviderKey(name);
}

/** Embeddings for lost-pet matching — can differ from Kaia chat provider. */
export function getEmbeddingProviderName(): AiProviderName | null {
  const forced = normalizeProviderName(trimEnv("AI_EMBEDDING_PROVIDER"));
  if (forced === "google" || forced === "openai") {
    return hasProviderKey(forced) ? forced : null;
  }
  if (hasProviderKey("google")) return "google";
  if (hasProviderKey("openai")) return "openai";
  return null;
}

/** Kaia chat / vision / write / health — set AI_ENABLED=false to hide without removing keys. */
export function isAiAssistantEnabled(): boolean {
  return isAiEnabled() && envFlag("AI_ENABLED", true);
}

/** Nav, home tile, and FAB — always on unless AI_ENABLED=false (chat APIs still use isAiAssistantEnabled). */
export function isKaiaListedInApp(): boolean {
  return envFlag("AI_ENABLED", true);
}

/** LLM moderation on posts/comments (heuristics always run). Off saves an API call per write. */
export function isAiModerationLlmEnabled(): boolean {
  return isAiEnabled() && envFlag("AI_MODERATION_LLM", true);
}

/** Lost & found vision + embeddings (expensive). Heuristic moderation still applies. */
export function isAiLostMatchingEnabled(): boolean {
  return isAiEnabled() && envFlag("AI_LOST_MATCHING", true) && getEmbeddingProviderName() !== null;
}

/** Per-user daily Kaia budget (server). DB function must allow the same cap. */
export function getAiDailyLimit(): number {
  const n = Number.parseInt(process.env.AI_DAILY_LIMIT ?? "30", 10);
  if (!Number.isFinite(n) || n < 1) return 30;
  return Math.min(n, 30);
}

function geminiKeyFormatHint(): string {
  return "Add a Gemini API key from https://aistudio.google.com/apikey as GOOGLE_GENERATIVE_AI_API_KEY on Vercel (Production), set AI_PROVIDER=google, then Redeploy.";
}

/** For ops / Vercel debugging — never includes secrets. */
export function getAiConfigStatus() {
  const googleKey = resolveGoogleGenerativeAiKey();
  const openaiKey = trimEnv("OPENAI_API_KEY");
  const providerRaw = trimEnv("AI_PROVIDER");
  const provider = getAiProviderName();
  const googleKeyFormatOk = Boolean(googleKey && isValidGoogleGenerativeAiKey(googleKey));
  return {
    assistant: isAiAssistantEnabled(),
    provider,
    hint: googleKey && !googleKeyFormatOk ? geminiKeyFormatHint() : undefined,
    checks: {
      aiEnabledFlag: envFlag("AI_ENABLED", true),
      providerEnv: providerRaw || (googleKey ? "(auto: gemini key present)" : ""),
      googleKey: Boolean(googleKey),
      googleKeyFormatOk,
      openaiKey: Boolean(openaiKey),
      xaiKey: hasXaiKey(),
      openAiChatFallback: isOpenAiChatFallbackEnabled(),
      xaiChatFallback: isXaiChatFallbackEnabled(),
      envVarsPresent: {
        GOOGLE_GENERATIVE_AI_API_KEY: Boolean(normalizeApiKey(trimEnv("GOOGLE_GENERATIVE_AI_API_KEY"))),
        GEMINI_API_KEY: Boolean(normalizeApiKey(trimEnv("GEMINI_API_KEY"))),
        GOOGLE_API_KEY: Boolean(normalizeApiKey(trimEnv("GOOGLE_API_KEY"))),
        XAI_API_KEY: hasXaiKey(),
      },
    },
  };
}
