import type { Metadata } from "next";
import Link from "next/link";
import { FileCheck2, Inbox, Lock, Plus } from "lucide-react";
import { requireProfile, getPrivateProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSpeciesPref } from "@/lib/species-server";
import { speciesIn } from "@/lib/species";
import { MINI_PROFILE } from "@/lib/columns";
import { NCR_AREAS } from "@/lib/constants";
import { SpeciesToggle } from "@/components/features/species/species-toggle";
import { ListingFilters } from "@/components/features/listings/listing-filters";
import { WithRail } from "@/components/layout/page-layout";
import { Steps, TipCard } from "@/components/brand/bits";
import { PetArt } from "@/components/brand/pet-art";
import { PetImage } from "@/components/brand/pet-image";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { cn, formatAge, sameNeighbourhood } from "@/lib/utils";
import type { MatchProfileCard } from "@/types/models";

export const metadata: Metadata = { title: "Playdates", robots: { index: false } };

export default async function MatchPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const profile = await requireProfile("/match");
  const priv = await getPrivateProfile();
  const viewerArea = priv?.home_area ?? profile.area;
  const species = await getSpeciesPref();
  const supabase = await createClient();
  const purpose = sp.purpose === "breeding" ? "breeding" : "playdate";

  let q = supabase
    .from("pet_match_profiles")
    .select(`*, pet:pets!inner(id, name, species, breed, gender, birthday, photo_url, is_neutered), owner:profiles!pet_match_profiles_owner_id_fkey(${MINI_PROFILE})`)
    .eq("is_active", true)
    .eq("is_hidden", false)
    .neq("owner_id", profile.id)
    .in("pet.species", speciesIn(species))
    .in("looking_for", purpose === "breeding" ? ["breeding", "both"] : ["playdate", "both"])
    .order("created_at", { ascending: false })
    .limit(60);
  if (sp.gender === "male" || sp.gender === "female") q = q.eq("pet.gender", sp.gender);
  if (sp.breed) q = q.ilike("pet.breed", `%${sp.breed.replace(/[%_,()]/g, "").slice(0, 40)}%`);
  if (sp.area) q = q.ilike("area", `%${sp.area.replace(/[%_,()]/g, "").slice(0, 60)}%`);
  const monthsAgo = (m: number) => { const d = new Date(); d.setMonth(d.getMonth() - m); return d.toISOString().slice(0, 10); };
  if (sp.age === "young") q = q.gt("pet.birthday", monthsAgo(12));
  if (sp.age === "adult") q = q.lte("pet.birthday", monthsAgo(12)).gt("pet.birthday", monthsAgo(96));
  if (sp.age === "senior") q = q.lte("pet.birthday", monthsAgo(96));

  const [{ data }, { count: pending }, { data: mine }] = await Promise.all([
    q,
    supabase.from("match_requests").select("id", { count: "exact", head: true }).eq("to_owner_id", profile.id).eq("status", "pending"),
    supabase.from("pet_match_profiles").select("id, pet_id").eq("owner_id", profile.id),
  ]);
  const all = (data ?? []) as MatchProfileCard[];
  const items = [...all.filter((m) => sameNeighbourhood(m.area, viewerArea)), ...all.filter((m) => !sameNeighbourhood(m.area, viewerArea))];
  const hasProfile = (mine ?? []).length > 0;
  const qs = (p: string) => `/match?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([k, v]) => v && k !== "purpose") as [string, string][]), purpose: p })}`;

  return (
    <WithRail
      rail={
        <>
          <TipCard tone="play" title="Playdate safety">
            <Steps items={["First meet in a public park, never at home.", "Check each other's vaccine records in person.", "Leashes on for the first 10 minutes."]} />
          </TipCard>
          <TipCard tone="ink" title="No stud fees. Ever.">
            <p className="text-[0.95rem] font-semibold text-white/90">Breeding needs a birthday on the pet profile, a health check and a minimum age (18 months for dogs, 12 for cats). No payments, no puppy or kitten sales.</p>
          </TipCard>
        </>
      }
    >
      <section className="relative mb-5 overflow-hidden rounded-[var(--radius-xl)] bg-cat p-5 text-white sm:p-7">
        <div className="relative max-w-xl">
          <h1 className="text-[2.3rem] font-bold leading-none sm:text-[2.9rem]">A playmate<br />in your park.</h1>
          <p className="mt-2 text-[1.02rem] font-semibold text-white/90">Find a dog or cat nearby for a walk or a play. Contact is shared only when both owners say yes.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <ButtonLink href="/match/new" variant="white"><Plus className="h-4 w-4" aria-hidden /> {hasProfile ? "Add or edit my pet" : "Add my pet"}</ButtonLink>
            <ButtonLink href="/match/requests" variant="dim"><Inbox className="h-4 w-4" aria-hidden /> Requests{pending ? ` · ${pending}` : ""}</ButtonLink>
          </div>
        </div>
        <div className="pointer-events-none absolute -bottom-2 right-4 hidden items-end sm:flex" aria-hidden>
          <PetArt pet={{ species: "dog", look: "brown" }} className="h-32 w-32" />
          <PetArt pet={{ species: "dog", look: "golden" }} className="-ml-8 h-36 w-36" />
        </div>
      </section>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Tabs ariaLabel="Looking for" value={purpose} items={[
          { value: "playdate", label: "Playdates", href: qs("playdate") },
          { value: "breeding", label: <span className="inline-flex items-center gap-1.5">Breeding <Lock className="h-3.5 w-3.5" aria-hidden /></span>, href: qs("breeding") },
        ]} />
        <SpeciesToggle compact />
      </div>
      {purpose === "breeding" && (
        <p className="mb-3 rounded-[var(--radius-md)] bg-cat-soft px-4 py-3 text-[0.95rem] font-semibold text-text">
          Only responsible matches: pets must meet the age rule and owners confirm health. No stud fees or sales, ever.
        </p>
      )}
      <ListingFilters basePath="/match" areas={NCR_AREAS} area={sp.area} hidden={{ purpose }} extra={[
        { name: "gender", label: "Gender", value: sp.gender ?? "", options: [{ value: "", label: "any" }, { value: "male", label: "Male" }, { value: "female", label: "Female" }] },
        { name: "age", label: "Age", value: sp.age ?? "", options: [{ value: "", label: "any" }, { value: "young", label: "Under 1 year" }, { value: "adult", label: "1–8 years" }, { value: "senior", label: "8+ years" }] },
      ]} />
      {items.length ? (
        <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((m) => <MatchCard key={m.id} m={m} near={sameNeighbourhood(m.area, viewerArea)} />)}
        </div>
      ) : (
        <EmptyState tone="card" art={species === "cat" ? "cat" : "dog"} title={purpose === "breeding" ? "No breeding profiles nearby" : "No playmates here yet"} description="Be the first in your area: add your pet and others will find you." action={<ButtonLink href="/match/new">Add my pet</ButtonLink>} />
      )}
    </WithRail>
  );
}

