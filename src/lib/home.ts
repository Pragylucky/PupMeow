import "server-only";
import { createClient } from "@/lib/supabase/server";
import { ADOPTION_COLUMNS, LOST_FOUND_COLUMNS, MINI_PET, MINI_PROFILE, POST_WITH_RELATIONS } from "@/lib/columns";
import { speciesIn } from "@/lib/species";
import { withLikes } from "@/lib/feed";
import { sameNeighbourhood } from "@/lib/utils";
import type { AdoptionRow, HealthRecordRow, LostFoundRow, PetRow, SpeciesPref } from "@/types/database";
import type { FeedPost, MatchRequestWithPets } from "@/types/models";

export interface HomeData {
  pets: PetRow[];
  due: (HealthRecordRow & { pet: Pick<PetRow, "id" | "name" | "species"> | undefined })[];
  lostNear: LostFoundRow[];
  lostNearCount: number;
  reunited: LostFoundRow[];
  requests: MatchRequestWithPets[];
  posts: FeedPost[];
  adoptions: AdoptionRow[];
}

/** Everything the Home dashboard needs, in parallel. */
export async function loadHome(opts: { userId: string; area: string | null; species: SpeciesPref }): Promise<HomeData> {
  const supabase = await createClient();
  const sp = speciesIn(opts.species);
  const in30 = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [pets, due, lost, reunited, reunitedAny, requests, posts, adoptions] = await Promise.all([
    supabase.from("pets").select("*").eq("owner_id", opts.userId).order("created_at"),
    supabase.from("pet_health_records").select("*").eq("owner_id", opts.userId).not("next_due_date", "is", null).lte("next_due_date", in30).order("next_due_date").limit(6),
    supabase.from("lost_found").select(LOST_FOUND_COLUMNS).eq("status", "open").eq("type", "lost").eq("is_hidden", false).in("species", sp).order("created_at", { ascending: false }).limit(30),
    supabase.from("lost_found").select(LOST_FOUND_COLUMNS).eq("status", "reunited").eq("is_hidden", false).gte("reunited_at", weekAgo).order("reunited_at", { ascending: false }).limit(3),
    supabase.from("lost_found").select(LOST_FOUND_COLUMNS).eq("status", "reunited").eq("is_hidden", false).order("reunited_at", { ascending: false }).limit(3),
    supabase
      .from("match_requests")
      .select(`*, from_pet:pets!match_requests_from_pet_id_fkey(${MINI_PET}), to_pet:pets!match_requests_to_pet_id_fkey(${MINI_PET}), from_owner:profiles!match_requests_from_owner_id_fkey(${MINI_PROFILE}), to_owner:profiles!match_requests_to_owner_id_fkey(${MINI_PROFILE})`)
      .eq("to_owner_id", opts.userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),
    (() => {
      let q = supabase.from("posts").select(POST_WITH_RELATIONS).order("created_at", { ascending: false }).limit(4);
      if (opts.species !== "both") q = q.or(`species.eq.${opts.species},species.is.null`);
      return q;
    })(),
    supabase.from("adoptions").select(ADOPTION_COLUMNS).eq("status", "available").eq("is_hidden", false).in("species", sp).order("created_at", { ascending: false }).limit(12),
  ]);

  const petList = (pets.data ?? []) as PetRow[];
  const lostAll = (lost.data ?? []) as LostFoundRow[];
  const near = lostAll.filter((l) => sameNeighbourhood(l.last_seen_area, opts.area));
  const lostNear = [...near, ...lostAll.filter((l) => !near.includes(l))].slice(0, 3);
  const adoptAll = (adoptions.data ?? []) as AdoptionRow[];
  const adoptNear = adoptAll.filter((a) => sameNeighbourhood(a.area, opts.area));

  return {
    pets: petList,
    due: ((due.data ?? []) as HealthRecordRow[]).map((r) => ({ ...r, pet: petList.find((p) => p.id === r.pet_id) })),
    lostNear,
    lostNearCount: near.length,
    reunited: ((reunited.data?.length ? reunited.data : reunitedAny.data) ?? []) as LostFoundRow[],
    requests: (requests.data ?? []) as MatchRequestWithPets[],
    posts: await withLikes(supabase, opts.userId, (posts.data ?? []) as Omit<FeedPost, "liked_by_me">[]),
    adoptions: [...adoptNear, ...adoptAll.filter((a) => !adoptNear.includes(a))].slice(0, 3),
  };
}
