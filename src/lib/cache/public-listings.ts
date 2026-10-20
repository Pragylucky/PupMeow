import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/server";
import { LOST_FOUND_COLUMNS, ADOPTION_COLUMNS } from "@/lib/columns";
import { speciesIn } from "@/lib/species";
import type { AdoptionRow, LostFoundRow, SpeciesPref } from "@/types/database";

const LANDING_TAG = "landing-recent";
const LOST_LIST_TAG = "lost-list-public";
const ADOPT_LIST_TAG = "adopt-list-public";

export async function getLandingRecentCached() {
  return unstable_cache(
    async () => {
      const supabase = createPublicClient();
      const [lost, adopt, reunited] = await Promise.all([
        supabase.from("lost_found").select(LOST_FOUND_COLUMNS).eq("status", "open").eq("is_hidden", false).order("created_at", { ascending: false }).limit(3),
        supabase.from("adoptions").select(ADOPTION_COLUMNS).eq("status", "available").eq("is_hidden", false).order("created_at", { ascending: false }).limit(3),
        supabase.from("lost_found").select("id", { count: "exact", head: true }).eq("status", "reunited"),
      ]);
      return {
        lost: (lost.data ?? []) as LostFoundRow[],
        adopt: (adopt.data ?? []) as AdoptionRow[],
        reunited: reunited.count ?? 0,
      };
    },
    ["landing-recent-v1"],
    { revalidate: 120, tags: [LANDING_TAG] },
  )();
}

export async function getLostListCached(tab: "lost" | "found" | "reunited", species: SpeciesPref) {
  const speciesKey = speciesIn(species).join(",");
  return unstable_cache(
    async () => {
      const supabase = createPublicClient();
      let q = supabase.from("lost_found").select(LOST_FOUND_COLUMNS).in("species", speciesIn(species)).limit(60);
      if (tab === "reunited") q = q.eq("status", "reunited").order("reunited_at", { ascending: false });
      else q = q.eq("type", tab).eq("status", "open").order("created_at", { ascending: false });
      const { data } = await q;
      return (data ?? []) as LostFoundRow[];
    },
    [`lost-list-${tab}-${speciesKey}`],
    { revalidate: 45, tags: [LOST_LIST_TAG] },
  )();
}

export async function getAdoptListCached(species: SpeciesPref) {
  const speciesKey = speciesIn(species).join(",");
  return unstable_cache(
    async () => {
      const supabase = createPublicClient();
      const [{ data }, { data: happy }] = await Promise.all([
        supabase.from("adoptions").select(ADOPTION_COLUMNS).eq("status", "available").in("species", speciesIn(species)).order("created_at", { ascending: false }).limit(60),
        supabase.from("adoptions").select(ADOPTION_COLUMNS).eq("status", "adopted").in("species", speciesIn(species)).order("adopted_at", { ascending: false }).limit(6),
      ]);
      return { items: (data ?? []) as AdoptionRow[], happy: (happy ?? []) as AdoptionRow[] };
    },
    [`adopt-list-${speciesKey}`],
    { revalidate: 45, tags: [ADOPT_LIST_TAG] },
  )();
}

export { LANDING_TAG, LOST_LIST_TAG, ADOPT_LIST_TAG };
