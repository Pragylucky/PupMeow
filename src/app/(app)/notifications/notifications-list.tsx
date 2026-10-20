"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, UserPlus, AtSign, Users, MapPin, Bell, CheckCheck, ChevronRight, Sparkles } from "lucide-react";
import { markNotificationsRead } from "@/lib/actions/posts";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, displayName, timeAgo } from "@/lib/utils";
import type { NotificationWithActor } from "@/types/models";

const ICONS: Record<string, typeof Bell> = {
  like: Heart, comment: MessageCircle, follow: UserPlus, mention: AtSign,
  match_request: Users, match_accepted: Users, match_declined: Users, lost_nearby: MapPin, lost_match: Sparkles,
};

function hrefFor(n: NotificationWithActor) {
  switch (n.entity_type) {
    case "post": return `/post/${n.entity_id}`;
    case "profile": return n.actor?.username ? `/u/${n.actor.username}` : "/notifications";
    case "lost_found": return `/lost/${n.entity_id}`;
    case "adoption": return `/adopt/${n.entity_id}`;
    case "match_request": return "/match/requests";
    case "match_profile": return `/match/${n.entity_id}`;
    default: return "/notifications";
  }
}

function group(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const days = Math.floor((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days < 7) return "This week";
  return "Earlier";
}

export function NotificationsList({ initial }: { initial: NotificationWithActor[] }) {
  const [items, setItems] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  const unread = items.filter((n) => !n.is_read).length;
  const groups = ["Today", "This week", "Earlier"].map((g) => ({ g, list: items.filter((n) => group(n.created_at) === g) })).filter((x) => x.list.length);

  const open = (n: NotificationWithActor) => {
    if (!n.is_read) {
      void markNotificationsRead([n.id]);
      setItems((all) => all.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    }
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[2rem] font-semibold leading-tight sm:text-[2.4rem]">Notifications</h1>
          <p className="mt-1 text-muted">{unread ? `${unread} new` : "You're all caught up"}</p>
        </div>
        {unread > 0 && (
          <Button variant="outline" loading={pending} onClick={() => start(async () => {
            await markNotificationsRead();
            setItems((all) => all.map((n) => ({ ...n, is_read: true })));
            router.refresh();
          })}><CheckCheck className="h-4 w-4" aria-hidden /> Mark all as read</Button>
        )}
      </div>
      {items.length === 0 ? (
        <EmptyState tone="card" art="bell" title="All quiet for now" description="Likes, comments, playdate requests and lost-pet alerts near you will show up here." />
      ) : (
        <div className="space-y-6">
          {groups.map(({ g, list }) => (
            <section key={g} aria-label={g}>
              <h2 className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-muted">{g}</h2>
              <ul className="space-y-2">
                {list.map((n) => {
                  const Icon = ICONS[n.type] ?? Bell;
                  const lost = n.type === "lost_nearby" || n.type === "lost_match";
                  const match = n.type.startsWith("match");
                  return (
                    <li key={n.id}>
                      <Link
                        href={hrefFor(n)}
                        onClick={() => open(n)}
                        className={cn(
                          "flex items-center gap-3 rounded-[var(--radius-lg)] px-4 py-3 shadow-[var(--shadow-card)] transition-colors",
                          lost ? "halftone bg-danger text-white hover:bg-danger-strong" : "bg-surface hover:bg-surface-2",
                          !lost && !n.is_read && "bg-secondary-soft hover:bg-secondary-soft/70",
                        )}
                      >
                        <span className="relative shrink-0">
                          {lost ? (
                            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20"><Icon className="h-5 w-5" aria-hidden /></span>
                          ) : (
                            <>
                              <Avatar src={n.actor?.avatar_url} name={displayName(n.actor)} size="md" />
                              <span className={cn("absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-surface",
                                n.type === "like" ? "bg-danger text-white" : match ? "bg-cat text-white" : "bg-primary text-on-primary")}>
                                <Icon className="h-3 w-3" aria-hidden />
                              </span>
                            </>
                          )}
                        </span>
                        <span className="min-w-0 flex-1 text-[0.95rem]">
                          {lost ? (
                            <strong className="block">{n.type === "lost_match" ? "Possible match for your lost pet" : "Lost pet near you"}</strong>
                          ) : (
                            <strong>{n.actor ? displayName(n.actor) : "Pupmeow"} </strong>
                          )}
                          <span className={lost ? "text-white/90" : undefined}>{lost && n.actor ? `${displayName(n.actor)} ` : ""}{n.message}</span>
                          <span className={cn("block text-xs", lost ? "text-white/80" : "text-muted")}>{timeAgo(n.created_at)}</span>
                        </span>
                        {match && n.type === "match_request" ? (
                          <span className="shrink-0 rounded-full bg-cat px-3 py-1 text-sm font-extrabold text-white">View</span>
                        ) : !n.is_read && !lost ? (
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-danger" aria-label="Unread" />
                        ) : lost ? <ChevronRight className="h-5 w-5 shrink-0" aria-hidden /> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
