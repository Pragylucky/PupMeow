import type { Metadata } from "next";
import Link from "next/link";
import { ImagePlus } from "lucide-react";
import { requireProfile, getPrivateProfile } from "@/lib/auth";
import { getSpeciesPref } from "@/lib/species-server";
import { speciesIn } from "@/lib/species";
import { fetchFeedPage } from "@/lib/feed";
import { createClient } from "@/lib/supabase/server";
import { LOST_FOUND_COLUMNS } from "@/lib/columns";
import { feedQuerySchema } from "@/lib/validations/post";
import { SpeciesToggle } from "@/components/features/species/species-toggle";
import { FeedList } from "@/components/features/feed/feed-list";
import { LostFoundCard } from "@/components/features/listings/listing-cards";
import { WithRail } from "@/components/layout/page-layout";
import { TipCard } from "@/components/brand/bits";
import { FilterChip } from "@/components/ui/chip";
import { Avatar } from "@/components/ui/avatar";
import { displayName, sameNeighbourhood, shortArea } from "@/lib/utils";
import type { LostFoundRow, PetRow } from "@/types/database";
import { WelcomeToast } from "./welcome-toast";

export const metadata: Metadata = { title: "Feed", robots: { index: false } };

export default async function FeedPage({ searchParams }: { searchParams: Promise<{ tab?: string; welcome?: string }> }) {
  const sp = await searchParams;
  const profile = await requireProfile("/feed");
  const priv = await getPrivateProfile();
  const species = await getSpeciesPref();
  const tab = feedQuerySchema.shape.tab.catch("all").parse(sp.tab);
  const homeArea = priv?.home_area ?? profile.area;
  const supabase = await createClient();
  const [{ posts, nextCursor, note }, lostRes, tagRes, petRes] = await Promise.all([
    fetchFeedPage({ userId: profile.id, tab, species, homeArea, city: profile.city }),
    supabase.from("lost_found").select(LOST_FOUND_COLUMNS).eq("status", "open").eq("is_hidden", false).in("species", speciesIn(species)).order("created_at", { ascending: false }).limit(20),
    supabase.from("posts").select("hashtags").order("created_at", { ascending: false }).limit(200),
    supabase.from("pets").select("id, name").eq("owner_id", profile.id).order("created_at").limit(1),
  ]);
  const lostAll = (lostRes.data ?? []) as LostFoundRow[];
  const lost = [...lostAll.filter((l) => sameNeighbourhood(l.last_seen_area, homeArea)), ...lostAll.filter((l) => !sameNeighbourhood(l.last_seen_area, homeArea))].slice(0, 2);
  const counts = new Map<string, number>();
  for (const r of (tagRes.data ?? []) as { hashtags: string[] }[]) for (const h of r.hashtags ?? []) counts.set(h, (counts.get(h) ?? 0) + 1);
  const tags = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const firstPet = ((petRes.data ?? []) as Pick<PetRow, "id" | "name">[])[0];
  const hood = shortArea(homeArea);

  return (
    <WithRail
      rail={
        <>
          {lost.length > 0 && (
            <section aria-labelledby="feed-lost-h">
              <div className="mb-3 flex items-center justify-between">
                <h2 id="feed-lost-h" className="text-xl font-semibold">Lost near you</h2>
                <Link href="/lost" className="text-sm font-bold text-primary hover:underline">See all</Link>
              </div>
              <div className="space-y-3">{lost.map((l) => <LostFoundCard key={l.id} item={l} viewerArea={homeArea} size="sm" />)}</div>
            </section>
          )}
          {tags.length > 0 && (
            <section aria-labelledby="tags-h" className="rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-card)]">
              <h2 id="tags-h" className="mb-3 text-xl font-semibold">Popular tags</h2>
              <ul className="flex flex-wrap gap-2">
                {tags.map(([t, n]) => (
                  <li key={t}><Link href={`/tag/${t}`} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-bold hover:bg-border">#{t} <span className="text-muted">{n}</span></Link></li>
                ))}
              </ul>
            </section>
          )}
          <TipCard tone="care" title="Good posts get help">
            <ul className="space-y-1.5 text-[0.95rem] font-semibold text-white/90">
              <li>Tag your pet so neighbours know them.</li>
              <li>Use #hashtags like #DogsOfDelhi.</li>
              <li>Lost pet? Post a report, not a feed post. It alerts your area.</li>
            </ul>
          </TipCard>
        </>
      }
    >
      {sp.welcome && <WelcomeToast path="/feed" />}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[2rem] font-semibold leading-tight md:sr-only">Feed</h1>
        <SpeciesToggle />
      </div>
      <nav aria-label="Feed filter" className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        {[
          ["nearby", `Nearby${homeArea ? ` · ${hood}` : ""}`],
          ["city", "My city"],
          ["following", "Following"],
          ["all", "All"],
        ].map(([v, label]) => <FilterChip key={v} href={`/feed?tab=${v}`} active={tab === v}>{label}</FilterChip>)}
      </nav>
      <Link href="/post/new" className="mb-4 flex items-center gap-3 rounded-[var(--radius-lg)] bg-surface p-3 shadow-[var(--shadow-card)] hover:ring-2 hover:ring-border">
        <Avatar src={profile.avatar_url} name={displayName(profile)} size="md" />
        <span className="flex-1 text-[0.98rem] text-muted">{firstPet ? `Share a moment from ${firstPet.name}'s day…` : "Share a moment with your neighbourhood…"}</span>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-text" aria-hidden><ImagePlus className="h-5 w-5" /></span>
      </Link>
      <FeedList key={`${tab}-${species}`} initial={posts} initialCursor={nextCursor} tab={tab} species={species} viewerId={profile.id} emptyNote={note} />
    </WithRail>
  );
}
