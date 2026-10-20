"use client";

import { useActionState, useState } from "react";
import { savePet } from "@/lib/actions/pets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { RadioGroup } from "@/components/ui/radio-group";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUploader } from "@/components/features/upload/image-uploader";
import { FillWithAI } from "@/components/features/ai/fill-with-ai";
import { breedsFor } from "@/lib/constants";
import { todayIso } from "@/lib/utils";
import type { PetRow, Species } from "@/types/database";
import type { ActionResult } from "@/types/models";

export function PetForm({ userId, pet, aiEnabled }: { userId: string; pet?: PetRow; aiEnabled: boolean }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(savePet, null);
  const [photos, setPhotos] = useState<string[]>(pet?.photo_urls?.length ? pet.photo_urls : pet?.photo_url ? [pet.photo_url] : []);
  const [species, setSpecies] = useState<Species>(pet?.species ?? "dog");
  const [breed, setBreed] = useState(pet?.breed ?? "");
  const [birthday, setBirthday] = useState(pet?.birthday ?? "");
  const [breedKey, setBreedKey] = useState(0);
  const [aiNote, setAiNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};

  return (
    <form action={action} className="space-y-5" noValidate>
      {pet && <input type="hidden" name="id" value={pet.id} />}
      {state && !state.ok && <p role="alert" className="rounded-[var(--radius-md)] bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">{state.error}</p>}

      <ImageUploader bucket="pets" userId={userId} name="photo_urls" label="Photos" hint="Up to 6. The first one is the profile photo." max={6} value={photos} onChange={setPhotos} onUploadingChange={setUploading} />
      {aiEnabled && (
        <div className="flex flex-wrap items-center gap-3">
          <FillWithAI
            imageUrl={photos[0]}
            onResult={(r) => {
              if (r.species) setSpecies(r.species);
              if (r.breed) { setBreed(r.breed); setBreedKey((k) => k + 1); }
              if (!birthday && r.approx_age_months != null) {
                const d = new Date();
                d.setMonth(d.getMonth() - r.approx_age_months);
                setBirthday(d.toISOString().slice(0, 10));
              }
              setAiNote([r.color && `Colour: ${r.color}`, r.approx_age && `Age guess: ${r.approx_age}`].filter(Boolean).join(" · "));
            }}
          />
          {aiNote && <p className="text-xs text-muted">{aiNote}</p>}
        </div>
      )}

      <Input label="Name" name="name" required maxLength={40} defaultValue={pet?.name} error={fe.name} />
      <RadioGroup name="species" legend="Species" value={species} onChange={(v) => { setSpecies(v as Species); setBreedKey((k) => k + 1); }} options={[{ value: "dog", label: "Dog" }, { value: "cat", label: "Cat" }]} error={fe.species} />
      <Combobox key={`${species}-${breedKey}`} name="breed" label="Breed" options={breedsFor(species)} defaultValue={breed} onChange={setBreed} placeholder="Search breed" allowCustom error={fe.breed} />
      <RadioGroup name="gender" legend="Gender" defaultValue={pet?.gender ?? "unknown"} columns={3} options={[{ value: "male", label: "Boy" }, { value: "female", label: "Girl" }, { value: "unknown", label: "Not sure" }]} />
      <div className="grid gap-4 sm:grid-cols-2">
        <DatePicker label="Birthday" name="birthday" value={birthday} onChange={(e) => setBirthday(e.target.value)} max={todayIso()} hint="Approximate is fine" error={fe.birthday} />
        <Input label="Weight (kg)" name="weight_kg" type="number" inputMode="decimal" step="0.1" min="0.1" max="149" defaultValue={pet?.weight_kg ?? ""} error={fe.weight_kg} />
      </div>
      <Checkbox name="is_neutered" label="Neutered / spayed" defaultChecked={pet?.is_neutered} />
      <Textarea label="About" name="bio" maxLength={300} rows={3} defaultValue={pet?.bio ?? ""} placeholder="Loves belly rubs, scared of Diwali crackers…" error={fe.bio} />
      <Button type="submit" size="lg" className="w-full sm:w-auto" loading={pending} disabled={uploading}>
        {pet ? "Save changes" : "Add pet"}
      </Button>
    </form>
  );
}
