import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAiDailyLimit, isAiAssistantEnabled } from "./config";

type Kind = "chat" | "vision" | "write" | "health";

/** Auth + AI configured + not banned + spend one message from the daily budget. */
export async function aiGuard(kind: Kind) {
  if (!isAiAssistantEnabled()) return { error: NextResponse.json({ error: "Kaia is coming soon." }, { status: 503 }) };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: NextResponse.json({ error: "Please sign in." }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("is_banned, onboarded, area").eq("id", data.user.id).maybeSingle();
  if (!profile || profile.is_banned || !profile.onboarded) return { error: NextResponse.json({ error: "Your account can't use AI right now." }, { status: 403 }) };
  const { data: remaining, error } = await supabase.rpc("consume_ai_message", { p_kind: kind, p_limit: getAiDailyLimit() });
  if (error) {
    const msg = error.message.includes("RATE_LIMIT:") ? error.message.split("RATE_LIMIT:")[1].trim() : "Couldn't start AI right now.";
    return { error: NextResponse.json({ error: msg }, { status: error.message.includes("RATE_LIMIT") ? 429 : 500 }) };
  }
  return { supabase, userId: data.user.id, area: profile.area as string | null, remaining: remaining as number };
}

export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === new URL(req.url).host; } catch { return false; }
}
