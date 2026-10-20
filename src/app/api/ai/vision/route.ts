import { NextResponse } from "next/server";
import { aiGuard, sameOrigin } from "@/lib/ai/guard";
import { describePetPhoto, isOwnStorageUrl } from "@/lib/ai/embeddings";
import { visionRequestSchema } from "@/lib/validations/ai";

export const runtime = "nodejs";
export const maxDuration = 30;

/** "Fill with AI": species, breed, colour and approximate age from a photo the user uploaded. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = visionRequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success || !isOwnStorageUrl(body.data.imageUrl)) return NextResponse.json({ error: "Upload a photo first." }, { status: 400 });
  const g = await aiGuard("vision");
  if ("error" in g) return g.error;
  try {
    const result = await describePetPhoto(body.data.imageUrl);
    return NextResponse.json({ result, remaining: g.remaining });
  } catch (err) {
    console.error("[ai/vision]", err);
    return NextResponse.json({ error: "AI couldn't read this photo. Fill the details yourself." }, { status: 502 });
  }
}
