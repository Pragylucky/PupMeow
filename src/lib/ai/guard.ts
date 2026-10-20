import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseFromRequest } from "@/lib/supabase/route-handler";
import { env } from "@/lib/env";
import { getAiDailyLimit, isAiAssistantEnabled } from "./config";

type Kind = "chat" | "vision" | "write" | "health";

async function resolveUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: userData } = await supabase.auth.getUser();
  if (userData.user) return userData.user;
  const { data: sessionData } = await supabase.auth.getSession();
  return sessionData.session?.user ?? null;
}

/** Auth + AI configured + not banned + spend one message from the daily budget. */
export async function aiGuard(kind: Kind, request?: NextRequest) {
  if (!isAiAssistantEnabled()) return { error: NextResponse.json({ error: "Kaia is coming soon." }, { status: 503 }) };

  const supabase = request ? createSupabaseFromRequest(request) : await createClient();
  const user = await resolveUser(supabase);
  if (!user) return { error: NextResponse.json({ error: "Please sign in." }, { status: 401 }) };

  const { data: profile } = await supabase.from("profiles").select("is_banned, onboarded, area").eq("id", user.id).maybeSingle();
  if (!profile) return { error: NextResponse.json({ error: "Complete sign-in and try again." }, { status: 403 }) };
  if (profile.is_banned) return { error: NextResponse.json({ error: "Your account can't use Kaia right now." }, { status: 403 }) };
  if (!profile.onboarded) return { error: NextResponse.json({ error: "Finish onboarding first, then ask Kaia." }, { status: 403 }) };

  const { data: remaining, error } = await supabase.rpc("consume_ai_message", { p_kind: kind, p_limit: getAiDailyLimit() });
  if (error) {
    if (error.message.includes("RATE_LIMIT:")) {
      const msg = error.message.split("RATE_LIMIT:")[1]?.trim() ?? "Daily Kaia limit reached.";
      return { error: NextResponse.json({ error: msg }, { status: 429 }) };
    }
    console.error("[aiGuard] consume_ai_message", error.message, error.code);
    const msg =
      error.message.includes("does not exist") || error.code === "42883"
        ? "Database is missing AI tables. Run Supabase migrations on this project."
        : error.message.includes("Sign in")
          ? error.message
          : "Couldn't start Kaia. Try again in a minute.";
    return { error: NextResponse.json({ error: msg }, { status: 500 }) };
  }
  return { supabase, userId: user.id, area: profile.area as string | null, remaining: remaining as number };
}

function hostsMatch(a: string, b: string) {
  const norm = (h: string) => h.toLowerCase().replace(/^www\./, "");
  return norm(a) === norm(b);
}

export function sameOrigin(req: Request) {
  const reqHost = new URL(req.url).host;
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      if (hostsMatch(new URL(origin).host, reqHost)) return true;
    } catch {
      return false;
    }
  }
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      if (hostsMatch(new URL(referer).host, reqHost)) return true;
    } catch {
      return false;
    }
  }
  if (!origin) return true;
  try {
    const siteHost = new URL(env.siteUrl).host;
    if (hostsMatch(new URL(origin).host, siteHost) && hostsMatch(reqHost, siteHost)) return true;
  } catch {
    /* ignore */
  }
  return false;
}
