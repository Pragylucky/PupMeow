import "server-only";
import webpush, { type PushSubscription } from "web-push";
import { CONTACT_EMAIL } from "@/lib/constants";
import { env } from "@/lib/env";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import type { NotificationType } from "@/types/database";

/**
 * Web push (phones, the Android app and installed PWAs). Off until VAPID keys and the service-role key are set.
 * In-app notifications are still created by the database; this only delivers copies of them to devices.
 */

export type PushPayload = { title: string; body: string; url: string; tag?: string };

let ready: boolean | null = null;

export function isPushConfigured(): boolean {
  if (ready === null) {
    const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
    ready = Boolean(env.vapidPublicKey && privateKey && hasServiceRole());
    if (ready) webpush.setVapidDetails(process.env.VAPID_SUBJECT?.trim() || `mailto:${CONTACT_EMAIL}`, env.vapidPublicKey, privateKey!);
  }
  return ready;
}

type SubRow = { user_id: string; endpoint: string; p256dh: string; auth: string };

/** Sends to every device of each user. Dead subscriptions (uninstalled, permission revoked) are removed. */
export async function sendPushToUsers(payloads: Map<string, PushPayload>, opts: { ttlSeconds?: number; urgency?: "normal" | "high" } = {}): Promise<number> {
  if (!payloads.size || !isPushConfigured()) return 0;
  const admin = createAdminClient();
  const ids = [...payloads.keys()];
  const subs: SubRow[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await admin.from("push_subscriptions").select("user_id, endpoint, p256dh, auth").in("user_id", ids.slice(i, i + 200));
    subs.push(...((data ?? []) as SubRow[]));
  }

  let sent = 0;
  const dead: string[] = [];
  for (let i = 0; i < subs.length; i += 50) {
    await Promise.all(
      subs.slice(i, i + 50).map(async (s) => {
        const sub: PushSubscription = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
        try {
          await webpush.sendNotification(sub, JSON.stringify(payloads.get(s.user_id)), { TTL: opts.ttlSeconds ?? 6 * 3600, urgency: opts.urgency ?? "normal" });
          sent++;
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) dead.push(s.endpoint);
          else console.warn("[push] send failed", status ?? err);
        }
      }),
    );
  }
  if (dead.length) await admin.from("push_subscriptions").delete().in("endpoint", dead);
  return sent;
}

/**
 * Pushes the in-app notifications the database just created for an entity (e.g. "lost dog near you"
 * rows from the lost_found trigger), so push follows exactly the same audience, preferences and blocks.
 */
export async function pushRecentNotifications(opts: {
  entityId: string;
  types: NotificationType[];
  actorId?: string;
  title: string;
  url: string;
  urgency?: "normal" | "high";
}): Promise<number> {
  if (!isPushConfigured()) return 0;
  try {
    const admin = createAdminClient();
    let q = admin
      .from("notifications")
      .select("user_id, message")
      .eq("entity_id", opts.entityId)
      .in("type", opts.types)
      .gte("created_at", new Date(Date.now() - 10 * 60_000).toISOString())
      .limit(2000);
    if (opts.actorId) q = q.eq("actor_id", opts.actorId);
    const { data } = await q;
    const payloads = new Map<string, PushPayload>();
    for (const n of (data ?? []) as { user_id: string; message: string }[]) {
      payloads.set(n.user_id, { title: opts.title, body: n.message, url: opts.url, tag: `${opts.types[0]}:${opts.entityId}` });
    }
    return await sendPushToUsers(payloads, { urgency: opts.urgency });
  } catch (err) {
    console.error("[push] dispatch failed", err);
    return 0;
  }
}
