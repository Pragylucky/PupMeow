import { z } from "zod";
import { imageUrlSchema, speciesSchema } from "./common";

export const createPostSchema = z
  .object({
    caption: z.string().trim().max(1000, { error: "Captions can be up to 1000 characters" }).default(""),
    image_urls: z.array(imageUrlSchema).max(6, { error: "Up to 6 photos per post" }).default([]),
    pet_id: z.union([z.literal(""), z.uuid()]).optional().transform((v) => v || null),
    species: z.union([z.literal(""), speciesSchema]).optional().transform((v) => v || null),
  })
  .refine((v) => v.caption.length > 0 || v.image_urls.length > 0, { error: "Add a photo or write something", path: ["caption"] });

export const editPostSchema = z.object({
  id: z.uuid(),
  caption: z.string().trim().max(1000),
});

export const commentSchema = z.object({
  post_id: z.uuid(),
  body: z.string().trim().min(1, { error: "Write a comment" }).max(500, { error: "Comments can be up to 500 characters" }),
});

export const feedQuerySchema = z.object({
  tab: z.enum(["nearby", "city", "following", "all"]).default("all"),
  cursor: z.string().datetime({ offset: true }).optional().nullable(),
  species: z.enum(["dog", "cat", "both"]).default("both"),
});

export type FeedTab = z.infer<typeof feedQuerySchema>["tab"];
