import { NextResponse } from "next/server";
import { streamText } from "ai";
import { aiGuard, sameOrigin } from "@/lib/ai/guard";
import { getLanguageModel } from "@/lib/ai/provider";
import { assistantSystemPrompt, petContextFor } from "@/lib/ai/prompts";
import { detectEmergency } from "@/lib/ai/emergency";
import { chatRequestSchema } from "@/lib/validations/ai";
import type { HealthRecordRow, PetRow } from "@/types/database";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = chatRequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Invalid message" }, { status: 400 });

  const g = await aiGuard("chat");
  if ("error" in g) return g.error;
  const { supabase, userId, area, remaining } = g;
  const { message, petId } = body.data;

  // Conversation (own only)
  let conversationId = body.data.conversationId ?? null;
  if (conversationId) {
    const { data: conv } = await supabase.from("ai_conversations").select("id").eq("id", conversationId).eq("user_id", userId).maybeSingle();
    if (!conv) return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    await supabase.from("ai_conversations").update({ pet_id: petId ?? null }).eq("id", conversationId);
  } else {
    const { data: conv, error } = await supabase.from("ai_conversations").insert({ user_id: userId, title: message.slice(0, 60), pet_id: petId ?? null }).select("id").single();
    if (error || !conv) return NextResponse.json({ error: "Couldn't start a chat" }, { status: 500 });
    conversationId = conv.id;
  }

  const { data: history } = await supabase.from("ai_messages").select("role, content").eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(20);

  let petContext: string | undefined;
  if (petId) {
    const { data: pet } = await supabase.from("pets").select("*").eq("id", petId).eq("owner_id", userId).maybeSingle();
    if (pet) {
      const { data: recs } = await supabase.from("pet_health_records").select("*").eq("pet_id", petId).order("date", { ascending: false }).limit(15);
      petContext = petContextFor(pet as PetRow, (recs ?? []) as HealthRecordRow[]);
    }
  }

  await supabase.from("ai_messages").insert({ conversation_id: conversationId, user_id: userId, role: "user", content: message });
  const emergency = detectEmergency(message);

  const result = streamText({
    model: getLanguageModel(),
    system: assistantSystemPrompt({ petContext, userArea: area }),
    messages: [
      ...((history ?? []) as { role: "user" | "assistant"; content: string }[]).reverse(),
      { role: "user" as const, content: emergency ? `${message}\n\n[This may be an emergency: start with an urgent go-to-vet-now line.]` : message },
    ],
    maxOutputTokens: 700,
    temperature: 0.5,
  });

  const encoder = new TextEncoder();
  const convId: string = conversationId!;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      try {
        for await (const chunk of result.textStream) {
          full += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        console.error("[ai/chat]", err);
        const fallback = full ? "" : "Sorry, I couldn't answer just now. Please try again in a moment.";
        full += fallback;
        if (fallback) controller.enqueue(encoder.encode(fallback));
      } finally {
        if (full.trim()) {
          await supabase.from("ai_messages").insert({ conversation_id: convId, user_id: userId, role: "assistant", content: full.slice(0, 12000) });
          await supabase.from("ai_conversations").update({ pet_id: petId ?? null }).eq("id", convId); // bumps updated_at
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Conversation-Id": convId,
      "X-PM-Emergency": emergency ? "1" : "0",
      "X-AI-Remaining": String(remaining),
    },
  });
}
