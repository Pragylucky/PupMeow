import { z } from "zod";

export const chatRequestSchema = z.object({
  conversationId: z.uuid().nullable().optional(),
  petId: z.uuid().nullable().optional(),
  message: z.string().trim().min(1).max(2000, { error: "Keep messages under 2000 characters" }),
});

export const writeRequestSchema = z.object({
  kind: z.enum(["post_caption", "adoption_description", "lost_description", "found_description", "match_about"]),
  details: z.string().trim().min(3, { error: "Add a few details first" }).max(800),
});

export const visionRequestSchema = z.object({
  imageUrl: z.string().url(),
});

export const petVisionResultSchema = z.object({
  is_pet: z.boolean().describe("true if the photo clearly shows a dog or cat"),
  species: z.enum(["dog", "cat"]).nullable(),
  breed: z.string().max(60).nullable().describe("Most likely breed, or 'Indie / Desi' / 'Indian / Desi' for local breeds, or 'Mixed breed'"),
  color: z.string().max(60).nullable().describe("Coat colour and markings, short"),
  approx_age: z.string().max(30).nullable().describe("Rough age like 'puppy (3-6 months)', 'adult (2-4 years)'"),
  approx_age_months: z.number().int().min(0).max(300).nullable(),
  description: z.string().max(300).describe("One or two sentences describing distinctive visible features"),
});
export type PetVisionResult = z.infer<typeof petVisionResultSchema>;

export const moderationResultSchema = z.object({
  verdict: z.enum(["allow", "flag", "block"]),
  categories: z.array(z.enum(["spam", "abuse", "animal_cruelty", "animal_sale", "sexual", "other"])),
  reason: z.string().max(300),
});
export type ModerationResult = z.infer<typeof moderationResultSchema>;

export const vaccineSuggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      title: z.string().max(80),
      due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      reason: z.string().max(200),
    }),
  ).max(8),
});
