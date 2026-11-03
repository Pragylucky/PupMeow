import { describe, expect, it } from "vitest";
import { inviteText, neighbourNudge } from "@/lib/invite";

describe("inviteText", () => {
  it("names the area, with a Delhi fallback", () => {
    expect(inviteText("Dwarka")).toMatch(/Dwarka's free pet community/);
    expect(inviteText("Delhi NCR")).toMatch(/Delhi's free pet community/);
  });
});

describe("neighbourNudge", () => {
  it("encourages the first member in an empty area", () => {
    expect(neighbourNudge("Dwarka", 0)?.title).toBe("Be the first in Dwarka");
    expect(neighbourNudge("Dwarka", 1)?.title).toBe("Be the first in Dwarka");
  });
  it("shows the count while an area is small", () => {
    expect(neighbourNudge("Dwarka", 9)?.title).toBe("9 neighbours in Dwarka");
  });
  it("goes away once an area is busy", () => {
    expect(neighbourNudge("Dwarka", 25)).toBeNull();
  });
});
