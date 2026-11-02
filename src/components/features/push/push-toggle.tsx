"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { deletePushSubscription, savePushSubscription } from "@/lib/actions/push";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

export type PushState = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration() {
  // Production registers sw.js in <head>; register here too so this also works in dev.
  await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  return navigator.serviceWorker.ready;
}

/** This device's push state, plus enable / disable. Push stays hidden until VAPID keys are configured. */
export function usePush() {
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!env.vapidPublicKey) return setState("unsupported");
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      // iPhone Safari only supports push once Pupmeow is added to the Home Screen.
      return setState(ios && !standalone ? "ios-install" : "unsupported");
    }
    if (Notification.permission === "denied") return setState("denied");
    let alive = true;
    void navigator.serviceWorker.getRegistration("/").then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription();
      if (alive) setState(sub && Notification.permission === "granted" ? "on" : "off");
    });
    return () => {
      alive = false;
    };
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await registration();
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(env.vapidPublicKey) }));
      const r = await savePushSubscription(sub.toJSON(), navigator.userAgent);
      if (!r.ok) throw new Error(r.error);
      setState("on");
      toast(r.message ?? "Notifications are on");
    } catch (err) {
      toast(err instanceof Error && err.message ? err.message : "Couldn't turn on notifications.", "error");
    } finally {
      setBusy(false);
    }
  }, [toast]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
      toast("Notifications are off for this device");
    } finally {
      setBusy(false);
    }
  }, [toast]);

  return { state, busy, enable, disable };
}

const DISMISS_KEY = "pupmeow:push-prompt-dismissed";

/** Home card nudging people to turn on phone alerts. Hidden once on, blocked, unsupported or dismissed. */
export function PushPromptCard() {
  const { state, busy, enable } = usePush();
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);
  if (dismissed || (state !== "off" && state !== "ios-install")) return null;
  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  };
  return (
    <section aria-label="Turn on alerts" className="flex animate-[pm-rise_400ms_ease-out_both] flex-wrap items-center gap-4 rounded-[var(--radius-xl)] bg-ink p-5 text-white sm:p-6">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-danger"><BellRing className="h-6 w-6" aria-hidden /></span>
      <div className="min-w-[12rem] flex-1">
        <h2 className="text-[1.3rem] font-semibold leading-tight">Get lost-pet alerts on your phone</h2>
        <p className="text-[0.95rem] font-semibold text-white/80">
          {state === "ios-install" ? "On iPhone: tap Share → Add to Home Screen, then open Pupmeow from there to turn alerts on." : "The first hours matter. Hear about lost pets near you, and your pets' vaccine reminders, even when Pupmeow is closed."}
        </p>
      </div>
      <div className="flex gap-2">
        {state === "off" && <Button variant="white" size="sm" loading={busy} onClick={() => void enable()}>Turn on alerts</Button>}
        <Button variant="dim" size="sm" onClick={dismiss}>Not now</Button>
      </div>
    </section>
  );
}

/** Settings row: turn phone notifications on or off for this device. */
export function PushToggle({ className }: { className?: string }) {
  const { state, busy, enable, disable } = usePush();
  if (state === "loading" || state === "unsupported") return null;
  return (
    <div className={cn("rounded-[var(--radius-lg)] border-2 border-border p-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold">Phone notifications</p>
          <p className="text-sm text-muted">
            {state === "on" && "On for this device. You'll get lost-pet alerts and vaccine reminders even when Pupmeow is closed."}
            {state === "off" && "Get lost-pet alerts near you and vaccine reminders, even when Pupmeow is closed."}
            {state === "denied" && "Blocked in your browser settings. Allow notifications for pupmeow.in there, then reload."}
            {state === "ios-install" && "On iPhone: tap Share → Add to Home Screen, open Pupmeow from there, then turn this on."}
          </p>
        </div>
        {state === "off" && <Button size="sm" loading={busy} onClick={() => void enable()}><BellRing className="h-4 w-4" aria-hidden /> Turn on</Button>}
        {state === "on" && <Button size="sm" variant="outline" loading={busy} onClick={() => void disable()}><BellOff className="h-4 w-4" aria-hidden /> Turn off</Button>}
      </div>
    </div>
  );
}
