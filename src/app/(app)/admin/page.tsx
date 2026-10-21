import type { Metadata } from "next";
import Link from "next/link";
import { EyeOff, X } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MINI_PROFILE, PROFILE_PUBLIC, LOST_FOUND_COLUMNS, ADOPTION_COLUMNS } from "@/lib/columns";
import { Tabs } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/chip";
import { PetImage } from "@/components/brand/pet-image";
import { REPORT_REASONS } from "@/lib/constants";
import { cn, displayName, formatDate, sinceLabel } from "@/lib/utils";
import { moderationPreviewImage } from "@/lib/moderation/visibility";
import { ReportActions, BanButton } from "./admin-client";
import { ReportQueueRow } from "./report-queue-row";
import type { ProfileRow, ReportRow, ReportTarget } from "@/types/database";
import type { MiniProfile } from "@/types/models";

export const metadata: Metadata = { title: "Moderation", robots: { index: false } };

interface Preview { title: string; text: string; image?: string; hidden: boolean; href: string; kind: string }
type Report = ReportRow & { reporter: MiniProfile | null; owner: (MiniProfile & { is_banned: boolean; created_at?: string }) | null };

const KIND: Record<ReportTarget, { label: string; tone: string }> = {
  post: { label: "Feed", tone: "bg-primary text-on-primary" },
  comment: { label: "Comment", tone: "bg-primary-soft text-primary-strong" },
  profile: { label: "User", tone: "bg-ink text-white" },
  lost_found: { label: "Lost", tone: "bg-danger text-white" },
  adoption: { label: "Adopt", tone: "bg-secondary text-ink" },
  match_profile: { label: "Playdate", tone: "bg-cat text-white" },
};
const REASON = Object.fromEntries([...REPORT_REASONS.map((r) => [r.value, r.label]), ["ai_flag", "Flagged by AI"]]) as Record<string, string>;
const TYPE_FILTERS: { value: string; label: string; types: ReportTarget[] }[] = [
  { value: "all", label: "All", types: ["post", "comment", "profile", "lost_found", "adoption", "match_profile"] },
  { value: "lost", label: "Lost", types: ["lost_found"] },
  { value: "adopt", label: "Adopt", types: ["adoption"] },
  { value: "feed", label: "Feed", types: ["post", "comment"] },
  { value: "user", label: "User", types: ["profile"] },
  { value: "play", label: "Playdates", types: ["match_profile"] },
];

