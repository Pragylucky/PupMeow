"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { ContentMenu } from "@/components/features/safety/content-menu";
import { Lightbox } from "@/components/features/upload/lightbox";
import { toggleLike, deletePost, editPost } from "@/lib/actions/posts";
import { BLUR_DATA_URL } from "@/lib/image";
import { cn, compactNumber, displayName, timeAgo } from "@/lib/utils";
import { RichText } from "./rich-text";
import type { FeedPost } from "@/types/models";

const TEXT_TONES = [
  "bg-primary text-on-primary [&_a]:text-cream",
  "bg-cat text-white [&_a]:text-cream",
  "bg-cream text-ink [&_a]:text-primary-strong",
  "bg-ink text-white [&_a]:text-secondary",
];

function toneFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return TEXT_TONES[Math.abs(h) % TEXT_TONES.length];
}

export function PostCard({ post, viewerId, priority, onDeleted, full, compact }: { post: FeedPost; viewerId: string | null; priority?: boolean; onDeleted?: (id: string) => void; full?: boolean; compact?: boolean }) {
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likes, setLikes] = useState(post.like_count);
  const [caption, setCaption] = useState(post.caption);
  const [burst, setBurst] = useState(0);
  const [slide, setSlide] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.caption);
  const [saving, startSave] = useTransition();
  const lastTap = useRef(0);
  const toast = useToast();
  const name = displayName(post.author);
  const hasImages = post.image_urls.length > 0;
  const textCard = !hasImages && caption.length > 0 && caption.length <= 220 && !full;
  const tone = textCard ? toneFor(post.id) : "";
  const onDark = textCard && !tone.includes("bg-cream");

  const setLike = async (next: boolean) => {
    if (!viewerId) { toast("Log in to like posts", "info"); return; }
    if (next === liked) return;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    const res = await toggleLike(post.id, next);
    if (!res.ok) {
      setLiked(!next);
      setLikes((n) => n + (next ? -1 : 1));
      toast(res.error, "error");
    }
  };

  const onImageTap = (i: number) => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      lastTap.current = 0;
      setBurst((b) => b + 1);
      void setLike(true);
    } else {
      lastTap.current = now;
      setTimeout(() => { if (lastTap.current === now) setViewer(i); }, 310);
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    const text = caption ? caption.slice(0, 100) : `A moment from ${name} on Pupmeow`;
    try {
      if (navigator.share) { await navigator.share({ title: "Pupmeow", text, url }); return; }
      await navigator.clipboard.writeText(url);
      toast("Link copied");
    } catch { /* user cancelled */ }
  };

  const header = (
    <header className={cn("flex items-center gap-3 px-4 pt-3.5", hasImages ? "pb-1" : "pb-2")}>
      <Link href={`/u/${post.author?.username ?? ""}`} className="shrink-0"><Avatar src={post.author?.avatar_url} name={name} size="md" /></Link>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate font-bold">
          <Link href={`/u/${post.author?.username ?? ""}`} className="hover:underline">{name}</Link>
          {post.pet && <> <span className={onDark ? "text-white/70" : "text-muted"}>&amp;</span> <Link href={`/pet/${post.pet.id}`} className="hover:underline">{post.pet.name}</Link></>}
        </p>
        <p className={cn("mt-0.5 truncate text-[0.85rem]", onDark ? "text-white/75" : "text-muted")}>
          {post.area && <>{post.area} · </>}
          <Link href={`/post/${post.id}`} className="hover:underline"><time dateTime={post.created_at}>{timeAgo(post.created_at)}</time></Link>
        </p>
      </div>
      <div className={onDark ? "[&_button]:text-white/80 [&_button:hover]:bg-white/15" : undefined}>
        <ContentMenu
          targetType="post"
          targetId={post.id}
          ownerId={post.author_id}
          viewerId={viewerId}
          ownerName={name}
          onEdit={() => { setDraft(caption); setEditing(true); }}
          onDelete={async () => { const r = await deletePost(post.id); if (r.ok) onDeleted?.(post.id); return r.ok ? r : { ok: false, error: r.error }; }}
          label="Post options"
        />
      </div>
    </header>
  );

  return (
    <article className={cn("overflow-hidden rounded-[var(--radius-lg)] shadow-[var(--shadow-card)]", textCard ? tone : "bg-surface")} aria-label={`Post by ${name}`}>
      {hasImages && (
        <div className="relative">
          <div
            className={cn("no-scrollbar flex snap-x snap-mandatory overflow-x-auto bg-surface-2", full ? "aspect-square" : compact ? "aspect-[16/10]" : "aspect-[4/3]")}
            onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          >
            {post.image_urls.map((src, i) => (
              <button key={src} type="button" onClick={() => onImageTap(i)} className="relative h-full w-full shrink-0 snap-center" aria-label={`Photo ${i + 1} of ${post.image_urls.length}. Double-tap to like, tap to enlarge.`}>
                <Image src={src} alt={caption ? `${name}: ${caption.slice(0, 80)}` : `Photo by ${name}`} fill sizes={full ? "(max-width: 768px) 100vw, 720px" : "(max-width: 768px) 100vw, 420px"} className="object-cover" priority={priority && i === 0} placeholder="blur" blurDataURL={BLUR_DATA_URL} />
              </button>
            ))}
          </div>
          {burst > 0 && (
            <Heart key={burst} className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 fill-white text-white drop-shadow-lg animate-[pm-pop_700ms_ease-out_forwards]" aria-hidden />
          )}
          {post.image_urls.length > 1 && (
            <>
              <span className="absolute right-3 top-3 rounded-full bg-ink/75 px-2.5 py-1 text-xs font-extrabold text-white">{slide + 1}/{post.image_urls.length}</span>
              <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden>
                {post.image_urls.map((src, i) => <span key={src} className={cn("h-1.5 rounded-full transition-all", i === slide ? "w-5 bg-white" : "w-1.5 bg-white/60")} />)}
              </div>
            </>
          )}
        </div>
      )}

      {header}

      {caption && (
        <div className="px-4 pb-1 pt-1">
          <RichText
            text={caption}
            className={cn(
              "whitespace-pre-line break-words",
              textCard ? "font-heading text-[1.35rem] font-semibold leading-snug" : "text-[0.98rem]",
              !full && !textCard && (compact ? "line-clamp-2" : "line-clamp-4"),
            )}
          />
        </div>
      )}

      <div className={cn("flex items-center gap-1 px-2 pb-2 pt-1", onDark && "text-white")}>
        <button type="button" onClick={() => setLike(!liked)} aria-pressed={liked} aria-label={liked ? "Unlike" : "Like"} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-2 font-bold", onDark ? "hover:bg-white/15" : "hover:bg-surface-2")}>
          <Heart className={cn("h-[1.4rem] w-[1.4rem] transition-transform active:scale-125", liked && (onDark ? "fill-white" : "fill-danger text-danger"))} aria-hidden />
          <span className="tabular-nums">{compactNumber(likes)}</span>
        </button>
        <Link href={`/post/${post.id}#comments`} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-2 font-bold", onDark ? "hover:bg-white/15" : "hover:bg-surface-2")} aria-label={`${post.comment_count} comments`}>
          <MessageCircle className="h-[1.4rem] w-[1.4rem]" aria-hidden /> <span className="tabular-nums">{compactNumber(post.comment_count)}</span>
        </Link>
        <button type="button" onClick={share} className={cn("ml-auto inline-flex items-center rounded-full p-2.5", onDark ? "hover:bg-white/15" : "hover:bg-surface-2")} aria-label="Share post">
          <Share2 className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {viewer !== null && <Lightbox images={post.image_urls} startIndex={viewer} alt={`Post by ${name}`} onClose={() => setViewer(null)} />}
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit caption">
        <div className="space-y-3">
          <Textarea label="Caption" labelHidden value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={1000} rows={5} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            <Button loading={saving} onClick={() => startSave(async () => {
              const res = await editPost(post.id, draft);
              if (res.ok) { setCaption(draft.trim()); setEditing(false); toast(res.message ?? "Saved"); }
              else toast(res.error, "error");
            })}>Save</Button>
          </div>
        </div>
      </Modal>
    </article>
  );
}
