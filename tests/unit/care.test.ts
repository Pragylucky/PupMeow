import { describe, expect, it } from "vitest";
import { addDaysIso, addMonthsIso, dueFromPreset, DUE_PRESETS, repeatMonthsFor, suggestedPreset } from "@/lib/care";

describe("addMonthsIso", () => {
  it("adds months", () => {
    expect(addMonthsIso("2026-11-02", 12)).toBe("2027-11-02");
    expect(addMonthsIso("2026-11-02", 3)).toBe("2027-02-02");
  });
  it("clamps to the end of a shorter month", () => {
    expect(addMonthsIso("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsIso("2027-08-31", 6)).toBe("2028-02-29");
  });
});

describe("addDaysIso", () => {
  it("crosses month and year ends", () => {
    expect(addDaysIso("2026-12-20", 21)).toBe("2027-01-10");
  });
});

describe("due presets", () => {
  it("computes each preset from the record date", () => {
    const from = "2026-11-02";
    expect(DUE_PRESETS.map((p) => dueFromPreset(from, p))).toEqual(["2026-11-23", "2026-12-02", "2027-02-02", "2027-05-02", "2027-11-02"]);
  });
});

describe("repeat intervals", () => {
  it("knows common treatments", () => {
    expect(repeatMonthsFor("Anti-Rabies", "vaccination")).toBe(12);
    expect(repeatMonthsFor("Deworming tablet", "medication")).toBe(3);
    expect(repeatMonthsFor("Tick & flea spot-on", "medication")).toBe(1);
    expect(repeatMonthsFor("Annual check-up", "vet_visit")).toBeNull();
    expect(repeatMonthsFor("Weight check", "weight")).toBeNull();
    expect(repeatMonthsFor("Antibiotics", "medication")).toBeNull();
  });
  it("suggests the matching preset", () => {
    expect(suggestedPreset("Rabies", "vaccination")?.label).toBe("1 year");
    expect(suggestedPreset("Deworming", "medication")?.label).toBe("3 months");
    expect(suggestedPreset("Antibiotics", "medication")).toBeNull();
  });
});
