"use server";

import { revalidatePath } from "next/cache";
import { actionContext } from "@/lib/auth";
import { createPostSchema, editPostSchema, commentSchema, feedQuerySchema } from "@/lib/validations/post";
import { uuidSchema, zodFieldErrors } from "@/lib/validations/common";
import { allOwnUploads } from "@/lib/storage-paths";
import { friendlyError } from "@/lib/utils";
import { moderateText, blockedMessage, flagForReview } from "@/lib/ai/moderation";
import { fetchFeedPage } from "@/lib/feed";
import { MINI_PROFILE } from "@/lib/columns";
import type { ActionResult, CommentWithAuthor, FeedPost, MiniProfile } from "@/types/models";

export async function createPost(_prev: ActionResult<string> | null, formData: FormData): Promise<ActionResult<string>> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const { supabase, userId, profile } = ctx;
  const parsed = createPostSchema.safeParse({
    caption: formData.get("caption") ?? "",
    image_urls: formData.getAll("image_urls").map(String),
    pet_id: formData.get("pet_id") ?? "",
    species: formData.get("species") ?? "",
  });
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: zodFieldErrors(parsed.error) };
  const v = parsed.data;
  if (!allOwnUploads(v.image_urls, "posts", userId)) return { ok: false, error: "Please re-upload your photos." };

  const mod = await moderateText(v.caption, "post");
  if (mod.verdict === "block") return { ok: false, error: blockedMessage(mod), fieldErrors: { caption: blockedMessage(mod) } };

  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_id: userId, caption: v.caption, image_urls: v.image_urls, pet_id: v.pet_id, species: v.species,
      city: profile.city, area: profile.hide_area ? null : profile.area,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: friendlyError(error, "Couldn't publish your post.") };
  if (mod.verdict === "flag") await flagForReview("post", data.id, mod);
  revalidatePath("/feed");
  return { ok: true, data: data.id, message: "Posted!" };
}

export async function editPost(id: string, caption: string): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const parsed = editPostSchema.safeParse({ id, caption });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid caption" };
  const mod = await moderateText(parsed.data.caption, "post");
  if (mod.verdict === "block") return { ok: false, error: blockedMessage(mod) };
  const { error, count } = await ctx.supabase.from("posts").update({ caption: parsed.data.caption }, { count: "exact" }).eq("id", parsed.data.id).eq("author_id", ctx.userId);
  if (error) return { ok: false, error: friendlyError(error) };
  if (!count) return { ok: false, error: "Post not found." };
  if (mod.verdict === "flag") await flagForReview("post", parsed.data.id, mod);
  revalidatePath(`/post/${parsed.data.id}`);
  return { ok: true, message: "Post updated" };
}

export async function deletePost(id: string): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const pid = uuidSchema.safeParse(id);
  if (!pid.success) return { ok: false, error: "Invalid post" };
  const { data: post } = await ctx.supabase.from("posts").select("author_id, image_urls").eq("id", pid.data).maybeSingle();
  if (!post || post.author_id !== ctx.userId) return { ok: false, error: "You can only delete your own posts." };
  const { error } = await ctx.supabase.from("posts").delete().eq("id", pid.data).eq("author_id", ctx.userId);
  if (error) return { ok: false, error: friendlyError(error) };
  const prefix = `/storage/v1/object/public/posts/`;
  const paths = (post.image_urls as string[]).map((u) => u.split(prefix)[1]).filter((p): p is string => !!p && p.startsWith(`${ctx.userId}/`));
  if (paths.length) await ctx.supabase.storage.from("posts").remove(paths);
  revalidatePath("/feed");
  return { ok: true, message: "Post deleted" };
}

export async function toggleLike(postId: string, like: boolean): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const pid = uuidSchema.safeParse(postId);
  if (!pid.success) return { ok: false, error: "Invalid post" };
  const { error } = like
    ? await ctx.supabase.from("likes").insert({ post_id: pid.data, user_id: ctx.userId })
    : await ctx.supabase.from("likes").delete().eq("post_id", pid.data).eq("user_id", ctx.userId);
  if (error && error.code !== "23505") return { ok: false, error: friendlyError(error) };
  return { ok: true };
}

export async function addComment(postId: string, body: string): Promise<ActionResult<CommentWithAuthor>> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const parsed = commentSchema.safeParse({ post_id: postId, body });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid comment" };
  const mod = await moderateText(parsed.data.body, "comment");
  if (mod.verdict === "block") return { ok: false, error: blockedMessage(mod) };
  const { data, error } = await ctx.supabase
    .from("comments")
    .insert({ post_id: parsed.data.post_id, author_id: ctx.userId, body: parsed.data.body })
    .select(`*, author:profiles!comments_author_id_fkey(${MINI_PROFILE})`)
    .single();
  if (error || !data) return { ok: false, error: friendlyError(error, "Couldn't add your comment.") };
  if (mod.verdict === "flag") await flagForReview("comment", data.id, mod);
  revalidatePath(`/post/${parsed.data.post_id}`);
  return { ok: true, data: data as CommentWithAuthor };
}

export async function deleteComment(commentId: string): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const cid = uuidSchema.safeParse(commentId);
  if (!cid.success) return { ok: false, error: "Invalid comment" };
  // RLS allows: comment author, post author, or admin.
  const { error, count } = await ctx.supabase.from("comments").delete({ count: "exact" }).eq("id", cid.data);
  if (error) return { ok: false, error: friendlyError(error) };
  if (!count) return { ok: false, error: "You can't delete this comment." };
  return { ok: true, message: "Comment deleted" };
}

export async function loadFeed(input: { tab: string; cursor: string | null; species: string; hashtag?: string }): Promise<ActionResult<{ posts: FeedPost[]; nextCursor: string | null }>> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const parsed = feedQuerySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request" };
  const { data: priv } = await ctx.supabase.from("profile_private").select("home_area").eq("id", ctx.userId).maybeSingle();
  const tag = input.hashtag && /^[a-z0-9_]{1,40}$/.test(input.hashtag) ? input.hashtag : undefined;
  const res = await fetchFeedPage({
    userId: ctx.userId, tab: parsed.data.tab, species: parsed.data.species, cursor: parsed.data.cursor ?? null,
    homeArea: priv?.home_area ?? ctx.profile.area, city: ctx.profile.city, hashtag: tag,
  });
  return { ok: true, data: { posts: res.posts, nextCursor: res.nextCursor } };
}

export async function getLikers(postId: string): Promise<ActionResult<MiniProfile[]>> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const pid = uuidSchema.safeParse(postId);
  if (!pid.success) return { ok: false, error: "Invalid post" };
  const { data, error } = await ctx.supabase
    .from("likes")
    .select(`user:profiles!likes_user_id_fkey(${MINI_PROFILE})`)
    .eq("post_id", pid.data)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return { ok: false, error: friendlyError(error) };
  const users = (data ?? []).map((r: { user: unknown }) => r.user as MiniProfile).filter(Boolean);
  return { ok: true, data: users };
}

export async function markNotificationsRead(ids?: string[]): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  if (ids?.length) {
    const valid = ids.filter((i) => uuidSchema.safeParse(i).success).slice(0, 100);
    await ctx.supabase.from("notifications").update({ is_read: true }).in("id", valid).eq("user_id", ctx.userId);
  } else {
    await ctx.supabase.rpc("mark_all_notifications_read");
  }
  revalidatePath("/notifications");
  return { ok: true };
}
