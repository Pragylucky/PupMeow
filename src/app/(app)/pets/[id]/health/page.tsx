import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isAiAssistantEnabled } from "@/lib/ai/config";
import { HealthDashboard } from "@/components/features/pets/health-dashboard";
import { WithRail } from "@/components/layout/page-layout";
import { Steps, TipCard } from "@/components/brand/bits";
import { PetImage } from "@/components/brand/pet-image";
import { AI_DISCLAIMER } from "@/lib/constants";
import { formatAge } from "@/lib/utils";
import type { HealthRecordRow, HealthRecordType, PetRow } from "@/types/database";

export const metadata: Metadata = { title: "Health records", robots: { index: false } };

export default async function HealthPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const t = (await searchParams).tab;
  const profile = await requireProfile(`/pets/${id}/health`);
  const supabase = await createClient();
  const { data: pet } = await supabase.from("pets").select("*").eq("id", id).eq("owner_id", profile.id).maybeSingle();
  if (!pet) notFound();
  const { data: records } = await supabase.from("pet_health_records").select("*").eq("pet_id", id).order("date", { ascending: false });
  const p = pet as PetRow;
  const initialTab = (["vaccination", "medication", "vet_visit", "weight"].includes(t ?? "") ? t : "all") as HealthRecordType | "all";
  return (
    <WithRail
      rail={
        <TipCard tone="care" title="At the vet">
          <Steps items={["Show this page instead of carrying papers.", "Snap the certificate and attach it to the record.", "Ask when the next dose is due and add it."]} />
        </TipCard>
      }
    >
      <Link href={`/pet/${p.id}`} className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-muted hover:text-text"><ChevronLeft className="h-4 w-4" aria-hidden /> {p.name}</Link>
      <div className="mb-5 flex items-center gap-4">
        <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-lg)]"><PetImage src={p.photo_url} alt={p.name} species={p.species} hints={[p.breed]} seed={p.id} sizes="64px" /></span>
        <div>
          <h1 className="text-[2rem] font-semibold leading-tight sm:text-[2.4rem]">{p.name}&apos;s health</h1>
          <p className="text-muted">{[p.breed ?? (p.species === "dog" ? "Dog" : "Cat"), formatAge(p.birthday)].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      <HealthDashboard pet={p} records={(records ?? []) as HealthRecordRow[]} userId={profile.id} aiEnabled={isAiAssistantEnabled()} disclaimer={AI_DISCLAIMER} initialTab={initialTab} />
    </WithRail>
  );
}
