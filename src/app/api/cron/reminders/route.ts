import { NextResponse, type NextRequest } from "next/server";
import { hasServiceRole } from "@/lib/supabase/admin";
import { sendDueReminders } from "@/lib/reminders";
import { sendLostFollowUps } from "@/lib/lost-followups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Daily at 9:00 India time (vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasServiceRole()) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured" }, { status: 500 });
  try {
    // Independent jobs: one failing shouldn't stop the other.
    const [health, lost] = await Promise.allSettled([sendDueReminders(), sendLostFollowUps()]);
    const result = {
      health: health.status === "fulfilled" ? health.value : { error: String(health.reason) },
      lostFollowUps: lost.status === "fulfilled" ? lost.value : { error: String(lost.reason) },
    };
    console.info("[cron/reminders]", result);
    if (health.status === "rejected" && lost.status === "rejected") return NextResponse.json({ error: "Reminder run failed", ...result }, { status: 500 });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[cron/reminders]", err);
    return NextResponse.json({ error: "Reminder run failed" }, { status: 500 });
  }
}
