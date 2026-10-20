"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Send, Trash2, Heart } from "lucide-react";
import { addComment, deleteComment, getLikers } from "@/lib/actions/posts";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { ContentMenu } from "@/components/features/safety/content-menu";
import { RichText } from "@/components/features/feed/rich-text";
import { displayName, timeAgo } from "@/lib/utils";
import type { ProfileRow } from "@/types/database";
import type { CommentWithAuthor, MiniProfile } from "@/types/models";

export function Comments({ postId, postAuthorId, viewer, initial, likeCount, isAdmin }: { postId: string; postAuthorId: string; viewer: ProfileRow; initial: CommentWithAuthor[]; likeCount: number; isAdmin: boolean }) {
  const [comments, setComments] = useState(initial);
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const [likersOpen, setLikersOpen] = useState(false);
  const [likers, setLikers] = useState<MiniProfile[] | null>(null);
  const toast = useToast();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    start(async () => {
      const res = await addComment(postId, body);
      if (res.ok && res.data) { setComments((c) => [...c, res.data!]); setBody(""); }
      else if (!res.ok) toast(res.error, "error");
    });
  };

  return (
    <section id="comments" aria-labelledby="comments-h" className="space-y-4 rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="flex items-center justify-between">
        <h2 id="comments-h" className="text-xl font-semibold">Comments <span className="text-muted">{comments.length}</span></h2>
        <button type="button" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline" onClick={async () => {
          setLikersOpen(true);
          if (!likers) { const r = await getLikers(postId); setLikers(r.ok ? r.data ?? [] : []); }
        }}>
          <Heart className="h-4 w-4" aria-hidden /> See likes
        </button>
      </div>
      <form onSubmit={submit} className="flex items-end gap-2">
        <Avatar src={viewer.avatar_url} name={displayName(viewer)} size="sm" className="mb-1.5" />
        <label htmlFor="new-comment" className="sr-only">Add a comment</label>
        <textarea id="new-comment" value={body} onChange={(e) => setBody(e.target.value)} maxLength={500} rows={1} placeholder="Add a comment…"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) submit(e); }}
          className="min-h-11 flex-1 resize-none rounded-[1.4rem] border-2 border-border bg-surface px-4 py-2.5 text-[0.95rem] focus:border-primary focus:outline-none" />
        <Button type="submit" size="icon" loading={pending} disabled={!body.trim()} aria-label="Post comment"><Send className="h-4 w-4" /></Button>
      </form>
      {comments.length === 0 ? <p className="text-sm text-muted">No comments yet. Say something nice!</p> : (
        <ul className="space-y-3">
          {comments.map((c) => {
            const canDelete = c.author_id === viewer.id || postAuthorId === viewer.id || isAdmin;
            return (
              <li key={c.id} className="flex gap-3">
                <Link href={`/u/${c.author?.username ?? ""}`}><Avatar src={c.author?.avatar_url} name={displayName(c.author)} size="sm" /></Link>
                <div className="min-w-0 flex-1 rounded-[1.1rem] rounded-tl-sm bg-surface-2 px-3.5 py-2.5">
                  <p className="text-sm"><Link href={`/u/${c.author?.username ?? ""}`} className="font-bold hover:underline">{displayName(c.author)}</Link> <span className="text-xs text-muted">{timeAgo(c.created_at)}</span></p>
                  <RichText text={c.body} className="whitespace-pre-line break-words text-sm" />
                </div>
                {canDelete ? (
                  <button type="button" aria-label="Delete comment" className="self-start rounded-full p-2 text-muted hover:text-danger" onClick={() => start(async () => {
                    const r = await deleteComment(c.id);
                    if (r.ok) setComments((all) => all.filter((x) => x.id !== c.id)); else toast(r.error, "error");
                  })}><Trash2 className="h-4 w-4" /></button>
                ) : (
                  <ContentMenu targetType="comment" targetId={c.id} ownerId={c.author_id} viewerId={viewer.id} ownerName={displayName(c.author)} label="Comment options" />
                )}
              </li>
            );
          })}
        </ul>
      )}
      <Modal open={likersOpen} onClose={() => setLikersOpen(false)} title={`Liked by ${likeCount}`}>
        {!likers ? <div className="flex justify-center py-6"><Spinner label="Loading" /></div> : likers.length === 0 ? <p className="text-sm text-muted">No likes yet.</p> : (
          <ul className="divide-y divide-border">
            {likers.map((u) => (
              <li key={u.id}><Link href={`/u/${u.username ?? ""}`} className="flex items-center gap-3 py-2.5 font-semibold hover:text-primary"><Avatar src={u.avatar_url} name={displayName(u)} size="sm" />{displayName(u)}</Link></li>
            ))}
          </ul>
        )}
      </Modal>
    </section>
  );
}