async function previews(supabase: Awaited<ReturnType<typeof createClient>>, reports: ReportRow[]) {
  const ids = (t: ReportTarget) => [...new Set(reports.filter((r) => r.target_type === t).map((r) => r.target_id))];
  const map = new Map<string, Preview>();
  const [posts, comments, profiles, lost, adopt, matches] = await Promise.all([
    ids("post").length ? supabase.from("posts").select("id, caption, image_urls, is_hidden, author_id").in("id", ids("post")) : null,
    ids("comment").length ? supabase.from("comments").select("id, body, is_hidden, post_id, author_id").in("id", ids("comment")) : null,
    ids("profile").length ? supabase.from("profiles").select(PROFILE_PUBLIC).in("id", ids("profile")) : null,
    ids("lost_found").length ? supabase.from("lost_found").select(LOST_FOUND_COLUMNS).in("id", ids("lost_found")) : null,
    ids("adoption").length ? supabase.from("adoptions").select(ADOPTION_COLUMNS).in("id", ids("adoption")) : null,
    ids("match_profile").length ? supabase.from("pet_match_profiles").select("id, about, photo_urls, is_hidden, owner_id").in("id", ids("match_profile")) : null,
  ]);
  for (const p of (posts?.data ?? []) as { id: string; caption: string; image_urls: string[]; is_hidden: boolean }[]) map.set(p.id, { kind: "Post", title: p.caption.slice(0, 70) || "Photo post", text: p.caption, image: p.image_urls[0], hidden: p.is_hidden, href: `/post/${p.id}` });
  for (const c of (comments?.data ?? []) as { id: string; body: string; is_hidden: boolean; post_id: string }[]) map.set(c.id, { kind: "Comment", title: c.body.slice(0, 70), text: c.body, hidden: c.is_hidden, href: `/post/${c.post_id}#comments` });
  for (const p of (profiles?.data ?? []) as ProfileRow[]) map.set(p.id, { kind: "Profile", title: `@${p.username}`, text: p.bio ?? "", image: p.avatar_url ?? undefined, hidden: p.is_banned, href: `/u/${p.username}` });
  for (const l of (lost?.data ?? []) as { id: string; type: string; pet_name: string | null; description: string; photo_urls: string[]; is_hidden: boolean }[]) map.set(l.id, { kind: l.type === "lost" ? "Lost report" : "Found report", title: `${l.type === "lost" ? "LOST" : "FOUND"} ${l.pet_name ?? ""}`.trim(), text: l.description, image: l.photo_urls[0], hidden: l.is_hidden, href: `/lost/${l.id}` });
  for (const a of (adopt?.data ?? []) as { id: string; pet_name: string; description: string; photo_urls: string[]; is_hidden: boolean; area: string }[]) map.set(a.id, { kind: "Adoption", title: `${a.pet_name} · ${a.area}`, text: a.description, image: a.photo_urls[0], hidden: a.is_hidden, href: `/adopt/${a.id}` });
  for (const m of (matches?.data ?? []) as { id: string; about: string; photo_urls: string[]; is_hidden: boolean }[]) map.set(m.id, { kind: "Playdate profile", title: m.about.slice(0, 70), text: m.about, image: m.photo_urls[0], hidden: m.is_hidden, href: `/match/${m.id}` });
  return map;
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string; status?: string; q?: string; type?: string; report?: string }> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const tab = sp.tab === "users" ? "users" : "reports";
  const status = ["open", "resolved", "dismissed"].includes(sp.status ?? "") ? sp.status! : "open";
  const type = TYPE_FILTERS.find((t) => t.value === sp.type) ?? TYPE_FILTERS[0];
  const supabase = await createClient();
  const { data: countsRaw } = await supabase.rpc("admin_dashboard_counts");
  const counts = (countsRaw ?? {}) as Record<string, number>;

  const stats: [string, number | undefined, string][] = [
    ["Open reports", counts.open_reports, "bg-danger text-white"], ["Members", counts.users, "bg-surface"], ["Posts", counts.posts, "bg-surface"],
    ["Lost (open)", counts.lost_open, "bg-surface"], ["Reunited", counts.reunited, "bg-primary text-on-primary"], ["Adopted", counts.adopted, "bg-secondary text-ink"],
  ];

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="inline-flex rounded-full bg-ink px-3 py-1 text-xs font-extrabold text-white">Moderator · {displayName(admin).split(" ")[0]}</p>
          <h1 className="mt-2 text-[2rem] font-semibold leading-tight sm:text-[2.4rem]">Moderation</h1>
          <p className="text-sm text-muted">Every action is saved with the moderator&apos;s name.</p>
        </div>
        <Tabs ariaLabel="Admin sections" value={tab} items={[{ value: "reports", label: "Reports queue", href: "/admin?tab=reports", count: counts.open_reports ?? 0 }, { value: "users", label: "Users", href: "/admin?tab=users" }]} />
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map(([label, n, tone]) => (
          <div key={label} className={cn("rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-card)]", tone)}>
            <dt className="text-xs font-extrabold uppercase tracking-wider opacity-80">{label}</dt>
            <dd className="mt-1 font-heading text-[2rem] font-semibold leading-none">{n ?? 0}</dd>
          </div>
        ))}
      </dl>
      {tab === "reports" ? <ReportsQueue status={status} type={type} selected={sp.report} supabase={supabase} /> : <UsersPanel q={sp.q ?? ""} supabase={supabase} />}
      <AuditLog supabase={supabase} />
    </div>
  );
}

