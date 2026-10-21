import { NextResponse, type NextRequest } from "next/server";
import { aiGuard, sameOrigin } from "@/lib/ai/guard";
import { streamChatToWriter } from "@/lib/ai/chat-stream";
import { assistantSystemPrompt, petContextFor } from "@/lib/ai/prompts";
import { detectEmergency } from "@/lib/ai/emergency";
import { userFacingAiError } from "@/lib/ai/errors";
import { chatRequestSchema } from "@/lib/validations/ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { HealthRecordRow, PetRow } from "@/types/database";

export const runtime = "nodejs";
export const maxDuration = 60;

async function loadPetContext(supabase: SupabaseClient, userId: string, petId: string | null | undefined) {
  if (!petId) return undefined;
  const { data: pet } = await supabase.from("pets").select("*").eq("id", petId).eq("owner_id", userId).maybeSingle();
  if (!pet) return undefined;
  const { data: recs } = await supabase
    .from("pet_health_records")
    .select("*")
    .eq("pet_id", petId)
    .order("date", { ascending: false })
    .limit(12);
  return petContextFor(pet as PetRow, (recs ?? []) as HealthRecordRow[]);
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = chatRequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Invalid message" }, { status: 400 });

  let g: Awaited<ReturnType<typeof aiGuard>>;
  try {
    g = await aiGuard("chat", req);
  } catch (err) {
    console.error("[ai/chat] guard", err);
    return NextResponse.json({ error: "Couldn't start Kaia. Try again in a minute." }, { status: 500 });
  }
  if ("error" in g) return g.error;
  const { supabase, userId, area, remaining } = g;
  const { message, petId } = body.data;

  let conversationId = body.data.conversationId ?? null;
  if (conversationId) {
    const { data: conv } = await supabase.from("ai_conversations").select("id").eq("id", conversationId).eq("user_id", userId).maybeSingle();
    if (!conv) return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    await supabase.from("ai_conversations").update({ pet_id: petId ?? null }).eq("id", conversationId);
  } else {
    const { data: conv, error } = await supabase
      .from("ai_conversations")
      .insert({ user_id: userId, title: message.slice(0, 60), pet_id: petId ?? null })
      .select("id")
      .single();
    if (error || !conv) return NextResponse.json({ error: "Couldn't start a chat" }, { status: 500 });
    conversationId = conv.id;
  }

  const convId: string = conversationId!;
  const emergency = detectEmergency(message);
  const userContent = emergency ? `${message}\n\n[This may be an emergency: start with an urgent go-to-vet-now line.]` : message;

  const [historyRes, petContext] = await Promise.all([
    supabase.from("ai_messages").select("role, content").eq("conversation_id", convId).order("created_at", { ascending: false }).limit(12),
    loadPetContext(supabase, userId, petId),
  ]);

  const history = ((historyRes.data ?? []) as { role: "user" | "assistant"; content: string }[]).reverse();
  const system = assistantSystemPrompt({ petContext, userArea: area });

  void supabase.from("ai_messages").insert({ conversation_id: convId, user_id: userId, role: "user", content: message });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      try {
        const out = await streamChatToWriter(
          {
            system,
            messages: [...history, { role: "user" as const, content: userContent }],
          },
          (chunk) => {
            controller.enqueue(encoder.encode(chunk));
          },
        );
        full = out.full;
        console.info("[ai/chat] replied via", out.provider);
      } catch (err) {
        console.error("[ai/chat]", err);
        const fallback = userFacingAiError(err);
        full = fallback;
        controller.enqueue(encoder.encode(fallback));
      } finally {
        if (full.trim()) {
          await supabase.from("ai_messages").insert({ conversation_id: convId, user_id: userId, role: "assistant", content: full.slice(0, 12000) });
          await supabase.from("ai_conversations").update({ pet_id: petId ?? null }).eq("id", convId);
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
