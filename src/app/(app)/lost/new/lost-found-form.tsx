"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createLostFound } from "@/lib/actions/lost";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { RadioGroup } from "@/components/ui/radio-group";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/components/ui/toast";
import { ImageUploader } from "@/components/features/upload/image-uploader";
import { FillWithAI } from "@/components/features/ai/fill-with-ai";
import { WriteForMe } from "@/components/features/ai/write-for-me";
import { NCR_AREAS, breedsFor } from "@/lib/constants";
import type { Species } from "@/types/database";
import type { ActionResult } from "@/types/models";

function nowLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export interface LostPrefill { petName: string; species: Species; breed: string | null; gender: "male" | "female" | "unknown"; photos: string[] }

export function LostFoundForm({ userId, aiEnabled, defaultType, defaultArea, defaultPhone, prefill }: { userId: string; aiEnabled: boolean; defaultType: "lost" | "found"; defaultArea: string; defaultPhone: string; prefill?: LostPrefill }) {
  const [state, action, pending] = useActionState<ActionResult<string> | null, FormData>(createLostFound, null);
  const [type, setType] = useState(defaultType);
  const [photos, setPhotos] = useState<string[]>(prefill?.photos.slice(0, 6) ?? []);
  const [species, setSpecies] = useState<Species>(prefill?.species ?? "dog");
  const [breed, setBreed] = useState(prefill?.breed ?? "");
  const [color, setColor] = useState("");
  const [desc, setDesc] = useState("");
  const [area, setArea] = useState(defaultArea);
  const [k, setK] = useState(0);
  const [uploading, setUploading] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const toast = useToast();
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};

  useEffect(() => {
    if (state?.ok && state.data) { toast("Report published. Share it widely!"); router.push(`/lost/${state.data}?new=1`); }
  }, [state, router, toast]);

  // datetime-local has no timezone; send it as an ISO string from the user's clock.
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const el = e.currentTarget.elements.namedItem("last_seen_local") as HTMLInputElement | null;
    const hidden = e.currentTarget.elements.namedItem("last_seen_date") as HTMLInputElement | null;
    if (el && hidden) hidden.value = el.value ? new Date(el.value).toISOString() : "";
  };

  return (
    <form ref={form} action={action} onSubmit={onSubmit} className="space-y-5" noValidate>
      {state && !state.ok && <p role="alert" className="rounded-[var(--radius-md)] bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">{state.error}</p>}
      <RadioGroup name="type" legend="What happened?" value={type} onChange={(v) => setType(v as "lost" | "found")} options={[
        { value: "lost", label: "I lost my pet", description: "Your pet is missing" },
        { value: "found", label: "I found a pet", description: "You're keeping a pet safe" },
      ]} />

      <ImageUploader bucket="lost-found" userId={userId} name="photo_urls" label="Photos" hint="Clear, recent photos help most. Up to 6." max={6} value={photos} onChange={setPhotos} onUploadingChange={setUploading} error={fe.photo_urls} />
      {aiEnabled && (
        <FillWithAI imageUrl={photos[0]} onResult={(r) => {
          if (r.species) setSpecies(r.species);
          if (r.breed) setBreed(r.breed);
          if (r.color) setColor(r.color);
          if (!desc && r.description) setDesc(r.description);
          setK((x) => x + 1);
        }} />
      )}

      <Input label={type === "lost" ? "Pet's name" : "Name on collar (if any)"} name="pet_name" maxLength={40} required={type === "lost"} defaultValue={prefill?.petName} error={fe.pet_name} />
      <RadioGroup name="species" legend="Species" value={species} onChange={(v) => { setSpecies(v as Species); setK((x) => x + 1); }} options={[{ value: "dog", label: "Dog" }, { value: "cat", label: "Cat" }]} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Combobox key={`b-${species}-${k}`} name="breed" label="Breed" options={breedsFor(species)} defaultValue={breed} onChange={setBreed} allowCustom placeholder="e.g. Indie / Desi" />
        <Input key={`c-${k}`} label="Colour & markings" name="color" maxLength={60} defaultValue={color} onChange={(e) => setColor(e.target.value)} placeholder="Brown with white chest" />
      </div>
      <RadioGroup name="gender" legend="Gender" defaultValue={prefill?.gender ?? "unknown"} columns={3} options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "unknown", label: "Not sure" }]} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Combobox name="last_seen_area" label={type === "lost" ? "Last seen area" : "Found in area"} options={NCR_AREAS} defaultValue={area} onChange={setArea} required allowCustom error={fe.last_seen_area} />
        <Input label="Landmark" name="landmark" maxLength={120} placeholder="Near Sector 10 metro, gate 2" />
      </div>
      <DatePicker withTime label={type === "lost" ? "Last seen on" : "Found on"} name="last_seen_local" defaultValue={nowLocal()} max={nowLocal()} required error={fe.last_seen_date} />
      <input type="hidden" name="last_seen_date" />

      <Textarea
        key={`d-${k}`}
        label="Description"
        name="description"
        maxLength={1500}
        rows={5}
        required
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder={type === "lost" ? "Collar, temperament, what to do if seen (don't chase, call me)…" : "Where you found them, their condition, where they are now…"}
        error={fe.description}
        action={aiEnabled ? <WriteForMe kind={type === "lost" ? "lost_description" : "found_description"} getDetails={() => [`Species: ${species}`, breed && `Breed: ${breed}`, color && `Colour: ${color}`, area && `Area: ${area}`, desc].filter(Boolean).join("\n")} onDraft={setDesc} /> : undefined}
      />
      {type === "lost" && <Input label="Reward (optional)" name="reward_text" maxLength={80} placeholder="₹5,000 reward" error={fe.reward_text} />}

      <fieldset className="space-y-3 rounded-[var(--radius-lg)] border-2 border-border p-4">
        <legend className="px-1 font-heading text-lg font-medium">How should people reach you?</legend>
        <RadioGroup name="contact_method" legend="Contact method" legendHidden defaultValue="whatsapp" options={[{ value: "whatsapp", label: "WhatsApp" }, { value: "phone", label: "Phone call" }]} />
        <Input label="Mobile number" name="contact_value" type="tel" inputMode="tel" autoComplete="tel" defaultValue={defaultPhone} placeholder="98XXXXXXXX" required error={fe.contact_value} hint="Visible only to signed-in members who tap Contact." />
      </fieldset>

      <Button type="submit" size="lg" className="w-full sm:w-auto" loading={pending} disabled={uploading}>
        {uploading ? "Uploading photos…" : type === "lost" ? "Publish lost report" : "Publish found report"}
      </Button>
    </form>
  );
}
