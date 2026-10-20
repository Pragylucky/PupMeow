import type { Metadata } from "next";
import { requireProfile, getPrivateProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isAiEnabled } from "@/lib/ai/config";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { FormPage } from "@/components/layout/page-layout";
import { TipCard } from "@/components/brand/bits";
import { MatchProfileForm } from "./match-profile-form";
import type { MatchProfileRow, PetRow } from "@/types/database";

export const metadata: Metadata = { title: "Playdate profile", robots: { index: false } };

export default async function NewMatchPage({ searchParams }: { searchParams: Promise<{ pet?: string }> }) {
  const sp = await searchParams;
  const profile = await requireProfile("/match/new");
  const priv = await getPrivateProfile();
  const supabase = await createClient();
  const [{ data: pets }, { data: profiles }] = await Promise.all([
    supabase.from("pets").select("*").eq("owner_id", profile.id).order("name"),
    supabase.from("pet_match_profiles").select("*").eq("owner_id", profile.id),
  ]);
  const list = (pets ?? []) as PetRow[];
  if (!list.length) {
    return <div className="mx-auto max-w-3xl"><EmptyState tone="card" art="dog" title="Add a pet first" description="Playdates use your pet's profile (species, breed, gender and birthday)." action={<ButtonLink href="/pets/new">Add a pet</ButtonLink>} /></div>;
  }
  return (
    <FormPage
      title="Playdate profile"
      description="Tell neighbours what your pet is like. Breeding needs a birthday on the pet profile and a minimum age of 18 months for dogs and 12 months for cats."
      rail={
        <TipCard tone="ink" title="No stud fees. Ever.">
          <p className="text-[0.95rem] font-semibold text-white/90">Payments, stud fees and puppy or kitten sales can&apos;t be arranged on Pupmeow. Profiles that ask for money are removed.</p>
        </TipCard>
      }
    >
      <MatchProfileForm userId={profile.id} pets={list} existing={(profiles ?? []) as MatchProfileRow[]} initialPetId={sp.pet} defaultArea={priv?.home_area ?? profile.area ?? ""} aiEnabled={isAiEnabled()} hasWhatsapp={Boolean(priv?.whatsapp)} />
    </FormPage>
  );
}
