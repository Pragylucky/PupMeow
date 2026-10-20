"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, Pencil, Trash2, Send, PartyPopper } from "lucide-react";
import { sendMatchRequest, setMatchActive, deleteMatchProfile } from "@/lib/actions/match";
import { Button, ButtonLink } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup } from "@/components/ui/radio-group";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import type { MatchPurpose, PetRow, Species } from "@/types/database";
import type { ActionResult } from "@/types/models";

export function RequestForm({ toPetId, toPetName, lookingFor, myPets, species }: { toPetId: string; toPetName: string; lookingFor: MatchPurpose; myPets: Pick<PetRow, "id" | "name" | "species" | "gender" | "birthday">[]; species: Species }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(sendMatchRequest, null);
  const toast = useToast();
  const router = useRouter();
  const [sent, setSent] = useState(false);
  useEffect(() => {
    if (state?.ok) { toast(state.message ?? "Sent"); setSent(true); router.refresh(); }
    else if (state && !state.ok) toast(state.error, "error");
  }, [state, toast, router]);

  if (!myPets.length) {
    return (
      <section className="space-y-3 rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-card)]">
        <p className="font-heading text-xl font-semibold">Add your {species} first</p>
        <p className="text-sm text-muted">Playdate requests are sent from your pet&apos;s profile, so {toPetName}&apos;s family knows who&apos;s coming.</p>
        <ButtonLink href="/pets/new" className="w-full">Add my {species}</ButtonLink>
      </section>
    );
  }
  if (sent) {
    return (
      <section className="rounded-[var(--radius-lg)] bg-primary p-5 text-on-primary">
        <PartyPopper className="h-7 w-7" aria-hidden />
        <p className="mt-2 font-heading text-xl font-semibold">Request sent!</p>
        <p className="mt-1 text-on-primary/90">You&apos;ll get a notification when {toPetName}&apos;s family replies. Contact is shared only if they say yes.</p>
        <ButtonLink href="/match/requests?tab=sent" variant="white" size="sm" className="mt-3">See my requests</ButtonLink>
      </section>
    );
  }

  const purposes = lookingFor === "both" ? ["playdate", "breeding"] : [lookingFor];
  return (
    <form action={action} className="space-y-4 rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-card)]">
      <p className="font-heading text-xl font-semibold">Say hi to {toPetName}</p>
      <input type="hidden" name="to_pet_id" value={toPetId} />
      <Select label="From" name="from_pet_id" options={myPets.map((p) => ({ value: p.id, label: p.name }))} />
      {purposes.length > 1 ? (
        <RadioGroup name="purpose" legend="Request for" defaultValue="playdate" options={[{ value: "playdate", label: "Playdate" }, { value: "breeding", label: "Breeding" }]} />
      ) : <input type="hidden" name="purpose" value={purposes[0]} />}
      <Textarea label="Message" name="message" maxLength={300} rows={3} placeholder={`Hi! Would ${toPetName} like to meet at the park this weekend?`} error={state && !state.ok ? state.fieldErrors?.message : undefined} />
      <Button type="submit" size="lg" variant="violet" className="w-full" loading={pending}>{!pending && <Send className="h-4 w-4" aria-hidden />} Request a playdate</Button>
      <p className="text-center text-xs font-semibold text-muted">WhatsApp unlocks only when both of you say yes.</p>
    </form>
  );
}

export function MatchOwnerActions({ id, active, petId }: { id: string; active: boolean; petId: string }) {
  const [pending, start] = useTransition();
  const [del, setDel] = useState(false);
  const router = useRouter();
  const toast = useToast();
  return (
    <section className="space-y-3 rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-card)]">
      <p className="font-heading text-xl font-semibold">This is your pet&apos;s profile</p>
      <p className="text-sm text-muted">{active ? "Visible to people near you." : "Paused. Nobody can find or request your pet."}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" loading={pending} onClick={() => start(async () => {
          const r = await setMatchActive(id, !active);
          toast(r.ok ? r.message ?? "Updated" : r.error, r.ok ? "success" : "error");
          router.refresh();
        })}>{active ? <><Pause className="h-4 w-4" aria-hidden /> Pause</> : <><Play className="h-4 w-4" aria-hidden /> Resume</>}</Button>
        <ButtonLink href={`/match/new?pet=${petId}`} variant="outline"><Pencil className="h-4 w-4" aria-hidden /> Edit</ButtonLink>
        <ButtonLink href="/match/requests" variant="soft">Requests</ButtonLink>
      </div>
      <div className="border-t border-border pt-3">
        <Button variant="danger-ghost" size="sm" onClick={() => setDel(true)}><Trash2 className="h-4 w-4" aria-hidden /> Remove profile</Button>
      </div>
      <ConfirmDialog open={del} onClose={() => setDel(false)} destructive title="Remove playdate profile?" description="Pending requests to this pet will be cancelled." confirmLabel="Remove" onConfirm={async () => {
        const r = await deleteMatchProfile(id);
        setDel(false);
        if (r.ok) { toast(r.message ?? "Removed"); router.push("/match"); } else toast(r.error, "error");
      }} />
    </section>
  );
}
