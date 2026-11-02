import { beforeEach, describe, expect, it, vi } from "vitest";

const generateText = vi.fn();
vi.mock("ai", () => ({ generateText: (...a: unknown[]) => generateText(...a) }));
vi.mock("@/lib/ai/provider", () => ({ getChatModelForProvider: (p: string) => ({ provider: p }) }));
vi.mock("@/lib/ai/config", () => ({
  getKaiaChatProviderOrder: () => ["groq", "google"],
  getAuxiliaryLanguageProviderOrder: () => ["google", "groq", "openai"],
}));

const { cleanDraft, generateDraft, writeProviderOrder } = await import("@/lib/ai/write");
const args = { kind: "profile_bio", system: "s", prompt: "p" };

beforeEach(() => {
  generateText.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("writeProviderOrder", () => {
  it("tries Kaia's working providers first, without repeats", () => {
    expect(writeProviderOrder()).toEqual(["groq", "google", "openai"]);
  });
});

describe("cleanDraft", () => {
  it("strips reasoning blocks and wrapping quotes", () => {
    expect(cleanDraft('<think>hmm</think>\n"Hello Delhi"')).toBe("Hello Delhi");
  });
  it("trims to the limit at a sentence end", () => {
    const t = "First sentence here. " + "word ".repeat(60);
    expect(cleanDraft(t, 30)).toBe("First sentence here.");
  });
  it("returns empty for reasoning-only output", () => {
    expect(cleanDraft("<think>only thoughts</think>")).toBe("");
  });
});

describe("generateDraft", () => {
  it("falls through to the next provider when one errors", async () => {
    generateText.mockRejectedValueOnce(new Error("API key not valid")).mockResolvedValueOnce({ text: "Dog mom of Bruno" });
    const r = await generateDraft(args);
    expect(r).toEqual({ text: "Dog mom of Bruno", provider: "google" });
  });
  it("treats an empty reply as a failure and tries the next provider", async () => {
    generateText.mockResolvedValueOnce({ text: "" }).mockResolvedValueOnce({ text: "Hi!" });
    expect((await generateDraft(args)).provider).toBe("google");
  });
  it("throws when every provider fails", async () => {
    generateText.mockRejectedValue(new Error("down"));
    await expect(generateDraft(args)).rejects.toThrow("down");
    expect(generateText).toHaveBeenCalledTimes(3);
  });
});
