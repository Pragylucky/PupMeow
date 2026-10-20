"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveMatchProfile } from "@/lib/actions/match";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { RadioGroup } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { ImageUploader } from "@/components/features/upload/image-uploader";
import { WriteForMe } from "@/components/features/ai/write-for-me";
import { BREEDING_MIN_MONTHS, NCR_AREAS } from "@/lib/constants";
import { ageInMonths } from "@/lib/utils";
import type { MatchProfileRow, PetRow } from "@/types/database";
import type { ActionResult } from "@/types/models";

export function MatchProfileForm({ userId, pets, existing, initialPetId, defaultArea, aiEnabled, hasWhatsapp }: { userId: string; pets: PetRow[]; existing: MatchProfileRow[]; initialPetId?: string; defaultArea: string; aiEnabled: boolean; hasWhatsapp: boolean }) {
  const [state, action, pending] = useActionState<ActionResult<string> | null, FormData>(saveMatchProfile, null);
  const [petId, setPetId] = useState(pets.find((p) => p.id === initialPetId)?.id ?? pets[0].id);
  const pet = pets.find((p) => p.id === petId)!;
  const current = existing.find((e) => e.pet_id === petId);
  const [about, setAbout] = useState(current?.about ?? "");
  const [purpose, setPurpose] = useState<string>(current?.looking_for ?? "playdate");
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  const months = ageInMonths(pet.birthday);
  const minMonths = BREEDING_MIN_MONTHS[pet.species];
  const breedingBlocked = months === null || months < minMonths;

  useEffect(() => { setAbout(current?.about ?? ""); setPurpose(current?.looking_for ?? "playdate"); }, [petId, current]);
  useEffect(() => { if (state?.ok && state.data) { toast("Match profile saved"); router.push(`/match/${state.data}`); } }, [state, router, toast]);

  return (
    <form action={action} className="space-y-5" key={petId} noValidate>
      {state && !state.ok && <p role="alert" className="rounded-[var(--radius-md)] bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">{state.error}</p>}
      {!hasWhatsapp && <p className="rounded-[var(--radius-md)] bg-warning-soft px-3 py-2 text-sm font-semibold text-warning">Add your WhatsApp number in <Link href="/settings" className="underline">Settings</Link> so accepted matches can reach you.</p>}
      <Select label="Which pet?" name="pet_id" value={petId} onChange={(e) => setPetId(e.target.value)} options={pets.map((p) => ({ value: p.id, label: `${p.name}${existing.some((x) => x.pet_id === p.id) ? " (has profile)" : ""}` }))} />
      <RadioGroup name="looking_for" legend="Looking for" value={purpose} onChange={setPurpose} options={[
        { value: "playdate", label: "Playdates" },
        { value: "breeding", label: "Breeding", description: breedingBlocked ? `Needs birthday & ${minMonths}+ months` : undefined },
        { value: "both", label: "Both" },
      ]} error={fe.looking_for} />
      {purpose !== "playdate" && breedingBlocked && (
        <p className="text-sm font-semibold text-danger">
          {months === null ? `Add ${pet.name}'s birthday on the pet profile first.` : `${pet.name} is ${months} months old. Breeding is allowed from ${minMonths} months for ${pet.species}s.`}{" "}
          <Link href={`/pets/${pet.id}/edit`} className="underline">Edit pet</Link>
        </p>
      )}
      <ImageUploader bucket="matchmaking" userId={userId} name="photo_urls" label="Photos" max={6} value={current?.photo_urls ?? []} onUploadingChange={setUploading} error={fe.photo_urls} hint="Up to 6 recent photos" />
      <Textarea label="About" name="about" required maxLength={500} rows={4} value={about} onChange={(e) => setAbout(e.target.value)} error={fe.about}
        placeholder="Temperament, energy level, what kind of playmate you're looking for…"
        action={aiEnabled ? <WriteForMe kind="match_about" getDetails={() => [`${pet.name}, ${pet.breed ?? pet.species}, ${pet.gender}`, `Looking for: ${purpose}`, about].join("\n")} onDraft={setAbout} /> : undefined} />
      <Combobox name="area" label="Area" options={NCR_AREAS} defaultValue={current?.area ?? defaultArea} required allowCustom error={fe.area} />
      <Checkbox name="has_papers" label="Has papers (KCI / registration)" defaultChecked={current?.has_papers} />
      <ImageUploader bucket="documents" userId={userId} name="health_doc_path" label="Health certificate (optional, private)" hint="Only you can see this file. Photo or PDF." max={1} value={current?.health_doc_path ? [current.health_doc_path] : []} onUploadingChange={setUploading} />
      <Checkbox name="health_confirmed" label="My pet is vaccinated and healthy" description="Required. Be honest — it protects every pet involved." defaultChecked={current?.health_confirmed} error={fe.health_confirmed} />
      <p className="rounded-[var(--radius-md)] bg-surface-2 px-3 py-2 text-xs text-muted">No payments, stud fees or puppy/kitten sales may be arranged through Pupmeow. Violations lead to removal and suspension.</p>
      <Button type="submit" size="lg" loading={pending} disabled={uploading}>{current ? "Update match profile" : "Publish match profile"}</Button>
    </form>
  );
}
