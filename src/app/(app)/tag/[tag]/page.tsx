import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireProfile, getPrivateProfile } from "@/lib/auth";
import { getSpeciesPref } from "@/lib/species-server";
import { fetchFeedPage } from "@/lib/feed";
import { SpeciesToggle } from "@/components/features/species/species-toggle";
import { FeedList } from "@/components/features/feed/feed-list";

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  return { title: `#${(await params).tag}`, robots: { index: false } };
}

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const raw = decodeURIComponent((await params).tag).toLowerCase();
  if (!/^[a-z0-9_]{1,40}$/.test(raw)) notFound();
  const profile = await requireProfile(`/tag/${raw}`);
  const priv = await getPrivateProfile();
  const species = await getSpeciesPref();
  const { posts, nextCursor } = await fetchFeedPage({ userId: profile.id, tab: "all", species, hashtag: raw, homeArea: priv?.home_area, city: profile.city });
  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <section className="mb-5 rounded-[var(--radius-xl)] bg-primary p-5 text-white sm:p-7">
        <p className="text-sm font-extrabold uppercase tracking-wider text-white/80">Hashtag</p>
        <h1 className="mt-1 break-all text-[2.4rem] font-semibold leading-none sm:text-[3rem]">#{raw}</h1>
        <SpeciesToggle tone="onColor" className="mt-4" />
      </section>
      <FeedList key={`${raw}-${species}`} initial={posts} initialCursor={nextCursor} tab="all" species={species} viewerId={profile.id} hashtag={raw} emptyNote={`No posts with #${raw} yet. Start the trend!`} />
    </div>
  );
}
