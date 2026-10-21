import { describe, expect, it } from "vitest";
import { KAIA_REPLY_TIMEOUT, KAIA_UNABLE_TO_REPLY, userFacingKaiaChatError } from "@/lib/ai/kaia-messages";

describe("userFacingKaiaChatError", () => {
  it("uses cute default for unknown errors", () => {
    expect(userFacingKaiaChatError(new Error("AI_503: upstream"))).toBe(KAIA_UNABLE_TO_REPLY);
  });

  it("keeps daily limit wording", () => {
    expect(userFacingKaiaChatError(new Error("RATE_LIMIT: Daily Kaia limit reached."))).toMatch(/midnight/);
  });

  it("maps abort to timeout copy", () => {
    expect(userFacingKaiaChatError(new Error("The operation was aborted"))).toBe(KAIA_REPLY_TIMEOUT);
  });
});
