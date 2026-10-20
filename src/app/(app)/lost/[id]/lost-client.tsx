"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PartyPopper, Printer, RotateCcw, Trash2, Sparkles } from "lucide-react";
import { setLostFoundStatus, deleteLostFound, getPossibleMatches, type PossibleMatch } from "@/lib/actions/lost";
import { Button, ButtonLink } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { sinceLabel } from "@/lib/utils";

export function OwnerActions({ id, status, petName, type }: { id: string; status: "open" | "reunited"; petName: string | null; type: "lost" | "found" }) {
  const [pending, start] = useTransition();
  const [del, setDel] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const story = encodeURIComponent(`${petName ?? "Our furry friend"} is home! 🎉 Thank you to everyone in the Pupmeow community who shared and helped. #ReunitedOnPupmeow`);
  return (
    <section aria-label="Your report" className="space-y-3 rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-card)]">
      <p className="font-heading text-xl font-semibold">This is your report</p>
      {status === "open" ? (
        <>
          <Button size="lg" variant="teal" className="w-full" loading={pending} onClick={() => start(async () => {
            const r = await setLostFoundStatus(id, "reunited");
            toast(r.ok ? r.message ?? "Updated" : r.error, r.ok ? "success" : "error");
            router.refresh();
          })}>{!pending && <PartyPopper className="h-5 w-5" aria-hidden />} {type === "lost" ? `${petName ?? "My pet"} is home!` : "Owner found!"}</Button>
          <p className="text-sm text-muted">{type === "lost" ? "Mark it reunited so people stop searching. We'll celebrate with you." : "Mark it reunited once the pet is back with its family."}</p>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/post/new?caption=${story}`} variant="teal">Share the happy story</ButtonLink>
          <Button variant="outline" loading={pending} onClick={() => start(async () => { const r = await setLostFoundStatus(id, "open"); toast(r.ok ? r.message ?? "Reopened" : r.error, r.ok ? "success" : "error"); router.refresh(); })}>
            <RotateCcw className="h-4 w-4" aria-hidden /> Reopen
          </Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
        {status === "open" && <ButtonLink href={`/lost/${id}/poster`} variant="outline" size="sm"><Printer className="h-4 w-4" aria-hidden /> Poster</ButtonLink>}
        <Button variant="danger-ghost" size="sm" onClick={() => setDel(true)}><Trash2 className="h-4 w-4" aria-hidden /> Delete report</Button>
      </div>
      <ConfirmDialog open={del} onClose={() => setDel(false)} destructive title="Delete this report?" description="The link and poster will stop working." confirmLabel="Delete" onConfirm={async () => {
        const r = await deleteLostFound(id);
        setDel(false);
        if (r.ok) { toast(r.message ?? "Deleted"); router.push("/lost"); } else toast(r.error, "error");
      }} />
    </section>
  );
}

export function PossibleMatches({ id, type }: { id: string; type: "lost" | "found" }) {
  const [items, setItems] = useState<PossibleMatch[] | null>(null);
  useEffect(() => {
    let alive = true;
    getPossibleMatches(id).then((r) => { if (alive) setItems(r.ok ? r.data ?? [] : []); });
    return () => { alive = false; };
  }, [id]);
  return (
    <section aria-labelledby="matches-h" className="rounded-[var(--radius-lg)] bg-cream p-5 text-ink">
      <h2 id="matches-h" className="flex items-center gap-2 text-xl font-semibold"><Sparkles className="h-5 w-5" aria-hidden /> Possible matches</h2>
      <p className="mt-1 text-sm text-ink/75">Kaia compared photos and details with open {type === "found" ? "lost" : "found"} reports. Always confirm with photos before handing over a pet.</p>
      {items === null ? <div className="py-4"><Spinner label="Looking for matches" /></div> : items.length === 0 ? (
        <p className="mt-3 text-sm font-semibold">No similar reports yet. We&apos;ll keep checking as new ones come in.</p>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((m) => (
            <li key={m.id}>
              <Link href={`/lost/${m.id}`} className="block overflow-hidden rounded-[var(--radius-md)] bg-white hover:ring-2 hover:ring-ink">
                <div className="relative aspect-square bg-surface-2">{m.photo_urls[0] && <Image src={m.photo_urls[0]} alt={m.pet_name ?? m.species} fill sizes="200px" className="object-cover" />}</div>
                <div className="p-2.5 text-sm">
                  <p className="truncate font-bold">{m.pet_name ?? m.breed ?? m.species}</p>
                  <p className="truncate text-xs text-ink/70">{m.last_seen_area} · {sinceLabel(m.last_seen_date)}</p>
                  <p className="text-xs font-extrabold text-primary-strong">{Math.round(m.similarity * 100)}% similar</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
