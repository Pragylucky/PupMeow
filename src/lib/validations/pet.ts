import { z } from "zod";
import { booleanish, dateString, genderSchema, optionalText, speciesSchema } from "./common";

export const petSchema = z.object({
  name: z.string().trim().min(1, { error: "Your pet needs a name" }).max(40),
  species: speciesSchema,
  breed: optionalText(60),
  gender: genderSchema.default("unknown"),
  birthday: z
    .union([z.literal(""), dateString])
    .optional()
    .transform((v) => v || null)
    .refine((v) => !v || new Date(v) <= new Date(), { error: "Birthday can't be in the future" }),
  weight_kg: z
    .union([z.literal(""), z.coerce.number().positive({ error: "Weight must be positive" }).max(149, { error: "That seems too heavy" })])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  photo_urls: z.array(z.string().url()).max(6, { error: "Up to 6 photos" }).default([]),
  bio: optionalText(300),
  is_neutered: booleanish,
});

export const healthRecordSchema = z
  .object({
    pet_id: z.uuid(),
    type: z.enum(["vaccination", "medication", "vet_visit", "weight"]),
    title: z.string().trim().min(1, { error: "Add a title" }).max(80),
    date: dateString,
    next_due_date: z.union([z.literal(""), dateString]).optional().transform((v) => v || null),
    weight_kg: z
      .union([z.literal(""), z.coerce.number().positive().max(149)])
      .optional()
      .transform((v) => (v === "" || v === undefined ? null : v)),
    notes: optionalText(1000),
    document_url: z.string().trim().max(300).optional().transform((v) => v || null),
  })
  .refine((v) => v.type !== "weight" || v.weight_kg !== null, { error: "Enter the weight", path: ["weight_kg"] })
  .refine((v) => !v.next_due_date || v.next_due_date >= v.date, { error: "Next due date must be after the record date", path: ["next_due_date"] });

export type PetInput = z.input<typeof petSchema>;
