import type { Metadata } from "next";
import { HandHeart, MapPin, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPrivateProfile, getViewer, getCurrentProfile } from "@/lib/auth";
import { getSpeciesPref } from "@/lib/species-server";
import { speciesIn } from "@/lib/species";
import { LOST_FOUND_COLUMNS } from "@/lib/columns";
import { NCR_AREAS } from "@/lib/constants";
import { SpeciesToggle } from "@/components/features/species/species-toggle";
import { LostFoundCard } from "@/components/features/listings/listing-cards";
import { ListingFilters } from "@/components/features/listings/listing-filters";
import { WithRail } from "@/components/layout/page-layout";
import { Steps, TipCard } from "@/components/brand/bits";
import { PetArt } from "@/components/brand/pet-art";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import type { LostFoundRow } from "@/types/database";

export const metadata: Metadata = {
  title: "Lost & Found pets in Delhi NCR",
  description: "Lost and found dogs and cats across Delhi, Noida, Gurugram, Ghaziabad and Faridabad. Help reunite pets with their families.",
};

const SINCE: Record<string, number> = { "1d": 1, "7d": 7, "30d": 30 };

export default async function LostPage({ searchParams }: { searchParams: Promise<{ tab?: string; area?: string; since?: string }> }) {
  const sp = await searchParams;
  const user = await getViewer();
  const tabs = ["lost", "found", "reunited", ...(user ? ["mine"] : [])];
  const tab = tabs.includes(sp.tab ?? "") ? sp.tab! : "lost";
  const species = await getSpeciesPref();
  const [profile, priv] = user ? await Promise.all([getCurrentProfile(), getPrivateProfile()]) : [null, null];
  const viewerArea = priv?.home_area ?? profile?.area ?? null;
  const supabase = await createClient();
  const sinceIso = sp.since && SINCE[sp.since] ? new Date(Date.now() - SINCE[sp.since] * 86_400_000).toISOString() : null;
  const cleanArea = sp.area ? `%${sp.area.replace(/[%_,()]/g, "").slice(0, 60)}%` : null;

  const base = (anySpecies = false) => {
    let q = supabase.from("lost_found").select(LOST_FOUND_COLUMNS, { count: "exact" });
    if (!anySpecies) q = q.in("species", speciesIn(species));
    if (cleanArea) q = q.ilike("last_seen_area", cleanArea);
    if (sinceIso) q = q.gte("last_seen_date", sinceIso);
    return q;
  };
  let list = base(tab === "mine").limit(60);
  if (tab === "reunited") list = list.eq("status", "reunited").order("reunited_at", { ascending: false });
  else if (tab === "mine") list = list.eq("author_id", user!.id).order("created_at", { ascending: false });
  else list = list.eq("type", tab).eq("status", "open").order("created_at", { ascending: false });

  const [{ data }, lostCount, foundCount, reunitedCount] = await Promise.all([
    list,
    base().eq("type", "lost").eq("status", "open").limit(1),
    base().eq("type", "found").eq("status", "open").limit(1),
    base().eq("status", "reunited").limit(1),
  ]);
  const items = (data ?? []) as LostFoundRow[];
  const qs = (t: string) => `/lost?${new URLSearchParams({ tab: t, ...(sp.area ? { area: sp.area } : {}), ...(sp.since ? { since: sp.since } : {}) })}`;

  return (
    <WithRail
      rail={
        <>
          <TipCard tone="lost" title="First hour matters">
            <Steps items={[
              "Search your lanes in widening loops. Dogs keep moving, cats hide close by.",
              "Post a report here. People in your area get an alert right away.",
              "Print the poster and share the link in every society group.",
            ]} />
          </TipCard>
          <TipCard tone="adopt" title="Found a dog or cat?">
            <Steps tone="dark" items={[
              "Collar or groomed coat? Likely someone's pet. A calm street local is best left where it lives.",
              "Offer water and shade. Don't chase or corner them.",
              "Ask guards and shops, then post a found report with a clear photo.",
            ]} />
          </TipCard>
        </>
      }
    >
      <section className="halftone relative mb-5 overflow-hidden rounded-[var(--radius-xl)] bg-danger p-5 text-white sm:p-7">
        <div className="relative max-w-xl">
          <p className="font-heading text-[2.6rem] font-bold leading-none tracking-[0.03em] sm:text-[3.2rem]">LOST &amp; FOUND</p>
          <p className="mt-2 text-[1.02rem] font-semibold text-white/90 text-pretty">Most pets are found within a few kilometres. A report alerts everyone in that area and gives you a poster for WhatsApp.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {user ? (
              <>
                <ButtonLink href="/lost/new?type=lost" variant="white"><MapPin className="h-4 w-4" aria-hidden /> Report a lost pet</ButtonLink>
                <ButtonLink href="/lost/new?type=found" variant="dim"><HandHeart className="h-4 w-4" aria-hidden /> I found a pet</ButtonLink>
              </>
            ) : (
              <ButtonLink href="/login?next=/lost/new" variant="white"><Plus className="h-4 w-4" aria-hidden /> Join free to report</ButtonLink>
            )}
          </div>
        </div>
        <PetArt pet={{ species: "dog", look: "beagle" }} className="pointer-events-none absolute -bottom-3 right-4 hidden h-36 w-36 sm:block" />
      </section>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs ariaLabel="Report type" value={tab} items={[
          { value: "lost", label: "Lost", href: qs("lost"), count: lostCount.count ?? 0 },
          { value: "found", label: "Found", href: qs("found"), count: foundCount.count ?? 0 },
          { value: "reunited", label: "Reunited", href: qs("reunited"), count: reunitedCount.count ?? 0 },
          ...(user ? [{ value: "mine", label: "My reports", href: qs("mine") }] : []),
        ]} />
        <SpeciesToggle compact />
      </div>
      <ListingFilters basePath="/lost" areas={NCR_AREAS} hidden={{ tab }} area={sp.area} extra={[{ name: "since", label: "Last seen", value: sp.since ?? "", options: [{ value: "", label: "any time" }, { value: "1d", label: "Last 24 hours" }, { value: "7d", label: "Last 7 days" }, { value: "30d", label: "Last 30 days" }] }]} />
      {items.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map((i) => <LostFoundCard key={i.id} item={i} viewerArea={viewerArea} />)}</div>
      ) : (
        <EmptyState
          tone="card"
          art={species === "cat" ? "cat" : "dog"}
          title={tab === "reunited" ? "No reunions yet" : tab === "mine" ? "You haven't posted a report" : `No ${tab} pets reported`}
          description={tab === "lost" ? "Fingers crossed it stays that way. If your pet is missing, report it right away." : sp.area || sp.since ? "Try clearing the filters." : "Check back soon."}
          action={user && tab !== "reunited" ? <ButtonLink href="/lost/new">Report a lost or found pet</ButtonLink> : undefined}
        />
      )}
    </WithRail>
  );
}
