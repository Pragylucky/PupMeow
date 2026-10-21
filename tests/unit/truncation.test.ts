import { describe, expect, it } from "vitest";
import { isLikelyTruncatedReply } from "@/lib/ai/truncation";

describe("isLikelyTruncatedReply", () => {
  it("flags unclosed bold at end", () => {
    expect(isLikelyTruncatedReply("2. **Upload clear", "stop")).toBe(true);
  });

  it("allows complete numbered steps", () => {
    const ok = `1. Go to [Report](/lost/new).
2. **Upload clear photos** of your dog.
3. Add contact details and publish.`;
    expect(isLikelyTruncatedReply(ok, "stop")).toBe(false);
  });

  it("flags non-stop finish reasons", () => {
    expect(isLikelyTruncatedReply("Hello there.", "length")).toBe(true);
  });
});
