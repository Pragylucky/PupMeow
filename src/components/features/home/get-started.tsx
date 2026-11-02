"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check, Syringe, PawPrint, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePush } from "@/components/features/push/push-toggle";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "pupmeow:get-started-dismissed";

interface Step { key: string; title: string; text: string; done: boolean; icon: typeof Bell; href?: string; cta: string; onClick?: () => void; busy?: boolean }

/** New-member checklist on Home: add a pet, set a due date, turn on alerts, try Kaia. Goes away once finished. */
export function GetStartedCard({ hasPet, firstPetId, hasReminder, kaiaTried, aiOn }: { hasPet: boolean; firstPetId?: string; hasReminder: boolean; kaiaTried: boolean; aiOn: boolean }) {
  const push = usePush();
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  // Alerts only count when this device can do them; otherwise the step is left out.
  const pushStep = push.state === "off" || push.state === "on" || push.state === "ios-install";
  const steps: Step[] = [
    { key: "pet", title: "Add your pet", text: "A profile, a lost-pet poster and health records, ready in a minute.", done: hasPet, icon: PawPrint, href: "/pets/new", cta: "Add a pet" },
    { key: "due", title: "Set a vaccine due date", text: "Add one vaccine and tap when the next dose is due. We'll remind you.", done: hasReminder, icon: Syringe, href: hasPet && firstPetId ? `/pets/${firstPetId}/health` : "/pets/new", cta: hasPet ? "Add a vaccine" : "Add a pet first" },
    ...(pushStep ? [{ key: "push", title: "Turn on phone alerts", text: push.state === "ios-install" ? "On iPhone: Share → Add to Home Screen, then open Pupmeow from there." : "Lost pets near you and your pet's reminders, even when the app is closed.", done: push.state === "on", icon: Bell, cta: "Turn on", onClick: push.state === "off" ? () => void push.enable() : undefined, busy: push.busy } satisfies Step] : []),
    ...(aiOn ? [{ key: "kaia", title: "Ask Kaia anything", text: "Food, behaviour, Diwali nerves, AQI walks. Kaia knows today's weather and your pets.", done: kaiaTried, icon: Sparkles, href: "/assistant", cta: "Ask Kaia" } satisfies Step] : []),
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (dismissed || doneCount === steps.length || push.state === "loading") return null;
  const next = steps.find((s) => !s.done)!;
  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  };

  return (
    <section aria-labelledby="gs-h" className="animate-[pm-rise_400ms_ease-out_both] rounded-[var(--radius-xl)] bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="gs-h" className="text-[1.35rem] font-semibold leading-tight">Get the most out of Pupmeow</h2>
          <p className="text-[0.95rem] text-muted">{doneCount} of {steps.length} done</p>
        </div>
        <button type="button" onClick={dismiss} className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-text" aria-label="Hide this checklist"><X className="h-4 w-4" /></button>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={doneCount} aria-label="Progress">
        <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <ul className="mt-4 space-y-2">
        {steps.map((s) => {
          const isNext = s.key === next.key;
          return (
            <li key={s.key} className={cn("flex items-center gap-3 rounded-[var(--radius-lg)] p-3", isNext ? "bg-primary-soft" : "bg-transparent")}>
              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", s.done ? "bg-primary text-on-primary" : "bg-surface-2 text-muted")}>
                {s.done ? <Check className="h-5 w-5" aria-hidden /> : <s.icon className="h-5 w-5" aria-hidden />}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("font-bold", s.done && "text-muted line-through decoration-2")}>{s.title}</p>
                {!s.done && <p className="text-sm text-muted">{s.text}</p>}
              </div>
              {!s.done && isNext && (
                s.href ? <Link href={s.href} className="inline-flex h-10 shrink-0 items-center rounded-full bg-primary px-4 text-sm font-bold text-on-primary hover:opacity-90">{s.cta}</Link>
                  : s.onClick ? <Button size="sm" loading={s.busy} onClick={s.onClick}>{s.cta}</Button> : null
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
