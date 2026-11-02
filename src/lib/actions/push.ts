"use server";

import { z } from "zod";
import { actionContext } from "@/lib/auth";
import { friendlyError } from "@/lib/utils";
import { isPushConfigured, sendPushToUsers } from "@/lib/push";
import type { ActionResult } from "@/types/models";

const subscriptionSchema = z.object({
  endpoint: z.string().url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(4).max(100) }),
});

/** Saves this device for push and sends a confirmation notification to it. */
export async function savePushSubscription(raw: unknown, userAgent: string): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const sub = subscriptionSchema.safeParse(raw);
  if (!sub.success) return { ok: false, error: "This browser sent an invalid subscription. Try again." };
  const { error } = await ctx.supabase.rpc("save_push_subscription", {
    p_endpoint: sub.data.endpoint,
    p_p256dh: sub.data.keys.p256dh,
    p_auth: sub.data.keys.auth,
    p_user_agent: userAgent.slice(0, 300),
  });
  if (error) return { ok: false, error: friendlyError(error, "Couldn't turn on notifications.") };
  if (isPushConfigured()) {
    await sendPushToUsers(new Map([[ctx.userId, { title: "You're all set 🐾", body: "We'll alert you about lost pets near you and your pets' vaccine reminders.", url: "/notifications", tag: "welcome" }]]));
  }
  return { ok: true, message: "Notifications are on for this device" };
}

export async function deletePushSubscription(endpoint: string): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const { error } = await ctx.supabase.from("push_subscriptions").delete().eq("endpoint", endpoint.slice(0, 1000));
  if (error) return { ok: false, error: friendlyError(error) };
  return { ok: true, message: "Notifications are off for this device" };
}
