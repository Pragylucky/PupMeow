import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { canViewHiddenContent } from "@/lib/moderation/visibility";
import { createClient } from "@/lib/supabase/server";
import { POST_WITH_RELATIONS, MINI_PROFILE } from "@/lib/columns";
import { withLikes } from "@/lib/feed";
import { PostCard } from "@/components/features/feed/post-card";
import { WithRail } from "@/components/layout/page-layout";
import { PetImage } from "@/components/brand/pet-image";
import { Avatar } from "@/components/ui/avatar";
import { displayName } from "@/lib/utils";
import { Comments } from "./comments";
import type { CommentWithAuthor, FeedPost } from "@/types/models";

export const metadata: Metadata = { title: "Post", robots: { index: false } };

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const profile = await requireProfile(`/post/${id}`);
  const supabase = await createClient();
  const { data } = await supabase.from("posts").select(POST_WITH_RELATIONS).eq("id", id).maybeSingle();
  if (!data) notFound();
  if (!canViewHiddenContent({ is_hidden: data.is_hidden, author_id: data.author_id }, profile)) notFound();
  const [post] = await withLikes(supabase, profile.id, [data as Omit<FeedPost, "liked_by_me">]);
  const { data: comments } = await supabase
    .from("comments")
    .select(`*, author:profiles!comments_author_id_fkey(${MINI_PROFILE})`)
    .eq("post_id", id)
    .order("created_at")
    .limit(500);
  return (
    <WithRail
      rail={
        <>
          {post.author && (
            <Link href={`/u/${post.author.username}`} className="flex items-center gap-3 rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-card)] hover:ring-2 hover:ring-border">
              <Avatar src={post.author.avatar_url} name={displayName(post.author)} size="lg" />
              <span className="min-w-0">
                <span className="block text-xs font-extrabold uppercase tracking-wider text-muted">Posted by</span>
                <span className="block truncate font-heading text-xl font-semibold">{displayName(post.author)}</span>
                {post.area && <span className="block text-sm text-muted">{post.area}</span>}
              </span>
            </Link>
          )}
          {post.pet && (
            <Link href={`/pet/${post.pet.id}`} className="flex items-center gap-3 rounded-[var(--radius-lg)] bg-secondary p-4 text-ink hover:brightness-105">
              <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-white"><PetImage src={post.pet.photo_url} alt={post.pet.name} species={post.pet.species} seed={post.pet.id} sizes="64px" /></span>
              <span>
                <span className="block text-xs font-extrabold uppercase tracking-wider opacity-70">Starring</span>
                <span className="block font-heading text-xl font-semibold">{post.pet.name}</span>
                <span className="block text-sm font-bold">See all their moments →</span>
              </span>
            </Link>
          )}
        </>
      }
    >
      <div className="mx-auto max-w-2xl space-y-5">
        <Link href="/feed" className="inline-flex items-center gap-1 text-sm font-bold text-muted hover:text-text"><ChevronLeft className="h-4 w-4" aria-hidden /> Feed</Link>
        {post.is_hidden && <p className="rounded-[var(--radius-md)] bg-warning-soft px-3 py-2 text-sm font-semibold text-warning">This post is hidden by moderators. Only you and admins can see it.</p>}
        <PostCard post={post} viewerId={profile.id} priority full />
        <Comments postId={post.id} postAuthorId={post.author_id} viewer={profile} initial={(comments ?? []) as CommentWithAuthor[]} likeCount={post.like_count} isAdmin={profile.role === "admin"} />
      </div>
    </WithRail>
  );
}
