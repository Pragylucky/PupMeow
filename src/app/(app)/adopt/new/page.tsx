import type { Metadata } from "next";
import { requireProfile, getPrivateProfile } from "@/lib/auth";
import { isAiAssistantEnabled } from "@/lib/ai/config";
import { NO_SALES_NOTICE } from "@/lib/constants";
import { FormPage } from "@/components/layout/page-layout";
import { Steps, TipCard } from "@/components/brand/bits";
import { AdoptionForm } from "./adoption-form";

export const metadata: Metadata = { title: "List a pet for adoption", robots: { index: false } };

export default async function NewAdoptionPage() {
  const profile = await requireProfile("/adopt/new");
  const priv = await getPrivateProfile();
  return (
    <FormPage
      title="List a pet for adoption"
      description={<span className="inline-block rounded-[var(--radius-md)] bg-secondary px-3 py-2 font-bold text-ink">{NO_SALES_NOTICE}</span>}
      rail={
        <TipCard tone="adopt" title="Listings that get adopted">
          <Steps tone="dark" items={["Bright photos in daylight, at the pet's eye level.", "Personality first: playful, calm, good with kids or cats?", "Be honest about health and needs."]} />
        </TipCard>
      }
    >
      <AdoptionForm userId={profile.id} aiEnabled={isAiAssistantEnabled()} defaultArea={priv?.home_area ?? profile.area ?? ""} defaultPhone={priv?.whatsapp ?? ""} />
    </FormPage>
  );
}
