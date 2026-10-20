import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => { process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co"; });

const img = (bucket: string, user = "11111111-1111-4111-8111-111111111111") => `https://abc.supabase.co/storage/v1/object/public/${bucket}/${user}/a.webp`;

describe("indianPhoneSchema", async () => {
  const { indianPhoneSchema } = await import("@/lib/validations/common");
  it("accepts and normalises Indian mobiles", () => {
    expect(indianPhoneSchema.parse("+91 98765 43210")).toBe("9876543210");
    expect(indianPhoneSchema.parse("09876543210")).toBe("9876543210");
    expect(indianPhoneSchema.parse("9876543210")).toBe("9876543210");
  });
  it("rejects invalid numbers", () => {
    expect(indianPhoneSchema.safeParse("12345").success).toBe(false);
    expect(indianPhoneSchema.safeParse("5876543210").success).toBe(false);
  });
});

describe("usernameSchema", async () => {
  const { usernameSchema } = await import("@/lib/validations/profile");
  it("lowercases and validates", () => {
    expect(usernameSchema.parse("Asha_99")).toBe("asha_99");
    expect(usernameSchema.safeParse("ab").success).toBe(false);
    expect(usernameSchema.safeParse("has space").success).toBe(false);
  });
});

describe("createPostSchema", async () => {
  const { createPostSchema } = await import("@/lib/validations/post");
  it("needs a caption or a photo", () => {
    expect(createPostSchema.safeParse({ caption: "", image_urls: [] }).success).toBe(false);
    expect(createPostSchema.safeParse({ caption: "Hi #dogs" }).success).toBe(true);
  });
  it("only accepts our own storage URLs, max 6", () => {
    expect(createPostSchema.safeParse({ caption: "x", image_urls: ["https://evil.com/a.jpg"] }).success).toBe(false);
    expect(createPostSchema.safeParse({ image_urls: Array(7).fill(img("posts")) }).success).toBe(false);
    expect(createPostSchema.safeParse({ image_urls: [img("posts")] }).success).toBe(true);
  });
  it("caps captions at 1000 chars", () => {
    expect(createPostSchema.safeParse({ caption: "a".repeat(1001) }).success).toBe(false);
  });
});

describe("adoptionSchema", async () => {
  const { adoptionSchema } = await import("@/lib/validations/listings");
  const base = {
    pet_name: "Rani", species: "dog", age_text: "4 months", description: "A playful puppy who loves belly rubs and walks.",
    photo_urls: [img("adoptions")], area: "Saket", contact_value: "9876543210", no_sale_ack: "on",
  };
  it("accepts a valid free adoption", () => { expect(adoptionSchema.safeParse(base).success).toBe(true); });
  it("blocks price / fee mentions", () => {
    expect(adoptionSchema.safeParse({ ...base, description: "Lovely pup, rehoming fee ₹5000 only, call now please" }).success).toBe(false);
    expect(adoptionSchema.safeParse({ ...base, description: "Pure breed puppy for sale, contact for price details" }).success).toBe(false);
  });
  it("requires the no-sale acknowledgement and NGO name", () => {
    expect(adoptionSchema.safeParse({ ...base, no_sale_ack: undefined }).success).toBe(false);
    expect(adoptionSchema.safeParse({ ...base, is_ngo: "on" }).success).toBe(false);
    expect(adoptionSchema.safeParse({ ...base, is_ngo: "on", org_name: "Paws Trust" }).success).toBe(true);
  });
});

describe("lostFoundSchema", async () => {
  const { lostFoundSchema } = await import("@/lib/validations/listings");
  const base = { type: "lost", species: "dog", description: "Brown indie with white chest", photo_urls: [img("lost-found")], last_seen_area: "Dwarka", last_seen_date: new Date().toISOString(), contact_value: "9876543210" };
  it("accepts valid reports and allows rewards", () => {
    expect(lostFoundSchema.safeParse({ ...base, reward_text: "₹5,000 reward" }).success).toBe(true);
  });
  it("rejects future dates and missing photos", () => {
    expect(lostFoundSchema.safeParse({ ...base, last_seen_date: new Date(Date.now() + 3 * 86_400_000).toISOString() }).success).toBe(false);
    expect(lostFoundSchema.safeParse({ ...base, photo_urls: [] }).success).toBe(false);
  });
});

describe("matchProfileSchema", async () => {
  const { matchProfileSchema } = await import("@/lib/validations/listings");
  const base = { pet_id: "11111111-1111-4111-8111-111111111111", looking_for: "breeding", about: "Healthy friendly lab", photo_urls: [img("matchmaking")], area: "Dwarka", health_confirmed: "on" };
  it("requires health confirmation and forbids stud fees", () => {
    expect(matchProfileSchema.safeParse(base).success).toBe(true);
    expect(matchProfileSchema.safeParse({ ...base, health_confirmed: undefined }).success).toBe(false);
    expect(matchProfileSchema.safeParse({ ...base, about: "Stud fee ₹10000, healthy dog" }).success).toBe(false);
  });
});

describe("healthRecordSchema", async () => {
  const { healthRecordSchema } = await import("@/lib/validations/pet");
  const base = { pet_id: "11111111-1111-4111-8111-111111111111", type: "vaccination", title: "Rabies", date: "2026-01-01" };
  it("validates due date order and weight", () => {
    expect(healthRecordSchema.safeParse({ ...base, next_due_date: "2027-01-01" }).success).toBe(true);
    expect(healthRecordSchema.safeParse({ ...base, next_due_date: "2025-01-01" }).success).toBe(false);
    expect(healthRecordSchema.safeParse({ ...base, type: "weight", weight_kg: "" }).success).toBe(false);
    expect(healthRecordSchema.safeParse({ ...base, type: "weight", weight_kg: "12.5" }).success).toBe(true);
  });
});