function MatchCard({ m, near }: { m: MatchProfileCard; near: boolean }) {
  const cover = m.photo_urls[0] ?? m.pet?.photo_url;
  const gender = m.pet?.gender === "male" ? "M" : m.pet?.gender === "female" ? "F" : null;
  return (
    <Link href={`/match/${m.id}`} className="press group flex flex-col overflow-hidden rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5 focus-visible:-translate-y-0.5">
      <div className="relative aspect-[4/3] overflow-hidden">
        <PetImage src={cover} alt={m.pet?.name ?? "Pet"} species={m.pet?.species} hints={[m.pet?.breed]} seed={m.id} tint="#ece7ff" className="transition-transform duration-300 group-hover:scale-[1.03]" />
        <span className="absolute right-2.5 top-2.5 rounded-full bg-white px-2.5 py-1 text-[0.75rem] font-extrabold text-ink">{near ? "Nearby" : m.area}</span>
        {m.has_papers && <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[0.75rem] font-extrabold text-white"><FileCheck2 className="h-3.5 w-3.5" aria-hidden /> Papers</span>}
      </div>
      <div className="flex flex-1 flex-col bg-cat p-3.5 text-white">
        <p className="truncate font-heading text-[1.3rem] font-semibold leading-tight">{m.pet?.name}</p>
        <p className="truncate text-[0.9rem] font-semibold text-white/85">{[m.pet?.breed?.replace(/ \/ .*$/, ""), formatAge(m.pet?.birthday), gender].filter(Boolean).join(" · ")}</p>
        <p className="mt-1 line-clamp-2 text-[0.88rem] text-white/90">{m.about}</p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-2.5">
          <span className={cn("rounded-full px-2.5 py-1 text-[0.75rem] font-extrabold", m.looking_for === "playdate" ? "bg-white text-ink" : "bg-cream text-ink")}>
            {m.looking_for === "both" ? "Playdates & breeding" : m.looking_for === "playdate" ? "Playdates" : "Breeding"}
          </span>
          {m.health_confirmed && <span className="rounded-full bg-white/20 px-2.5 py-1 text-[0.75rem] font-extrabold">Owner says vaccinated</span>}
        </div>
      </div>
    </Link>
  );
}
