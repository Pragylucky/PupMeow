import { z } from "zod";
import {
  areaSchema, booleanish, contactMethodSchema, genderSchema, imageUrlSchema, indianPhoneSchema, optionalText, speciesSchema,
} from "./common";

/** Mentions of money for an animal — paid sales are not allowed. */
/** Word-boundary safe — avoids matching "years 2" as "rs 2". */
export const SALE_PATTERN =
  /(₹\s?\d|\brs\.?\s*\d|\binr\b|\d+\s?(?:k|000)\s?(?:rs|rupees)|\bprice\b|\bfor\s+sale\b|\bselling\b|\bsell\b|\brehoming fee\b|\bstud fee\b|\bpaid adoption\b|price\s*\d)/i;

export const lostFoundSchema = z.object({
  type: z.enum(["lost", "found"]),
  pet_name: optionalText(40),
  species: speciesSchema,
  breed: optionalText(60),
  color: optionalText(60),
  gender: genderSchema.default("unknown"),
  description: z.string().trim().min(10, { error: "Describe the pet in at least 10 characters" }).max(1500),
  photo_urls: z.array(imageUrlSchema).min(1, { error: "Add at least one photo" }).max(6),
  last_seen_area: areaSchema,
  landmark: optionalText(120),
  last_seen_date: z
    .string()
    .min(1, { error: "When was the pet last seen?" })
    .refine((v) => !Number.isNaN(new Date(v).getTime()), { error: "Pick a valid date and time" })
    .refine((v) => new Date(v).getTime() <= Date.now() + 86_400_000, { error: "That date is in the future" }),
  reward_text: optionalText(80),
  contact_method: contactMethodSchema.default("whatsapp"),
  contact_value: indianPhoneSchema,
});

export const adoptionSchema = z
  .object({
    pet_name: z.string().trim().min(1, { error: "Name is required" }).max(40),
    species: speciesSchema,
    breed: optionalText(60),
    age_text: z.string().trim().min(1, { error: "Approximate age is required" }).max(30),
    age_months: z
      .union([z.literal(""), z.coerce.number().int().min(0).max(360)])
      .optional()
      .transform((v) => (v === "" || v === undefined ? null : v)),
    gender: genderSchema.default("unknown"),
    vaccinated: booleanish,
    neutered: booleanish,
    description: z.string().trim().min(20, { error: "Tell adopters a bit more (20+ characters)" }).max(2000),
    photo_urls: z.array(imageUrlSchema).min(1, { error: "Add at least one photo" }).max(6),
    area: areaSchema,
    is_ngo: booleanish,
    org_name: optionalText(80),
    contact_method: contactMethodSchema.default("whatsapp"),
    contact_value: indianPhoneSchema,
    no_sale_ack: booleanish.refine((v) => v, { error: "Please confirm this is a free adoption" }),
  })
  .refine((v) => !v.is_ngo || !!v.org_name, { error: "Add the NGO or shelter name", path: ["org_name"] })
  .refine((v) => !SALE_PATTERN.test(`${v.description} ${v.age_text}`), {
    error: "Listings can't mention a price or fee. Pupmeow is for free adoption only.",
    path: ["description"],
  });

export const matchProfileSchema = z.object({
  pet_id: z.uuid({ error: "Choose a pet" }),
  looking_for: z.enum(["playdate", "breeding", "both"]),
  has_papers: booleanish,
  health_confirmed: booleanish.refine((v) => v, { error: "Please confirm your pet is vaccinated and healthy" }),
  about: z.string().trim().min(10, { error: "Write at least 10 characters" }).max(500),
  photo_urls: z.array(imageUrlSchema).min(1, { error: "Add at least one photo" }).max(6),
  area: areaSchema,
  health_doc_path: z.string().trim().max(300).optional().transform((v) => v || null),
}).refine((v) => !SALE_PATTERN.test(v.about), {
  error: "No prices or stud fees. Pupmeow does not allow payments for matches.",
  path: ["about"],
});

export const matchRequestSchema = z.object({
  from_pet_id: z.uuid({ error: "Choose your pet" }),
  to_pet_id: z.uuid(),
  purpose: z.enum(["playdate", "breeding"]),
  message: z.string().trim().max(300).optional().transform((v) => v || null),
}).refine((v) => !v.message || !SALE_PATTERN.test(v.message), {
  error: "No prices or stud fees, please.",
  path: ["message"],
});

export const reportSchema = z.object({
  target_type: z.enum(["post", "comment", "profile", "lost_found", "adoption", "match_profile"]),
  target_id: z.uuid(),
  reason: z.enum(["spam", "abuse", "animal_cruelty", "scam_selling", "fake_listing", "other"], { error: "Pick a reason" }),
  details: optionalText(500),
});
