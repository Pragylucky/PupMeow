/** Safe to import anywhere: reads env only on the server, returns false in the browser. */
export type AiProviderName = "google" | "openai" | "xai" | "groq" | "cerebras";

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
  if (p === "cerebras") return "cerebras";
  return p;
}

function isAiProviderName(name: string): name is AiProviderName {
  return name === "google" || name === "openai" || name === "xai" || name === "groq" || name === "cerebras";
}

export function hasGroqKey(): boolean {
  return Boolean(trimEnv("GROQ_API_KEY"));
}

export function hasCerebrasKey(): boolean {
  return Boolean(trimEnv("CEREBRAS_API_KEY"));
}

export function hasXaiKey(): boolean {
  return Boolean(trimEnv("XAI_API_KEY"));
}

export function hasOpenAiKey(): boolean {
  return Boolean(trimEnv("OPENAI_API_KEY"));
}

export function hasProviderKey(provider: AiProviderName): boolean {
  if (provider === "google") {
    const k = resolveGoogleGenerativeAiKey();
    return Boolean(k && isValidGoogleGenerativeAiKey(k));
  }
  if (provider === "openai") return hasOpenAiKey();
  if (provider === "xai") return hasXaiKey();
  if (provider === "groq") return hasGroqKey();
  if (provider === "cerebras") return hasCerebrasKey();
  return false;
}

/** Default Kaia chat order: Groq → Cerebras (optional) → Gemini → others. Override with AI_CHAT_TRY_ORDER. */
const DEFAULT_CHAT_TRY_ORDER: AiProviderName[] = ["groq", "cerebras", "google", "openai", "xai"];

/** Providers to try for Kaia chat, in order, until one responds. */
export function getKaiaChatProviderOrder(): AiProviderName[] {
  const custom = trimEnv("AI_CHAT_TRY_ORDER");
  const list = custom
    ? custom.split(/[,|]+/).map((p) => normalizeProviderName(p.trim())).filter(isAiProviderName)
    : DEFAULT_CHAT_TRY_ORDER;

  // Kaia chat order is AI_CHAT_TRY_ORDER (default groq → google). AI_PROVIDER does not reorder chat.

  const seen = new Set<AiProviderName>();
  return list.filter((p) => {
    if (!hasProviderKey(p) || seen.has(p)) return false;
    seen.add(p);
    return true;
  });
}

/** Extra chat providers to try after the primary fails (legacy; chat uses getKaiaChatProviderOrder). */
export function getChatFallbackProviders(primary: AiProviderName): AiProviderName[] {
  return getKaiaChatProviderOrder().filter((p) => p !== primary);
}

export function isOpenAiChatFallbackEnabled(): boolean {
  return getKaiaChatProviderOrder().includes("openai");
}

export function isGroqChatFallbackEnabled(): boolean {
  return getKaiaChatProviderOrder().includes("groq");
}

export function isXaiChatFallbackEnabled(): boolean {
  return getKaiaChatProviderOrder().includes("xai");
}

/** Primary provider label for ops (first in Kaia try order, or AI_PROVIDER). */
export function getAiProviderName(): AiProviderName | null {
  const order = getKaiaChatProviderOrder();
  return order[0] ?? null;
}

export function isAiEnabled(): boolean {
  return getKaiaChatProviderOrder().length > 0;
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

/** Vision / moderation / structured output — prefer Gemini when available. */
export function getAuxiliaryLanguageProviderOrder(): AiProviderName[] {
  const order: AiProviderName[] = ["google", "groq", "openai", "xai"];
  const seen = new Set<AiProviderName>();
  return order.filter((p) => {
    if (!hasProviderKey(p) || seen.has(p)) return false;
    seen.add(p);
    return true;
  });
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

/** Parallel race (off by default — can truncate streams). Set AI_CHAT_RACE=true to enable. */
export function isChatRaceEnabled(providerCount: number): boolean {
  if (providerCount < 2) return false;
  const v = trimEnv("AI_CHAT_RACE").toLowerCase();
  return v === "true" || v === "1" || v === "on" || v === "yes";
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
  const chatTryOrder = getKaiaChatProviderOrder();
  const googleKeyFormatOk = Boolean(googleKey && isValidGoogleGenerativeAiKey(googleKey));
  return {
    assistant: isAiAssistantEnabled(),
    provider,
    chatTryOrder,
    chatRace: isChatRaceEnabled(chatTryOrder.length),
    hint: googleKey && !googleKeyFormatOk ? geminiKeyFormatHint() : undefined,
    checks: {
      aiEnabledFlag: envFlag("AI_ENABLED", true),
      providerEnv: providerRaw || (chatTryOrder.length ? `(chat order: ${chatTryOrder.join(" → ")})` : ""),
      googleKey: Boolean(googleKey),
      googleKeyFormatOk,
      groqKey: hasGroqKey(),
      cerebrasKey: hasCerebrasKey(),
      openaiKey: Boolean(openaiKey),
      xaiKey: hasXaiKey(),
      groqInChatOrder: isGroqChatFallbackEnabled(),
      openAiChatFallback: isOpenAiChatFallbackEnabled(),
      xaiChatFallback: isXaiChatFallbackEnabled(),
      envVarsPresent: {
        GOOGLE_GENERATIVE_AI_API_KEY: Boolean(normalizeApiKey(trimEnv("GOOGLE_GENERATIVE_AI_API_KEY"))),
        GEMINI_API_KEY: Boolean(normalizeApiKey(trimEnv("GEMINI_API_KEY"))),
        GOOGLE_API_KEY: Boolean(normalizeApiKey(trimEnv("GOOGLE_API_KEY"))),
        GROQ_API_KEY: hasGroqKey(),
        CEREBRAS_API_KEY: hasCerebrasKey(),
        XAI_API_KEY: hasXaiKey(),
      },
    },
  };
}
