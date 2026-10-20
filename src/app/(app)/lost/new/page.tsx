import type { Metadata } from "next";
import { requireProfile, getPrivateProfile } from "@/lib/auth";
import { isAiAssistantEnabled } from "@/lib/ai/config";
import { FormPage } from "@/components/layout/page-layout";
import { Steps, TipCard } from "@/components/brand/bits";
import { createClient } from "@/lib/supabase/server";
import { LostFoundForm, type LostPrefill } from "./lost-found-form";
import type { PetRow } from "@/types/database";

export const metadata: Metadata = { title: "Report a lost or found pet", robots: { index: false } };

export default async function NewLostPage({ searchParams }: { searchParams: Promise<{ type?: string; pet?: string }> }) {
  const sp = await searchParams;
  const profile = await requireProfile("/lost/new");
  const priv = await getPrivateProfile();
  let prefill: LostPrefill | undefined;
  if (sp.pet && /^[0-9a-f-]{36}$/i.test(sp.pet)) {
    const supabase = await createClient();
    const { data } = await supabase.from("pets").select("*").eq("id", sp.pet).eq("owner_id", profile.id).maybeSingle();
    const pet = data as PetRow | null;
    if (pet) prefill = { petName: pet.name, species: pet.species, breed: pet.breed, gender: pet.gender, photos: pet.photo_urls?.length ? pet.photo_urls : pet.photo_url ? [pet.photo_url] : [] };
  }
  return (
    <FormPage
      title={prefill ? `${prefill.petName} is missing` : "Report a lost or found pet"}
      description="People in the same area get an alert. Your number is shown only to signed-in members who tap Call or WhatsApp."
      rail={
        <>
          <TipCard tone="lost" title="Photos that help">
            <Steps items={["A clear, recent photo of the face.", "One full-body photo showing colour and markings.", "Collar, tag or anything unusual."]} />
          </TipCard>
          <TipCard tone="ink" title="Stay safe">
            <ul className="space-y-2 text-[0.95rem] font-semibold text-white/90">
              <li>Share the area or a landmark, never your home address.</li>
              <li>Before handing over a found pet, ask for a photo of them at home.</li>
              <li>Ignore anyone who asks for money to &quot;return&quot; a pet.</li>
            </ul>
          </TipCard>
        </>
      }
    >
      <LostFoundForm userId={profile.id} aiEnabled={isAiAssistantEnabled()} defaultType={sp.type === "found" ? "found" : "lost"} defaultArea={priv?.home_area ?? profile.area ?? ""} defaultPhone={priv?.whatsapp ?? ""} prefill={prefill} />
    </FormPage>
  );
}
