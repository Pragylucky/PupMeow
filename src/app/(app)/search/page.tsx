import type { Metadata } from "next";
import Link from "next/link";
import { Search, Hash } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSpeciesPref } from "@/lib/species-server";
import { speciesIn } from "@/lib/species";
import { MINI_PROFILE } from "@/lib/columns";
import { Avatar } from "@/components/ui/avatar";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { SpeciesToggle } from "@/components/features/species/species-toggle";
import { PetCard } from "@/components/features/pets/pet-card";
import { PostGrid } from "@/components/features/feed/post-grid";
import { displayName } from "@/lib/utils";
import type { PetRow, PostRow } from "@/types/database";
import type { MiniProfile } from "@/types/models";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

/** Strip characters that have meaning in PostgREST filter syntax or LIKE patterns. */
function clean(q: string) {
  return q.replace(/[%_,()*\\:."']/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const sp = await searchParams;
  await requireProfile("/search");
  const species = await getSpeciesPref();
  const raw = (sp.q ?? "").trim();
  const isTag = raw.startsWith("#");
  const q = clean(raw.replace(/^[#@]/, ""));
  const type = ["people", "pets", "posts", "tags"].includes(sp.type ?? "") ? sp.type! : "all";
  const supabase = await createClient();

  let people: MiniProfile[] = [], pets: PetRow[] = [], posts: PostRow[] = [], tags: { tag: string; count: number }[] = [];
  if (q.length >= 2) {
    const like = `%${q}%`;
    const [u, p, po, t] = await Promise.all([
      type === "all" || type === "people"
        ? supabase.from("profiles").select(MINI_PROFILE).eq("onboarded", true).or(`username.ilike.${like},display_name.ilike.${like}`).limit(20) : null,
      type === "all" || type === "pets"
        ? supabase.from("pets").select("id, name, species, breed, photo_url, birthday").in("species", speciesIn(species)).or(`name.ilike.${like},breed.ilike.${like}`).limit(18) : null,
      type === "all" || type === "posts"
        ? supabase.from("posts").select("id, image_urls, caption, like_count, comment_count").ilike("caption", like).order("created_at", { ascending: false }).limit(30) : null,
      type === "all" || type === "tags" || isTag
        ? supabase.from("posts").select("hashtags").overlaps("hashtags", [q.toLowerCase().replace(/\s/g, "")]).limit(200) : null,
    ]);
    people = (u?.data ?? []) as MiniProfile[];
    pets = (p?.data ?? []) as PetRow[];
    posts = (po?.data ?? []) as PostRow[];
    const counts = new Map<string, number>();
    for (const row of (t?.data ?? []) as { hashtags: string[] }[]) for (const h of row.hashtags) if (h.includes(q.toLowerCase())) counts.set(h, (counts.get(h) ?? 0) + 1);
    tags = [...counts.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count).slice(0, 12);
  }
  const href = (t: string) => `/search?q=${encodeURIComponent(raw)}${t === "all" ? "" : `&type=${t}`}`;
  const nothing = q.length >= 2 && !people.length && !pets.length && !posts.length && !tags.length;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <h1 className="text-[2rem] font-semibold leading-tight sm:text-[2.4rem]">Search</h1>
      <form role="search" action="/search" className="relative">
        <label htmlFor="q" className="sr-only">Search</label>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
        <input id="q" name="q" type="search" defaultValue={raw} autoFocus={!raw} placeholder="People, pets, posts or #tags" className="h-14 w-full rounded-full border-2 border-border bg-surface pl-12 pr-5 text-[1.05rem] shadow-[var(--shadow-card)] focus:border-primary focus:outline-none" />
        {type !== "all" && <input type="hidden" name="type" value={type} />}
      </form>
      <SpeciesToggle compact />
      {raw && <Tabs ariaLabel="Result type" value={type} items={["all", "people", "pets", "posts", "tags"].map((t) => ({ value: t, label: t[0].toUpperCase() + t.slice(1), href: href(t) }))} />}
      {!raw && <EmptyState tone="card" art="search" title="Find your pack" description="Search for neighbours, pets by name or breed, posts, or hashtags like #DogsOfDelhi." />}
      {raw && q.length < 2 && <p className="text-sm text-muted">Type at least 2 characters.</p>}
      {nothing && <EmptyState tone="card" art="search" title={`Nothing for “${raw}”`} description="Try a different spelling or a breed name." />}

      {people.length > 0 && (
        <section aria-labelledby="r-people">
          <h2 id="r-people" className="mb-2 text-xl font-semibold">People</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-card)]">
            {people.map((u) => (
              <li key={u.id}><Link href={`/u/${u.username}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2"><Avatar src={u.avatar_url} name={displayName(u)} size="md" /><span><span className="block font-bold">{displayName(u)}</span><span className="text-sm text-muted">@{u.username}</span></span></Link></li>
            ))}
          </ul>
        </section>
      )}
      {tags.length > 0 && (
        <section aria-labelledby="r-tags">
          <h2 id="r-tags" className="mb-2 text-xl font-semibold">Hashtags</h2>
          <ul className="flex flex-wrap gap-2">
            {tags.map((t) => <li key={t.tag}><Link href={`/tag/${t.tag}`} className="inline-flex items-center gap-1 rounded-full bg-surface px-3.5 py-2 text-sm font-bold shadow-[var(--shadow-card)] hover:ring-2 hover:ring-border"><Hash className="h-3.5 w-3.5" aria-hidden />{t.tag} <span className="text-muted">{t.count}</span></Link></li>)}
          </ul>
        </section>
      )}
      {pets.length > 0 && (
        <section aria-labelledby="r-pets">
          <h2 id="r-pets" className="mb-2 text-xl font-semibold">Pets</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{pets.map((p) => <PetCard key={p.id} pet={p} />)}</div>
        </section>
      )}
      {posts.length > 0 && (
        <section aria-labelledby="r-posts">
          <h2 id="r-posts" className="mb-2 text-xl font-semibold">Posts</h2>
          <PostGrid posts={posts} />
        </section>
      )}
    </div>
  );
}
