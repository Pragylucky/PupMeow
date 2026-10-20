import { describe, it, expect } from "vitest";
import { ageInMonths, birthdaySoon, formatAge, friendlyError, toWhatsAppNumber, whatsappLink } from "@/lib/utils";
import { safeNext } from "@/lib/redirect";
import { detectEmergency } from "@/lib/ai/emergency";
import { heuristicModeration } from "@/lib/ai/moderation";
import { isOwnDocumentPath } from "@/lib/storage-paths";

describe("age helpers", () => {
  const now = new Date("2026-10-11T12:00:00Z");
  it("computes months and labels", () => {
    expect(ageInMonths("2025-04-11", now)).toBe(18);
    expect(formatAge("2026-07-01", now)).toBe("3 months");
    expect(formatAge("2023-10-01", now)).toBe("3 years");
  });
  it("detects upcoming birthdays", () => {
    expect(birthdaySoon("2020-10-20", 14, now)).toBe(true);
    expect(birthdaySoon("2020-12-20", 14, now)).toBe(false);
  });
});

describe("whatsapp", () => {
  it("normalises numbers and builds wa.me links", () => {
    expect(toWhatsAppNumber("98765 43210")).toBe("919876543210");
    expect(whatsappLink("9876543210", "Hi there")).toBe("https://wa.me/919876543210?text=Hi%20there");
  });
});

describe("safeNext (open-redirect guard)", () => {
  it("only allows same-site paths", () => {
    expect(safeNext("/lost/abc")).toBe("/lost/abc");
    expect(safeNext("https://evil.com")).toBe("/home");
    expect(safeNext("//evil.com")).toBe("/home");
    expect(safeNext("/\\evil.com")).toBe("/home");
  });
});

describe("emergency detection", () => {
  it("flags urgent symptoms", () => {
    expect(detectEmergency("my dog ate rat poison")).toBe(true);
    expect(detectEmergency("cat is having a seizure")).toBe(true);
    expect(detectEmergency("he can't breathe properly")).toBe(true);
    expect(detectEmergency("what food is best for puppies")).toBe(false);
  });
});

describe("heuristic moderation", () => {
  it("blocks sales in listings, flags in posts, blocks abuse", () => {
    expect(heuristicModeration("Lab puppies for sale ₹15000", "listing").verdict).toBe("block");
    expect(heuristicModeration("Lab puppies for sale ₹15000", "post").verdict).toBe("flag");
    expect(heuristicModeration("poison the dogs in our society", "comment").verdict).toBe("block");
    expect(heuristicModeration("Bruno loves monsoon walks", "post").verdict).toBe("allow");
  });
});

describe("friendlyError", () => {
  it("surfaces rate limit messages", () => {
    expect(friendlyError({ message: "RATE_LIMIT: You can add up to 10 posts per hour." })).toBe("You can add up to 10 posts per hour.");
    expect(friendlyError({ message: "new row violates row-level security policy", code: "42501" })).toMatch(/permission/);
  });
});

describe("storage path guard", () => {
  it("accepts only the user's own folder", () => {
    const uid = "11111111-1111-4111-8111-111111111111";
    expect(isOwnDocumentPath(`${uid}/cert.pdf`, uid)).toBe(true);
    expect(isOwnDocumentPath(`22222222-2222-4222-8222-222222222222/cert.pdf`, uid)).toBe(false);
    expect(isOwnDocumentPath(`${uid}/../x.pdf`, uid)).toBe(false);
  });
});
