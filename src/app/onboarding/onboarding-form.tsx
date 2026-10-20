"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AtSign, Check, X } from "lucide-react";
import { completeOnboarding, checkUsername } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { RadioGroup } from "@/components/ui/radio-group";
import { DatePicker } from "@/components/ui/date-picker";
import { ImageUploader } from "@/components/features/upload/image-uploader";
import { NCR_AREAS, breedsFor } from "@/lib/constants";
import { cn, todayIso } from "@/lib/utils";
import type { ActionResult } from "@/types/models";

export function OnboardingForm({ userId, defaults }: { userId: string; defaults: { display_name: string; username: string; avatar_url: string | null } }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(completeOnboarding, null);
  const [username, setUsername] = useState(defaults.username);
  const [check, setCheck] = useState<{ available: boolean; message: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [hasPets, setHasPets] = useState<"yes" | "no">("no");
  const [petSpecies, setPetSpecies] = useState<"dog" | "cat">("dog");
  const [uploading, setUploading] = useState(false);
  const seq = useRef(0);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};

  useEffect(() => {
    const value = username.trim().toLowerCase();
    if (value.length < 3) { setCheck(null); return; }
    const my = ++seq.current;
    setChecking(true);
    const t = setTimeout(async () => {
      const res = await checkUsername(value);
      if (my === seq.current) { setCheck(res); setChecking(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [username]);

  return (
    <form action={action} className="space-y-6" noValidate>
      {state && !state.ok && <p role="alert" className="rounded-[var(--radius-md)] bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">{state.error}</p>}

      <ImageUploader bucket="avatars" userId={userId} name="avatar_url" label="Profile photo" hint="Optional — a photo of you or your pet" max={1} shape="circle" value={defaults.avatar_url ? [defaults.avatar_url] : []} onUploadingChange={setUploading} />

      <div>
        <Input
          label="Username"
          name="username"
          required
          autoCapitalize="none"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
          maxLength={20}
          leading={<AtSign className="h-4 w-4" />}
          error={fe.username}
          hint="3–20 letters, numbers or underscores"
        />
        {!fe.username && check && (
          <p className={cn("mt-1 flex items-center gap-1 text-xs font-bold", check.available ? "text-success" : "text-danger")} aria-live="polite">
            {check.available ? <Check className="h-3.5 w-3.5" aria-hidden /> : <X className="h-3.5 w-3.5" aria-hidden />}
            {checking ? "Checking…" : check.message}
          </p>
        )}
      </div>

      <Input label="Your name" name="display_name" required defaultValue={defaults.display_name} maxLength={50} autoComplete="name" error={fe.display_name} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="City" name="city" value="Delhi NCR" readOnly hint="More cities soon" />
        <Combobox name="area" label="Area" options={NCR_AREAS} placeholder="Search your area" required error={fe.area} allowCustom />
      </div>

      <Textarea label="Short bio" name="bio" maxLength={200} rows={3} placeholder="Indie mom to Bruno 🐶 · Dwarka evening walks" error={fe.bio} />

      <RadioGroup
        name="species_pref"
        legend="What do you want to see?"
        defaultValue="both"
        options={[
          { value: "dog", label: "Dogs" },
          { value: "cat", label: "Cats" },
          { value: "both", label: "Both" },
        ]}
      />

      <RadioGroup
        name="add_pet"
        legend="Do you have pets?"
        value={hasPets}
        onChange={(v) => setHasPets(v as "yes" | "no")}
        options={[
          { value: "yes", label: "Yes, add one now" },
          { value: "no", label: "Not right now" },
        ]}
      />

      {hasPets === "yes" && (
        <fieldset className="space-y-4 rounded-[var(--radius-lg)] bg-cream p-4 text-ink sm:p-5">
          <legend className="sr-only">Your pet</legend>
          <p className="font-heading text-xl font-semibold">Your pet</p>
          <Input label="Pet's name" name="pet_name" required maxLength={40} error={fe.pet_name} />
          <RadioGroup
            name="pet_species"
            legend="Species"
            value={petSpecies}
            onChange={(v) => setPetSpecies(v as "dog" | "cat")}
            options={[{ value: "dog", label: "Dog" }, { value: "cat", label: "Cat" }]}
          />
          <Combobox key={petSpecies} name="pet_breed" label="Breed" options={breedsFor(petSpecies)} placeholder="Search breed" allowCustom />
          <div className="grid gap-4 sm:grid-cols-2">
            <RadioGroup name="pet_gender" legend="Gender" defaultValue="unknown" columns={3} options={[{ value: "male", label: "Boy" }, { value: "female", label: "Girl" }, { value: "unknown", label: "?" }]} />
            <DatePicker label="Birthday" name="pet_birthday" max={todayIso()} hint="Approximate is fine" error={fe.pet_birthday} />
          </div>
          <p className="text-xs text-muted">You can add photos, weight and health records from My Pets.</p>
        </fieldset>
      )}

      <Button type="submit" size="lg" className="w-full" loading={pending} disabled={uploading || (check !== null && !check.available)}>
        {uploading ? "Uploading photo…" : "Finish and say hi to the neighbourhood"}
      </Button>
    </form>
  );
}
