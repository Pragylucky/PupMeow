"use client";

import { Users } from "lucide-react";
import { ShareButtons } from "@/components/features/listings/share-buttons";
import { inviteText, neighbourNudge } from "@/lib/invite";

/** Home card: how many neighbours are on Pupmeow, with a one-tap WhatsApp invite. Hidden once an area is busy. */
export function InviteCard({ hood, neighbours }: { hood: string; neighbours: number }) {
  const nudge = neighbourNudge(hood, neighbours);
  if (!nudge) return null;
  return (
    <section aria-labelledby="invite-h" className="rounded-[var(--radius-xl)] bg-cat p-5 text-white sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20"><Users className="h-5 w-5" aria-hidden /></span>
        <div className="min-w-0">
          <h2 id="invite-h" className="text-[1.35rem] font-semibold leading-tight">{nudge.title}</h2>
          <p className="mt-0.5 text-[0.95rem] font-semibold text-white/90">{nudge.text}</p>
        </div>
      </div>
      <ShareButtons path="/?ref=invite" text={inviteText(hood)} size="sm" className="mt-4 [&>button:last-child:hover]:bg-white/10 [&>button:last-child]:text-white" />
    </section>
  );
}
