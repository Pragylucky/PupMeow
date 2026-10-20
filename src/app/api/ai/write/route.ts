import { NextResponse } from "next/server";
import { generateText } from "ai";
import { aiGuard, sameOrigin } from "@/lib/ai/guard";
import { getLanguageModel } from "@/lib/ai/provider";
import { WRITE_PROMPTS } from "@/lib/ai/prompts";
import { writeRequestSchema } from "@/lib/validations/ai";

export const runtime = "nodejs";
export const maxDuration = 30;

/** "Write it for me" drafts. The user always reviews and edits before posting. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = writeRequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Add a few details first" }, { status: 400 });
  const g = await aiGuard("write");
  if ("error" in g) return g.error;
  try {
    const { text } = await generateText({
      model: getLanguageModel(),
      system: `You write short, warm copy for Pupmeow, a pet community in Delhi NCR. Indian English. Never invent facts that weren't given except gentle generic phrasing. Never mention money for animals. ${WRITE_PROMPTS[body.data.kind]}`,
      prompt: `Details from the user:\n${body.data.details}`,
      maxOutputTokens: 400,
      temperature: 0.7,
      abortSignal: AbortSignal.timeout(20000),
    });
    return NextResponse.json({ text: text.trim().replace(/^"|"$/g, ""), remaining: g.remaining });
  } catch (err) {
    console.error("[ai/write]", err);
    return NextResponse.json({ error: "AI couldn't write this right now." }, { status: 502 });
  }
}
