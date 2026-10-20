"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createAdoption } from "@/lib/actions/adoptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { RadioGroup } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { ImageUploader } from "@/components/features/upload/image-uploader";
import { FillWithAI } from "@/components/features/ai/fill-with-ai";
import { WriteForMe } from "@/components/features/ai/write-for-me";
import { NCR_AREAS, breedsFor } from "@/lib/constants";
import type { Species } from "@/types/database";
import type { ActionResult } from "@/types/models";

export function AdoptionForm({ userId, aiEnabled, defaultArea, defaultPhone }: { userId: string; aiEnabled: boolean; defaultArea: string; defaultPhone: string }) {
  const [state, action, pending] = useActionState<ActionResult<string> | null, FormData>(createAdoption, null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [species, setSpecies] = useState<Species>("dog");
  const [breed, setBreed] = useState("");
  const [ageText, setAgeText] = useState("");
  const [ageMonths, setAgeMonths] = useState("");
  const [desc, setDesc] = useState("");
  const [name, setName] = useState("");
  const [isNgo, setIsNgo] = useState(false);
  const [k, setK] = useState(0);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};

  useEffect(() => {
    if (state?.ok && state.data) { toast("Listing published 💛"); router.push(`/adopt/${state.data}?new=1`); }
  }, [state, router, toast]);

  return (
    <form action={action} className="space-y-5" noValidate>
      {state && !state.ok && <p role="alert" className="rounded-[var(--radius-md)] bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">{state.error}</p>}
      <ImageUploader bucket="adoptions" userId={userId} name="photo_urls" label="Photos" hint="Bright, clear photos get pets adopted faster. Up to 6." max={6} value={photos} onChange={setPhotos} onUploadingChange={setUploading} error={fe.photo_urls} />
      {aiEnabled && (
        <FillWithAI imageUrl={photos[0]} onResult={(r) => {
          if (r.species) setSpecies(r.species);
          if (r.breed) setBreed(r.breed);
          if (r.approx_age) setAgeText(r.approx_age);
          if (r.approx_age_months != null) setAgeMonths(String(r.approx_age_months));
          setK((x) => x + 1);
        }} />
      )}
      <Input label="Pet's name" name="pet_name" required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} error={fe.pet_name} />
      <RadioGroup name="species" legend="Species" value={species} onChange={(v) => { setSpecies(v as Species); setK((x) => x + 1); }} options={[{ value: "dog", label: "Dog" }, { value: "cat", label: "Cat" }]} />
      <Combobox key={`b-${species}-${k}`} name="breed" label="Breed" options={breedsFor(species)} defaultValue={breed} onChange={setBreed} allowCustom placeholder="Indie / Desi" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Approximate age" name="age_text" required maxLength={30} value={ageText} onChange={(e) => setAgeText(e.target.value)} placeholder="About 4 months" error={fe.age_text} />
        <Input label="Age in months (for filters)" name="age_months" type="number" inputMode="numeric" min={0} max={360} value={ageMonths} onChange={(e) => setAgeMonths(e.target.value)} hint="Optional" />
      </div>
      <RadioGroup name="gender" legend="Gender" defaultValue="unknown" columns={3} options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "unknown", label: "Not sure" }]} />
      <div className="flex flex-wrap gap-6">
        <Checkbox name="vaccinated" label="Vaccinated" />
        <Checkbox name="neutered" label="Sterilised / neutered" />
      </div>
      <Textarea label="About this pet" name="description" required maxLength={2000} rows={6} value={desc} onChange={(e) => setDesc(e.target.value)} error={fe.description}
        placeholder="Personality, health, good with kids/cats?, what kind of home would suit…"
        action={aiEnabled ? <WriteForMe kind="adoption_description" getDetails={() => [`Name: ${name}`, `Species: ${species}`, breed && `Breed: ${breed}`, ageText && `Age: ${ageText}`, desc].filter(Boolean).join("\n")} onDraft={setDesc} /> : undefined} />
      <Combobox name="area" label="Area" options={NCR_AREAS} defaultValue={defaultArea} required allowCustom error={fe.area} />
      <Switch name="is_ngo" label="I'm posting for an NGO or shelter" checked={isNgo} onCheckedChange={setIsNgo} />
      {isNgo && <Input label="NGO / shelter name" name="org_name" required maxLength={80} error={fe.org_name} />}
      <fieldset className="space-y-3 rounded-[var(--radius-lg)] border-2 border-border p-4">
        <legend className="px-1 font-heading text-lg font-medium">Contact for adopters</legend>
        <RadioGroup name="contact_method" legend="Contact method" legendHidden defaultValue="whatsapp" options={[{ value: "whatsapp", label: "WhatsApp" }, { value: "phone", label: "Phone call" }]} />
        <Input label="Mobile number" name="contact_value" type="tel" inputMode="tel" defaultValue={defaultPhone} required placeholder="98XXXXXXXX" error={fe.contact_value} hint="Shown only to signed-in members who tap “I'm interested”." />
      </fieldset>
      <Checkbox name="no_sale_ack" label="This is a free adoption" description="I'm not asking for money, a price or a rehoming fee. I understand paid sales are removed and may get my account suspended." error={fe.no_sale_ack} />
      <Button type="submit" size="lg" loading={pending} disabled={uploading}>{uploading ? "Uploading photos…" : "Publish listing"}</Button>
    </form>
  );
}
