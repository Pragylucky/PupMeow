import "server-only";
import { embed, generateText, Output } from "ai";
import { embeddingProviderOptions, getEmbeddingModel, getLanguageModel } from "./provider";
import { getEmbeddingProviderName, isAiEnabled } from "./config";
import { VISION_PROMPT } from "./prompts";
import { petVisionResultSchema, type PetVisionResult } from "@/lib/validations/ai";
import { env } from "@/lib/env";

/** Only fetch images from our own Supabase storage (prevents SSRF). */
export function isOwnStorageUrl(url: string) {
  return Boolean(env.supabaseUrl) && url.startsWith(`${env.supabaseUrl}/storage/v1/object/`);
}

async function fetchImageBytes(url: string): Promise<{ data: Uint8Array; mediaType: string }> {
  if (!isOwnStorageUrl(url)) throw new Error("Image must be uploaded to Pupmeow first.");
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error("Could not read the image.");
  const mediaType = res.headers.get("content-type") ?? "image/jpeg";
  if (!mediaType.startsWith("image/")) throw new Error("That file is not an image.");
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength > 5 * 1024 * 1024) throw new Error("Image is too large.");
  return { data: buf, mediaType };
}

export async function describePetPhoto(imageUrl: string): Promise<PetVisionResult> {
  const { data, mediaType } = await fetchImageBytes(imageUrl);
  const { output } = await generateText({
    model: getLanguageModel(),
    output: Output.object({ schema: petVisionResultSchema }),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: VISION_PROMPT },
          { type: "image", image: data, mediaType },
        ],
      },
    ],
    abortSignal: AbortSignal.timeout(20000),
    maxRetries: 1,
  });
  return output;
}

export async function embedText(text: string): Promise<number[]> {
  const embedProvider = getEmbeddingProviderName();
  const { embedding } = await embed({
    model: getEmbeddingModel(),
    value: text.slice(0, 2000),
    providerOptions:
      embedProvider === "openai"
        ? { openai: embeddingProviderOptions.openai }
        : { google: embeddingProviderOptions.google },
    abortSignal: AbortSignal.timeout(10000),
    maxRetries: 1,
  });
  return embedding;
}

/**
 * Image+text embedding for lost & found matching: the vision model turns the first photo into a
 * description, which is combined with the structured fields and embedded as text.
 */
export async function buildLostFoundEmbedding(input: {
  species: string; breed: string | null; color: string | null; gender: string; description: string; photoUrl: string;
}): Promise<{ embedding: number[]; aiDescription: string } | null> {
  if (!isAiEnabled()) return null;
  let visual = "";
  try {
    const v = await describePetPhoto(input.photoUrl);
    visual = [v.breed, v.color, v.approx_age, v.description].filter(Boolean).join(". ");
  } catch (err) {
    console.error("[embeddings] vision step failed", err);
  }
  const text = [
    `Species: ${input.species}`,
    input.breed && `Breed: ${input.breed}`,
    input.color && `Colour: ${input.color}`,
    `Gender: ${input.gender}`,
    visual && `Photo: ${visual}`,
    `Notes: ${input.description}`,
  ].filter(Boolean).join("\n");
  const embedding = await embedText(text);
  return { embedding, aiDescription: visual.slice(0, 1000) };
}

export function toPgVector(v: number[]) {
  return `[${v.map((n) => (Number.isFinite(n) ? n.toFixed(6) : "0")).join(",")}]`;
}
