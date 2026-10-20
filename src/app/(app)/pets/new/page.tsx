import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { isAiAssistantEnabled } from "@/lib/ai/config";
import { FormPage } from "@/components/layout/page-layout";
import { TipCard } from "@/components/brand/bits";
import { PetForm } from "@/components/features/pets/pet-form";

export const metadata: Metadata = { title: "Add a pet", robots: { index: false } };

export default async function NewPetPage() {
  const profile = await requireProfile("/pets/new");
  return (
    <FormPage
      title="Add a pet"
      description="A profile for your dog or cat: photos, birthday and health records in one place."
      rail={
        <TipCard tone="play" title="Why add a pet?">
          <ul className="space-y-2 text-[0.95rem] font-semibold text-white/90">
            <li>Vaccine reminders you can add to your calendar.</li>
            <li>A lost-pet report filled in for you in one tap.</li>
            <li>Birthday wishes from the neighbourhood 🎂</li>
          </ul>
        </TipCard>
      }
    >
      <PetForm userId={profile.id} aiEnabled={isAiAssistantEnabled()} />
    </FormPage>
  );
}
