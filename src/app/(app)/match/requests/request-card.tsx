"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Phone } from "lucide-react";
import { respondMatchRequest, cancelMatchRequest, getMatchContact } from "@/lib/actions/match";
import { Button, ButtonLink } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { PetImage } from "@/components/brand/pet-image";
import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";
import { AddToCalendar } from "@/components/features/care/reminder-actions";
import { cn, displayName, telLink, timeAgo, whatsappLink } from "@/lib/utils";
import type { MatchRequestWithPets } from "@/types/models";

function nextSaturdayEvening() {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  d.setHours(18, 0, 0, 0);
  return d.toISOString();
}

export function RequestCard({ request: r, viewerId }: { request: MatchRequestWithPets; viewerId: string }) {
  const [pending, start] = useTransition();
  const [contact, setContact] = useState<{ display_name: string | null; whatsapp: string | null } | null>(null);
  const router = useRouter();
  const toast = useToast();
  const incoming = r.to_owner_id === viewerId;
  const other = incoming ? r.from_owner : r.to_owner;
  const act = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) => start(async () => {
    const res = await fn();
    toast(res.ok ? res.message ?? "Done" : res.error ?? "Error", res.ok ? "success" : "error");
    router.refresh();
  });
  const statusTone = r.status === "accepted" ? "bg-primary text-on-primary" : r.status === "declined" ? "bg-surface-2 text-muted" : "bg-secondary text-ink";
  const pair = `${r.from_pet?.name ?? "Pet"} & ${r.to_pet?.name ?? "Pet"}`;

  return (
    <article className="rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="flex items-center gap-4">
        <div className="flex shrink-0 -space-x-3">
          {[r.from_pet, r.to_pet].map((p, i) => (
            <Link key={i} href={p ? `/pet/${p.id}` : "#"} className="relative h-14 w-14 overflow-hidden rounded-full ring-4 ring-surface">
              <PetImage src={p?.photo_url} alt={p?.name ?? "Pet"} species={p?.species} seed={p?.id} sizes="56px" />
            </Link>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-[1.2rem] font-semibold">{pair}</p>
          <p className="truncate text-[0.9rem] text-muted">{incoming ? "From" : "To"} {displayName(other)} · {timeAgo(r.created_at)}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className={cn("rounded-full px-2.5 py-1 text-[0.75rem] font-extrabold", statusTone)}>{r.status === "pending" ? (incoming ? "Needs reply" : "Waiting") : r.status === "accepted" ? "Matched" : "Declined"}</span>
          <span className="rounded-full bg-cat-soft px-2.5 py-1 text-[0.75rem] font-extrabold text-text">{r.purpose === "breeding" ? "Breeding" : "Playdate"}</span>
        </div>
      </div>
      {r.message && <p className="mt-3 rounded-[1rem] rounded-tl-sm bg-surface-2 px-4 py-2.5 text-[0.95rem]">“{r.message}”</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {r.status === "pending" && incoming && (
          <>
            <Button variant="violet" loading={pending} onClick={() => act(() => respondMatchRequest(r.id, true))}>{!pending && <Check className="h-4 w-4" aria-hidden />} Accept</Button>
            <Button variant="outline" disabled={pending} onClick={() => act(() => respondMatchRequest(r.id, false))}><X className="h-4 w-4" aria-hidden /> Decline</Button>
          </>
        )}
        {r.status === "pending" && !incoming && <Button variant="ghost" loading={pending} onClick={() => act(() => cancelMatchRequest(r.id))}>Cancel request</Button>}
        {r.status === "accepted" && (contact ? (
          contact.whatsapp ? (
            <>
              <ButtonLink variant="whatsapp" href={whatsappLink(contact.whatsapp, `Hi ${contact.display_name ?? ""}! We matched on Pupmeow (${pair}). When works for a walk? `)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon className="h-[1.1rem] w-[1.1rem]" /> WhatsApp</ButtonLink>
              <ButtonLink variant="outline" href={telLink(contact.whatsapp)}><Phone className="h-4 w-4" aria-hidden /> Call</ButtonLink>
            </>
          ) : <p className="text-sm text-muted">{displayName(other)} hasn&apos;t added a WhatsApp number yet. Try <Link className="font-bold text-primary underline" href={`/u/${other?.username}`}>their profile</Link>.</p>
        ) : (
          <Button variant="whatsapp" loading={pending} onClick={() => start(async () => {
            const res = await getMatchContact(r.id);
            if (res.ok && res.data) setContact(res.data); else toast(res.ok ? "Unavailable" : res.error, "error");
          })}>{!pending && <WhatsAppIcon className="h-[1.1rem] w-[1.1rem]" />} Show contact</Button>
        ))}
        {r.status === "accepted" && (
          <AddToCalendar label="Plan on calendar" event={{ title: `Playdate: ${pair}`, start: nextSaturdayEvening(), durationMinutes: 60, details: `Playdate arranged on Pupmeow with ${displayName(other)}. First meet in a public park; leashes on for the first 10 minutes.` }} />
        )}
      </div>
    </article>
  );
}
