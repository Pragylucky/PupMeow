import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers, type PushPayload } from "@/lib/push";
import { daysUntil, todayIso } from "@/lib/utils";

/** Owners hear from us 1, 3 and 7 days after posting a lost pet. */
export const LOST_FOLLOWUP_DAYS = [1, 3, 7] as const;

export function followUpMessage(name: string, ageDays: number): string {
  if (ageDays >= 7) return `It's been a week since ${name} went missing. Any news? Share again, or mark ${name} as home.`;
  if (ageDays >= 3) return `${name} has been missing for ${ageDays} days. Share the poster again and check with nearby vets and shops.`;
  return `Still looking for ${name}? Share the poster in your society groups again. Fresh posts reach new people.`;
}

type Lost = { id: string; author_id: string; pet_name: string | null; species: string; created_at: string };

/** Creates follow-up notifications for open lost reports (once per report per day) and pushes them. */
export async function sendLostFollowUps(now: Date = new Date()): Promise<{ notified: number; pushed: number }> {
  const admin = createAdminClient();
  const today = todayIso(now);
  const since = new Date(now.getTime() - 9 * 86_400_000).toISOString();
  const { data } = await admin
    .from("lost_found")
    .select("id, author_id, pet_name, species, created_at")
    .eq("type", "lost")
    .eq("status", "open")
    .eq("is_hidden", false)
    .gte("created_at", since)
    .limit(2000);

  // Age in whole India-time days; only the milestone days get a message.
  const due = ((data ?? []) as Lost[]).map((l) => ({ l, age: -daysUntil(todayIso(new Date(l.created_at)), now) })).filter((x) => (LOST_FOLLOWUP_DAYS as readonly number[]).includes(x.age));
  if (!due.length) return { notified: 0, pushed: 0 };

  const owners = [...new Set(due.map((x) => x.l.author_id))];
  const startOfDay = new Date(`${today}T00:00:00+05:30`).toISOString();
  const [{ data: prefs }, { data: banned }, { data: sentToday }] = await Promise.all([
    admin.from("profile_private").select("id").in("id", owners).eq("notify_reminders", true),
    admin.from("profiles").select("id").in("id", owners).eq("is_banned", true),
    admin.from("notifications").select("user_id, entity_id").eq("type", "reminder").eq("entity_type", "lost_found").in("user_id", owners).gte("created_at", startOfDay),
  ]);
  const allowed = new Set((prefs ?? []).map((p) => p.id as string));
  for (const b of banned ?? []) allowed.delete(b.id as string);
  const already = new Set((sentToday ?? []).map((n) => `${n.user_id}|${n.entity_id}`));

  const rows: { user_id: string; type: "reminder"; entity_type: "lost_found"; entity_id: string; message: string }[] = [];
  const payloads = new Map<string, PushPayload>();
  for (const { l, age } of due) {
    if (!allowed.has(l.author_id) || already.has(`${l.author_id}|${l.id}`)) continue;
    const name = l.pet_name ?? `your ${l.species}`;
    const message = followUpMessage(name, age).slice(0, 200);
    rows.push({ user_id: l.author_id, type: "reminder", entity_type: "lost_found", entity_id: l.id, message });
    if (!payloads.has(l.author_id)) payloads.set(l.author_id, { title: `🐾 ${l.pet_name ?? "Your pet"} is still missing`, body: message, url: `/lost/${l.id}?share=1`, tag: `lost-followup:${l.id}` });
  }
  if (!rows.length) return { notified: 0, pushed: 0 };
  for (let i = 0; i < rows.length; i += 500) await admin.from("notifications").insert(rows.slice(i, i + 500));
  const pushed = await sendPushToUsers(payloads, { ttlSeconds: 20 * 3600 });
  return { notified: rows.length, pushed };
}
