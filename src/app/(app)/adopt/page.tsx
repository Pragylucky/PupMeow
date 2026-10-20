import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getPrivateProfile, getUser } from "@/lib/auth";
import { getSpeciesPref } from "@/lib/species-server";
import { speciesIn } from "@/lib/species";
import { ADOPTION_COLUMNS } from "@/lib/columns";
import { NCR_AREAS } from "@/lib/constants";
import { SpeciesToggle } from "@/components/features/species/species-toggle";
import { AdoptionCard } from "@/components/features/listings/listing-cards";
import { ListingFilters } from "@/components/features/listings/listing-filters";
import { WithRail } from "@/components/layout/page-layout";
import { SectionTitle, Steps, TipCard } from "@/components/brand/bits";
import { PetArt } from "@/components/brand/pet-art";
import { FilterChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { shortArea } from "@/lib/utils";
import type { AdoptionRow } from "@/types/database";

export const metadata: Metadata = {
  title: "Adopt a dog or cat in Delhi NCR",
  description: "Free adoption of Indies, rescues and pets needing a new home across Delhi NCR, from families and NGOs. No sales, ever.",
};

const AGE: Record<string, [number, number]> = { young: [0, 11], adult: [12, 95], senior: [96, 360] };

export default async function AdoptPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const species = await getSpeciesPref();
  const user = await getUser();
  const [profile, priv] = user ? await Promise.all([getCurrentProfile(), getPrivateProfile()]) : [null, null];
  const viewerArea = priv?.home_area ?? profile?.area ?? null;
  const supabase = await createClient();
  const mine = Boolean(user && sp.mine === "1");

  let q = supabase.from("adoptions").select(ADOPTION_COLUMNS).order("created_at", { ascending: false }).limit(60);
  if (mine) q = q.eq("author_id", user!.id);
  else q = q.eq("status", "available").in("species", speciesIn(species));
  const areaQ = sp.near === "1" && viewerArea ? shortArea(viewerArea) : sp.area;
  if (areaQ) q = q.ilike("area", `%${areaQ.replace(/[%_,()]/g, "").slice(0, 60)}%`);
  if (sp.gender === "male" || sp.gender === "female") q = q.eq("gender", sp.gender);
  if (sp.vaccinated === "yes") q = q.eq("vaccinated", true);
  if (sp.neutered === "yes") q = q.eq("neutered", true);
  if (sp.age && AGE[sp.age]) q = q.gte("age_months", AGE[sp.age][0]).lte("age_months", AGE[sp.age][1]);
  const [{ data }, { data: happy }] = await Promise.all([
    q,
    supabase.from("adoptions").select(ADOPTION_COLUMNS).eq("status", "adopted").in("species", speciesIn(species)).order("adopted_at", { ascending: false }).limit(6),
  ]);
  const items = (data ?? []) as AdoptionRow[];
  const tails = (happy ?? []) as AdoptionRow[];

  const toggle = (key: string, value: string) => {
    const p = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    if (p.get(key) === value) p.delete(key); else p.set(key, value);
    return `/adopt?${p.toString()}`;
  };

  return (
    <WithRail
      rail={
        <>
          <TipCard tone="adopt" title="How adoption works">
            <Steps tone="dark" items={["Say hi and share a bit about your home.", "Meet the pet and the foster in person.", "Take them home. Free, always."]} />
          </TipCard>
          <TipCard tone="ink" title="Spot a scam">
            <ul className="space-y-2 text-[0.95rem] font-semibold text-white/90">
              <li>Never pay a &quot;transport fee&quot;, deposit or vaccination charge in advance.</li>
              <li>Real fosters always let you meet the pet first.</li>
              <li>See a price? Tap ⋯ and report it. We remove it fast.</li>
            </ul>
          </TipCard>
          <TipCard tone="care" title="Rescuer or NGO?">
            <p className="text-[0.95rem] font-semibold text-white/90">List your dogs and cats for free, with your organisation&apos;s name on every listing.</p>
            {user && <ButtonLink href="/adopt/new" variant="white" size="sm" className="mt-3"><Plus className="h-4 w-4" aria-hidden /> List a pet</ButtonLink>}
          </TipCard>
        </>
      }
    >
      <section className="relative mb-5 overflow-hidden rounded-[var(--radius-xl)] bg-secondary p-5 text-ink sm:p-7">
        <div className="relative max-w-xl">
          <h1 className="text-[2.3rem] font-bold leading-none sm:text-[2.9rem]">Always free.<br />Never sold.</h1>
          <p className="mt-2 text-[1.02rem] font-semibold text-ink/80">Indies, desi cats and rescues from families and NGOs across Delhi NCR. No prices and no &quot;rehoming fees&quot;, ever.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {user ? (
              <>
                <ButtonLink href="/adopt/new"><Plus className="h-4 w-4" aria-hidden /> List a pet</ButtonLink>
                <ButtonLink href={mine ? "/adopt" : "/adopt?mine=1"} variant="white">{mine ? "All listings" : "My listings"}</ButtonLink>
              </>
            ) : (
              <ButtonLink href="/login?next=/adopt/new">Join free to list a pet</ButtonLink>
            )}
          </div>
        </div>
        <div className="pointer-events-none absolute -bottom-2 right-4 hidden items-end sm:flex" aria-hidden>
          <PetArt pet={{ species: "cat", look: "orange" }} className="h-28 w-28" />
          <PetArt pet={{ species: "dog", look: "dalmatian" }} className="-ml-6 h-36 w-36" />
        </div>
      </section>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Quick filters" className="no-scrollbar flex gap-2 overflow-x-auto">
          {viewerArea && <FilterChip href={toggle("near", "1")} active={sp.near === "1"}>Near {shortArea(viewerArea)}</FilterChip>}
          <FilterChip href={toggle("age", "young")} active={sp.age === "young"}>{species === "cat" ? "Kittens" : species === "dog" ? "Puppies" : "Puppies & kittens"}</FilterChip>
          <FilterChip href={toggle("vaccinated", "yes")} active={sp.vaccinated === "yes"}>Vaccinated</FilterChip>
          <FilterChip href={toggle("neutered", "yes")} active={sp.neutered === "yes"}>Sterilised</FilterChip>
        </nav>
        <SpeciesToggle compact />
      </div>
      <ListingFilters basePath="/adopt" areas={NCR_AREAS} area={sp.area} hidden={Object.fromEntries(Object.entries(sp).filter(([k, v]) => v && ["near", "vaccinated", "neutered", "mine"].includes(k)) as [string, string][])} extra={[
        { name: "age", label: "Age", value: sp.age ?? "", options: [{ value: "", label: "any" }, { value: "young", label: "Puppy / kitten" }, { value: "adult", label: "Adult (1–8 yrs)" }, { value: "senior", label: "Senior (8+)" }] },
        { name: "gender", label: "Gender", value: sp.gender ?? "", options: [{ value: "", label: "any" }, { value: "male", label: "Male" }, { value: "female", label: "Female" }] },
      ]} />
      {items.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map((i) => <AdoptionCard key={i.id} item={i} viewerArea={viewerArea} />)}</div>
      ) : (
        <EmptyState tone="card" art="heart" title={mine ? "You haven't listed a pet yet" : "No pets match these filters"} description={mine ? "Fostering a dog or cat? List them for free." : "Try clearing filters, or check back soon. New listings come in every week."} action={mine ? <ButtonLink href="/adopt/new">List a pet</ButtonLink> : <ButtonLink href="/adopt" variant="outline">Clear filters</ButtonLink>} />
      )}

      {tails.length > 0 && !mine && (
        <section aria-labelledby="tails" className="mt-8">
          <SectionTitle><span id="tails">Happy tails</span></SectionTitle>
          <p className="-mt-2 mb-3 text-[0.95rem] text-muted">Found their families through Pupmeow.</p>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
            {tails.map((t) => <AdoptionCard key={t.id} item={t} className="w-56 shrink-0" />)}
          </div>
        </section>
      )}
    </WithRail>
  );
}
