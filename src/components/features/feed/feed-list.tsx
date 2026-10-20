"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { InfiniteList } from "@/components/ui/infinite-list";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { loadFeed } from "@/lib/actions/posts";
import { PostCard } from "./post-card";
import type { FeedPost } from "@/types/models";

export function FeedList({
  initial, initialCursor, tab, species, viewerId, hashtag, emptyNote, masonry = true,
}: { initial: FeedPost[]; initialCursor: string | null; tab: string; species: string; viewerId: string; hashtag?: string; emptyNote?: string; masonry?: boolean }) {
  const [posts, setPosts] = useState(initial);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => { setPosts(initial); setCursor(initialCursor); }, [initial, initialCursor]);

  const more = useCallback(async () => {
    if (loading || !cursor) return;
    setLoading(true);
    const res = await loadFeed({ tab, cursor, species, hashtag });
    setLoading(false);
    if (!res.ok || !res.data) { toast(res.ok ? "Couldn't load more" : res.error, "error"); return; }
    setPosts((p) => [...p, ...res.data!.posts.filter((n) => !p.some((x) => x.id === n.id))]);
    setCursor(res.data.nextCursor);
  }, [loading, cursor, tab, species, hashtag, toast]);

  const refresh = async () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 800);
  };

  if (!posts.length) {
    return (
      <EmptyState
        tone="card"
        art="paw"
        title={tab === "following" ? "Nothing from people you follow yet" : "No posts here yet"}
        description={emptyNote ?? "Be the first to share a moment with your neighbourhood."}
        action={<ButtonLink href="/post/new">Share a post</ButtonLink>}
      />
    );
  }

  return (
    <div
      onTouchStart={(e) => { startY.current = window.scrollY <= 0 ? e.touches[0].clientY : null; }}
      onTouchMove={(e) => { if (startY.current !== null) setPull(Math.max(0, Math.min(90, e.touches[0].clientY - startY.current))); }}
      onTouchEnd={() => { if (pull > 70) void refresh(); setPull(0); startY.current = null; }}
    >
      <div className="flex justify-center overflow-hidden transition-[height]" style={{ height: refreshing ? 40 : pull * 0.5 }} aria-hidden={!refreshing}>
        <RefreshCw className={`mt-2 h-5 w-5 text-primary ${refreshing ? "animate-spin" : ""}`} style={{ transform: `rotate(${pull * 3}deg)` }} />
        {refreshing && <span className="sr-only" role="status">Refreshing</span>}
      </div>
      <InfiniteList hasMore={!!cursor} loading={loading} onLoadMore={more}>
        <div className={masonry ? "columns-1 gap-4 lg:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid" : "space-y-4"}>
          {posts.map((p, i) => (
            <PostCard key={p.id} post={p} viewerId={viewerId} priority={i === 0} onDeleted={(id) => setPosts((all) => all.filter((x) => x.id !== id))} />
          ))}
        </div>
      </InfiniteList>
    </div>
  );
}
