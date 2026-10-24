import { describe, expect, it } from "vitest";
import { loginErrorMessage } from "@/lib/login-errors";

describe("loginErrorMessage", () => {
  it("maps known codes", () => {
    expect(loginErrorMessage("auth_failed")).toContain("Google");
    expect(loginErrorMessage("oauth_denied")).toContain("cancelled");
  });

  it("never echoes arbitrary URL text", () => {
    expect(loginErrorMessage("You have been hacked")).toBe("Sign-in didn't work. Please try Continue with Google again.");
  });
});
