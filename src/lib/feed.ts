import "server-only";
import { createClient } from "@/lib/supabase/server";
import { POST_WITH_RELATIONS } from "@/lib/columns";
import { FEED_PAGE_SIZE } from "@/lib/constants";
import type { SpeciesPref } from "@/types/database";
import type { FeedPost } from "@/types/models";
import type { FeedTab } from "@/lib/validations/post";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Adds liked_by_me to a list of posts with one extra query. */
export async function withLikes(supabase: Supabase, userId: string, rows: Omit<FeedPost, "liked_by_me">[]): Promise<FeedPost[]> {
  if (!rows.length) return [];
  const { data } = await supabase.from("likes").select("post_id").eq("user_id", userId).in("post_id", rows.map((r) => r.id));
  const liked = new Set((data ?? []).map((l: { post_id: string }) => l.post_id));
  return rows.map((r) => ({ ...r, liked_by_me: liked.has(r.id) }));
}

export async function fetchFeedPage(opts: {
  userId: string;
  tab: FeedTab;
  species: SpeciesPref;
  cursor?: string | null;
  homeArea?: string | null;
  city?: string | null;
  hashtag?: string;
}): Promise<{ posts: FeedPost[]; nextCursor: string | null; note?: string }> {
  const supabase = await createClient();
  let q = supabase.from("posts").select(POST_WITH_RELATIONS).order("created_at", { ascending: false }).limit(FEED_PAGE_SIZE + 1);

  if (opts.cursor) q = q.lt("created_at", opts.cursor);
  if (opts.species !== "both") q = q.or(`species.eq.${opts.species},species.is.null`);
  if (opts.hashtag) q = q.contains("hashtags", [opts.hashtag]);

  if (opts.tab === "nearby") {
    if (!opts.homeArea) return { posts: [], nextCursor: null, note: "Set your area in Settings to see nearby posts." };
    q = q.ilike("area", opts.homeArea);
  } else if (opts.tab === "city") {
    q = q.eq("city", opts.city ?? "Delhi NCR");
  } else if (opts.tab === "following") {
    const { data: f } = await supabase.from("follows").select("following_id").eq("follower_id", opts.userId).limit(1000);
    const ids = (f ?? []).map((r: { following_id: string }) => r.following_id);
    if (!ids.length) return { posts: [], nextCursor: null, note: "Follow people to see their posts here." };
    q = q.in("author_id", ids);
  }

  const { data, error } = await q;
  if (error) {
    console.error("[feed]", error.message);
    return { posts: [], nextCursor: null };
  }
  const rows = (data ?? []) as Omit<FeedPost, "liked_by_me">[];
  const hasMore = rows.length > FEED_PAGE_SIZE;
  const page = rows.slice(0, FEED_PAGE_SIZE);
  return { posts: await withLikes(supabase, opts.userId, page), nextCursor: hasMore ? page[page.length - 1].created_at : null };
}
