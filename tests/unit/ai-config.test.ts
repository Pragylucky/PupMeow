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
    expect(mod.isAiEnabled()).toBe(false);
  });

  it("respects AI_MODERATION_LLM=false", () => {
    vi.stubEnv("AI_PROVIDER", "google");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "test-key");
    vi.stubEnv("AI_MODERATION_LLM", "false");
    expect(mod.isAiModerationLlmEnabled()).toBe(false);
    expect(mod.isAiAssistantEnabled()).toBe(true);
  });

  it("clamps AI_DAILY_LIMIT", () => {
    vi.stubEnv("AI_DAILY_LIMIT", "99");
    expect(mod.getAiDailyLimit()).toBe(30);
    vi.stubEnv("AI_DAILY_LIMIT", "12");
    expect(mod.getAiDailyLimit()).toBe(12);
  });
});