async function AuditLog({ supabase }: { supabase: Awaited<ReturnType<typeof createClient>> }) {
  const { data } = await supabase
    .from("admin_audit_log")
    .select("id, action, target_type, target_id, details, created_at, admin:profiles!admin_audit_log_admin_id_fkey(username, display_name)")
    .order("created_at", { ascending: false })
    .limit(40);
  const rows = data ?? [];
  if (!rows.length) return null;
  return (
    <section className="rounded-[var(--radius-lg)] bg-surface p-5 shadow-[var(--shadow-card)]">
      <h2 className="text-xl font-semibold">Audit log</h2>
      <p className="mt-1 text-sm text-muted">Recent moderator actions (bans, etc.).</p>
      <ul className="mt-4 divide-y divide-border">
        {rows.map((row) => {
          const rawAdmin = row.admin as { username: string | null; display_name: string | null } | { username: string | null; display_name: string | null }[] | null;
          const admin = Array.isArray(rawAdmin) ? rawAdmin[0] : rawAdmin;
          return (
            <li key={row.id} className="py-3 text-sm">
              <p className="font-bold">
                {row.action.replace(/_/g, " ")}
                {admin?.username ? ` · @${admin.username}` : ""}
                <span className="font-semibold text-muted"> · {sinceLabel(row.created_at)} ago</span>
              </p>
              {row.details && <p className="mt-1 text-muted">{row.details}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

async function ReportsQueue({ status, type, selected, supabase }: { status: string; type: (typeof TYPE_FILTERS)[number]; selected?: string; supabase: Awaited<ReturnType<typeof createClient>> }) {
  const { data } = await supabase
    .from("reports")
    .select(`*, reporter:profiles!reports_reporter_id_fkey(${MINI_PROFILE}), owner:profiles!reports_target_owner_id_fkey(${MINI_PROFILE}, is_banned, created_at)`)
    .eq("status", status)
    .in("target_type", type.types)
    .order("created_at", { ascending: status === "open" })
    .limit(100);
  const raw = (data ?? []) as Report[];
  const map = await previews(supabase, raw);

  // Group reports about the same item so moderators act once.
  const groups = new Map<string, Report[]>();
  for (const r of raw) groups.set(`${r.target_type}:${r.target_id}`, [...(groups.get(`${r.target_type}:${r.target_id}`) ?? []), r]);
  const rows = [...groups.values()];
  const current = rows.find((g) => g.some((r) => r.id === selected)) ?? rows[0] ?? null;
  const href = (p: Record<string, string>) => `/admin?${new URLSearchParams({ tab: "reports", status, type: type.value, ...p })}`;
  const activeReportId = current?.[0]?.id;

  return (
    <div className={cn("grid gap-5", rows.length > 0 && "xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]")}>
      <section className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <nav aria-label="Report type" className="no-scrollbar flex gap-2 overflow-x-auto">
            {TYPE_FILTERS.map((t) => <FilterChip key={t.value} href={`/admin?${new URLSearchParams({ tab: "reports", status, type: t.value })}`} active={t.value === type.value}>{t.label}</FilterChip>)}
          </nav>
          <nav aria-label="Status" className="flex gap-1 rounded-full bg-surface-2 p-1">
            {["open", "resolved", "dismissed"].map((s) => (
              <Link key={s} href={`/admin?${new URLSearchParams({ tab: "reports", status: s, type: type.value })}`} className={cn("rounded-full px-3.5 py-1.5 text-sm font-bold capitalize", s === status ? "bg-strong text-on-strong" : "text-muted hover:text-text")}>{s}</Link>
            ))}
          </nav>
        </div>
        {rows.length === 0 ? (
          <EmptyState tone="card" art="paw" title="Queue is clear" description="Nothing to review here. Good job, team." />
        ) : (
          <div className="overflow-hidden rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-card)]">
            <div className="hidden grid-cols-[minmax(0,1fr)_minmax(7rem,9rem)_3.5rem_4rem_minmax(10.5rem,auto)] gap-4 border-b border-border px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-muted lg:grid">
              <span>Reported item</span><span>Reason</span><span className="text-center">#</span><span className="text-right">Age</span><span className="text-right">Actions</span>
            </div>
            <ul>
              {rows.map((g) => {
                const r = g[0];
                const p = map.get(r.target_id);
                const kind = KIND[r.target_type];
                const reasons = [...new Set(g.map((x) => REASON[x.reason] ?? x.reason))];
                return (
                  <ReportQueueRow
                    key={r.id}
                    href={href({ report: r.id })}
                    active={activeReportId === r.id}
                    reasons={reasons}
                    reportCount={g.length}
                    createdAt={r.created_at}
                    ownerUsername={r.owner?.username}
                    targetType={r.target_type}
                    targetId={r.target_id}
                    preview={p ? { title: p.title, hidden: p.hidden, image: p.image, kindLabel: kind.label, kindTone: kind.tone } : undefined}
                  />
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {current ? (() => {
        const r = current[0];
        const p = map.get(r.target_id);
        const counts = new Map<string, number>();
        for (const x of current) counts.set(REASON[x.reason] ?? x.reason, (counts.get(REASON[x.reason] ?? x.reason) ?? 0) + 1);
        return (
          <aside aria-label="Report details" className="max-h-[calc(100dvh-7rem)] space-y-4 overflow-y-auto lg:sticky lg:top-[5.5rem] lg:self-start">
            <section className="rounded-[var(--radius-lg)] bg-surface p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-muted">Report · {current.length} {current.length === 1 ? "reporter" : "reporters"}</p>
                  <h2 className="mt-1 text-xl font-semibold leading-tight">{p?.title ?? "Deleted content"}</h2>
                  <p className="mt-1 text-sm text-muted">First report {sinceLabel(current.at(-1)!.created_at)} ago</p>
                </div>
                <Link href={href({})} scroll={false} className="rounded-full p-2 text-muted hover:bg-surface-2" aria-label="Close details"><X className="h-5 w-5" /></Link>
              </div>
              {p ? (
                <div className="mt-4 overflow-hidden rounded-[var(--radius-md)] border-2 border-border">
                  {p.hidden && (
                    <p className="flex items-center gap-2 bg-warning-soft px-3 py-2 text-sm font-semibold text-warning">
                      <EyeOff className="h-4 w-4 shrink-0" aria-hidden /> Hidden for review — photos withheld here. Public cannot see this listing.
                    </p>
                  )}
                  {moderationPreviewImage(p) ? (
                    <Link href={p.href} target="_blank" className="block hover:opacity-95">
                      <span className="relative block aspect-[16/9]"><PetImage src={moderationPreviewImage(p)!} alt="" species="dog" sizes="380px" /></span>
                    </Link>
                  ) : null}
                  <div className="p-3">
                    {!p.hidden && (
                      <Link href={p.href} target="_blank" className="text-sm font-bold text-primary underline">Open on Pupmeow</Link>
                    )}
                    <span className={cn("mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-extrabold", KIND[r.target_type].tone)}>{p.kind}</span>
                    <span className="mt-2 block whitespace-pre-line text-[0.92rem]">{highlight(p.text)}</span>
                  </div>
                </div>
              ) : <p className="mt-3 text-sm text-muted">The content was removed. Reports stay in the queue until you resolve or dismiss them.</p>}
              <h3 className="mt-5 font-heading text-lg font-semibold">Why people reported it</h3>
              <ul className="mt-2 space-y-1.5 text-[0.92rem]">
                {[...counts.entries()].map(([k, n]) => <li key={k} className="flex gap-2"><span className="w-7 shrink-0 font-extrabold">{n}×</span><span>{k}</span></li>)}
                {current.filter((x) => x.details).map((x) => <li key={x.id} className="rounded-[var(--radius-md)] bg-surface-2 px-3 py-2">“{x.details}”</li>)}
                {current.filter((x) => x.ai_reason).map((x) => <li key={x.id} className="rounded-[var(--radius-md)] bg-cat-soft px-3 py-2"><strong>AI:</strong> {x.ai_reason}</li>)}
              </ul>
              {r.owner && (
                <Link href={`/u/${r.owner.username}`} className="mt-4 flex items-center gap-3 rounded-[var(--radius-md)] bg-surface-2 p-3 hover:bg-border">
                  <Avatar src={r.owner.avatar_url} name={displayName(r.owner)} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">@{r.owner.username}{r.owner.is_banned && " · banned"}</span>
                    {r.owner.created_at && <span className="block text-xs text-muted">Joined {sinceLabel(r.owner.created_at)} ago</span>}
                  </span>
                  <span className="text-sm font-bold text-primary">View user</span>
                </Link>
              )}
            </section>
            <section className="rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-card)]">
              <ReportActions reportIds={current.map((x) => x.id)} status={r.status} targetType={r.target_type} targetId={r.target_id} hidden={p?.hidden ?? false} contentExists={Boolean(p)} ownerId={r.owner?.id ?? null} ownerBanned={r.owner?.is_banned ?? false} />
            </section>
          </aside>
        );
      })() : null}
    </div>
  );
}

/** Highlights money words that usually mean a sale or a scam. */
function highlight(text: string) {
  const re = /(₹\s?[\d,]+|rs\.?\s?[\d,]+|\bupi\b|transport fee|rehoming fee|deposit|price|paytm|gpay|for sale|\bsell(?:ing)?\b)/gi;
  const parts = text.split(re);
  return parts.map((part, i) => (i % 2 === 1 ? <mark key={i} className="rounded bg-danger-soft px-0.5 font-bold text-danger">{part}</mark> : part));
}

async function UsersPanel({ q, supabase }: { q: string; supabase: Awaited<ReturnType<typeof createClient>> }) {
  const clean = q.replace(/[%_,()*\\:."']/g, "").trim().slice(0, 40);
  let query = supabase.from("profiles").select(PROFILE_PUBLIC).order("created_at", { ascending: false }).limit(40);
  if (clean) query = query.or(`username.ilike.%${clean}%,display_name.ilike.%${clean}%`);
  const { data } = await query;
  const users = (data ?? []) as ProfileRow[];
  return (
    <section className="space-y-3">
      <form action="/admin" className="flex gap-2">
        <input type="hidden" name="tab" value="users" />
        <label htmlFor="admin-q" className="sr-only">Search users</label>
        <input id="admin-q" name="q" defaultValue={q} placeholder="Search by name or username" className="h-12 flex-1 rounded-full border-2 border-border bg-surface px-5 focus:border-primary focus:outline-none" />
        <button className="h-12 rounded-full bg-strong px-6 font-bold text-on-strong">Search</button>
      </form>
      <h2 className="text-xl font-semibold">{clean ? "Results" : "Recent sign-ups"}</h2>
      <ul className="overflow-hidden rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-card)]">
        {users.map((u) => (
          <li key={u.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
            <Avatar src={u.avatar_url} name={displayName(u)} size="md" />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1.5 truncate font-bold">{displayName(u)} {u.role === "admin" && <Badge tone="primary">admin</Badge>} {u.is_banned && <Badge tone="danger">banned</Badge>}</p>
              <p className="truncate text-sm text-muted">{u.username ? <Link href={`/u/${u.username}`} className="hover:underline">@{u.username}</Link> : "not onboarded"} · joined {formatDate(u.created_at)} · {u.area ?? u.city}</p>
            </div>
            {u.role !== "admin" && <BanButton userId={u.id} banned={u.is_banned} />}
          </li>
        ))}
      </ul>
    </section>
  );
}
