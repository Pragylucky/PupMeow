import { z } from "zod";

export const speciesSchema = z.enum(["dog", "cat"], { error: "Choose dog or cat" });
export const speciesPrefSchema = z.enum(["dog", "cat", "both"]);
export const genderSchema = z.enum(["male", "female", "unknown"]);
export const contactMethodSchema = z.enum(["whatsapp", "phone"]);
export const uuidSchema = z.uuid({ error: "Invalid id" });

/** Indian mobile: 10 digits starting 6-9, optionally prefixed with +91 / 91 / 0. */
export const indianPhoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine((v) => /^(?:\+?91|0)?[6-9]\d{9}$/.test(v), { error: "Enter a valid 10-digit Indian mobile number" })
  .transform((v) => v.replace(/^(?:\+?91|0)/, ""));

/** Public image URL from our own Supabase storage (or Google avatar). */
export const imageUrlSchema = z
  .string()
  .trim()
  .url({ error: "Invalid image" })
  .refine((u) => {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return (base && u.startsWith(`${base}/storage/v1/object/public/`)) || u.startsWith("https://lh3.googleusercontent.com/");
  }, { error: "Images must be uploaded through Pupmeow" });

export const optionalText = (max: number) =>
  z.string().trim().max(max, { error: `Keep it under ${max} characters` }).optional().transform((v) => (v ? v : null));

export const requiredText = (min: number, max: number, label: string) =>
  z.string().trim().min(min, { error: min <= 1 ? `${label} is required` : `${label} needs at least ${min} characters` })
    .max(max, { error: `${label} must be under ${max} characters` });

export const areaSchema = z.string().trim().min(2, { error: "Choose your area" }).max(60);

export const booleanish = z
  .union([z.boolean(), z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
  .optional()
  .transform((v) => v === true || v === "on" || v === "true");

export const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Pick a valid date" });

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
