import { z } from "zod";
import { areaSchema, booleanish, indianPhoneSchema, optionalText, speciesPrefSchema } from "./common";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, { error: "At least 3 characters" })
  .max(20, { error: "At most 20 characters" })
  .regex(/^[a-z0-9_]+$/, { error: "Use only letters, numbers and underscores" });

export const onboardingSchema = z.object({
  username: usernameSchema,
  display_name: z.string().trim().min(1, { error: "Tell us your name" }).max(50),
  area: areaSchema,
  bio: optionalText(200),
  avatar_url: z.string().trim().max(500).optional().transform((v) => v || null),
  species_pref: speciesPrefSchema.default("both"),
});

export const profileSettingsSchema = z.object({
  display_name: z.string().trim().min(1, { error: "Name is required" }).max(50),
  username: usernameSchema,
  area: areaSchema,
  bio: optionalText(200),
  avatar_url: z.string().trim().max(500).optional().transform((v) => v || null),
  hide_area: booleanish,
  whatsapp: z.union([z.literal(""), indianPhoneSchema]).optional().transform((v) => v || null),
});

export const notificationPrefsSchema = z.object({
  notify_likes: booleanish,
  notify_comments: booleanish,
  notify_follows: booleanish,
  notify_mentions: booleanish,
  notify_matches: booleanish,
  notify_lost_nearby: booleanish,
});

export type OnboardingInput = z.input<typeof onboardingSchema>;
