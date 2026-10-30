import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("ai config cost toggles", async () => {
  const mod = await import("@/lib/ai/config");

  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("treats missing AI keys as disabled", () => {
    vi.stubEnv("AI_PROVIDER", "google");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    expect(mod.isAiEnabled()).toBe(false);
  });

  it("enables google when only GEMINI_API_KEY is set", () => {
    vi.stubEnv("AI_PROVIDER", "");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "AIzaSyTestKeyForUnitTestsOnly");
    expect(mod.isAiEnabled()).toBe(true);
    expect(mod.getAiProviderName()).toBe("google");
  });

  it("accepts AI_PROVIDER=gemini", () => {
    vi.stubEnv("AI_PROVIDER", "gemini");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "AIzaSyTestKeyForUnitTestsOnly");
    expect(mod.getAiProviderName()).toBe("google");
  });

  it("accepts new AI Studio keys that start with AQ.", () => {
    vi.stubEnv("AI_PROVIDER", "google");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "AQ.TestKeyForUnitTestsOnlyNotARealGeminiKeyAtAll");
    expect(mod.isAiAssistantEnabled()).toBe(true);
    expect(mod.getAiConfigStatus().checks.googleKeyFormatOk).toBe(true);
  });

  it("respects AI_MODERATION_LLM=false", () => {
    vi.stubEnv("AI_PROVIDER", "google");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "AIzaSyTestKeyForUnitTestsOnly");
    vi.stubEnv("AI_MODERATION_LLM", "false");
    expect(mod.isAiModerationLlmEnabled()).toBe(false);
    expect(mod.isAiAssistantEnabled()).toBe(true);
  });

  it("prefers groq in chat order when GROQ_API_KEY is set", () => {
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "AIzaSyTestKeyForUnitTestsOnly");
    vi.stubEnv("GROQ_API_KEY", "gsk_test");
    expect(mod.getKaiaChatProviderOrder()[0]).toBe("groq");
    expect(mod.getKaiaChatProviderOrder()).toContain("google");
  });

  it("accepts AI_PROVIDER=groq when only groq key is set", () => {
    vi.stubEnv("AI_PROVIDER", "groq");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
    vi.stubEnv("GROQ_API_KEY", "gsk_test");
    expect(mod.getAiProviderName()).toBe("groq");
    expect(mod.isAiEnabled()).toBe(true);
  });

  it("clamps AI_DAILY_LIMIT", () => {
    vi.stubEnv("AI_DAILY_LIMIT", "99");
    expect(mod.getAiDailyLimit()).toBe(30);
    vi.stubEnv("AI_DAILY_LIMIT", "12");
    expect(mod.getAiDailyLimit()).toBe(12);
  });
});

describe("chat model defaults", async () => {
  const { getGroqChatModelId, getCerebrasChatModelId, RETIRED_CHAT_MODEL_IDS } = await import("@/lib/ai/provider");

  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not default to retired Groq or Cerebras model IDs", () => {
    vi.stubEnv("GROQ_MODEL", "");
    vi.stubEnv("CEREBRAS_MODEL", "");
    expect(RETIRED_CHAT_MODEL_IDS).not.toContain(getGroqChatModelId());
    expect(RETIRED_CHAT_MODEL_IDS).not.toContain(getCerebrasChatModelId());
  });

  it("remaps retired GROQ_MODEL env to a live model", () => {
    vi.stubEnv("GROQ_MODEL", "llama-3.3-70b-versatile");
    expect(getGroqChatModelId()).toBe("qwen/qwen3.8-27b");
  });
});
