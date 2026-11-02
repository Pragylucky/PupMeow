import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers, type PushPayload } from "@/lib/push";
import { daysUntil, todayIso } from "@/lib/utils";

/** Reminders go out 3 days before, on the day, and once a week late. */
export const REMINDER_OFFSETS = [3, 0, -7] as const;

export function reminderMessage(pet: string, title: string, days: number): string {
  if (days > 0) return `${pet}'s ${title} is due in ${days} day${days === 1 ? "" : "s"}. Book the vet visit now.`;
  if (days === 0) return `${pet}'s ${title} is due today.`;
  return `${pet}'s ${title} was due ${-days} days ago. Book a vet visit soon.`;
}

function isoPlusDays(today: string, n: number): string {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

type Rec = { pet_id: string; owner_id: string; title: string; next_due_date: string };

/** Creates today's reminder notifications (once per item per day) and pushes them. */
export async function sendDueReminders(now: Date = new Date()): Promise<{ notified: number; pushed: number }> {
  const admin = createAdminClient();
  const today = todayIso(now);
  const dates = REMINDER_OFFSETS.map((n) => isoPlusDays(today, n));

  const { data: recs } = await admin.from("pet_health_records").select("pet_id, owner_id, title, next_due_date").in("next_due_date", dates).limit(5000);
  const records = (recs ?? []) as Rec[];
  if (!records.length) return { notified: 0, pushed: 0 };

  const owners = [...new Set(records.map((r) => r.owner_id))];
  const petIds = [...new Set(records.map((r) => r.pet_id))];
  // Midnight India time, as UTC, for "already reminded today".
  const startOfDay = new Date(`${today}T00:00:00+05:30`).toISOString();
  const [{ data: prefs }, { data: banned }, { data: pets }, { data: sentToday }] = await Promise.all([
    admin.from("profile_private").select("id").in("id", owners).eq("notify_reminders", true),
    admin.from("profiles").select("id").in("id", owners).eq("is_banned", true),
    admin.from("pets").select("id, name").in("id", petIds),
    admin.from("notifications").select("user_id, message").eq("type", "reminder").in("user_id", owners).gte("created_at", startOfDay),
  ]);
  const allowed = new Set((prefs ?? []).map((p) => p.id as string));
  for (const b of banned ?? []) allowed.delete(b.id as string);
  const petName = new Map((pets ?? []).map((p) => [p.id as string, p.name as string]));
  const already = new Set((sentToday ?? []).map((n) => `${n.user_id}|${n.message}`));

  const rows: { user_id: string; type: "reminder"; entity_type: "pet"; entity_id: string; message: string }[] = [];
  const firstForUser = new Map<string, { message: string; petId: string; count: number }>();
  for (const r of records) {
    if (!allowed.has(r.owner_id)) continue;
    const message = reminderMessage(petName.get(r.pet_id) ?? "Your pet", r.title, daysUntil(r.next_due_date, now)).slice(0, 200);
    const key = `${r.owner_id}|${message}`;
    if (already.has(key)) continue;
    already.add(key);
    rows.push({ user_id: r.owner_id, type: "reminder", entity_type: "pet", entity_id: r.pet_id, message });
    const first = firstForUser.get(r.owner_id);
    if (first) first.count++;
    else firstForUser.set(r.owner_id, { message, petId: r.pet_id, count: 1 });
  }
  if (!rows.length) return { notified: 0, pushed: 0 };

  // One push per person: their first item, or a summary when there are several.
  const payloads = new Map<string, PushPayload>();
  for (const [userId, f] of firstForUser) {
    payloads.set(
      userId,
      f.count === 1
        ? { title: "💉 Pet health reminder", body: f.message, url: `/pets/${f.petId}/health`, tag: `reminder:${today}` }
        : { title: "💉 Pet health reminders", body: `${f.message} (+${f.count - 1} more)`, url: "/notifications", tag: `reminder:${today}` },
    );
  }
  for (let i = 0; i < rows.length; i += 500) await admin.from("notifications").insert(rows.slice(i, i + 500));
  const pushed = await sendPushToUsers(payloads, { ttlSeconds: 20 * 3600 });
  return { notified: rows.length, pushed };
}
