import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, HeartHandshake, MapPin, PawPrint, Settings, Shield, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { PROFILE_PUBLIC } from "@/lib/columns";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PetCard } from "@/components/features/pets/pet-card";
import { PostGrid } from "@/components/features/feed/post-grid";
import { FollowButton } from "@/components/features/social/follow-button";
import { ContentMenu } from "@/components/features/safety/content-menu";
import { WithRail } from "@/components/layout/page-layout";
import { SectionTitle, TipCard } from "@/components/brand/bits";
import { compactNumber, displayName } from "@/lib/utils";
import type { PetRow, PostRow, ProfileRow } from "@/types/database";

async function loadProfile(username: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select(PROFILE_PUBLIC).eq("username", username.toLowerCase()).maybeSingle();
  return data as ProfileRow | null;
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const p = await loadProfile((await params).username);
  if (!p || p.is_banned) return { title: "Profile not found" };
  return {
    title: `${displayName(p)} (@${p.username})`,
    description: p.bio ?? `${displayName(p)} is on Pupmeow, Delhi's pet community.`,
    openGraph: { images: p.avatar_url ? [p.avatar_url] : undefined },
  };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await loadProfile(username);
  if (!profile || !profile.onboarded) notFound();
  const viewer = await getViewer();
  const supabase = await createClient();
  const isMe = viewer?.id === profile.id;

  const [{ data: pets }, { data: stats }, postsRes, followRes, reqRes, adminRes] = await Promise.all([
    supabase.from("pets").select("id, name, species, breed, photo_url, birthday").eq("owner_id", profile.id).order("created_at"),
    supabase.rpc("profile_stats", { p_user: profile.id }),
    viewer ? supabase.from("posts").select("id, image_urls, caption, like_count, comment_count").eq("author_id", profile.id).order("created_at", { ascending: false }).limit(60) : Promise.resolve({ data: [] }),
    viewer && !isMe ? supabase.from("follows").select("follower_id").eq("follower_id", viewer.id).eq("following_id", profile.id).maybeSingle() : Promise.resolve({ data: null }),
    isMe ? supabase.from("match_requests").select("id", { count: "exact", head: true }).eq("to_owner_id", profile.id).eq("status", "pending") : Promise.resolve({ count: 0 }),
    isMe && profile.role === "admin" ? supabase.rpc("admin_dashboard_counts") : Promise.resolve({ data: null }),
  ]);
  const s = (stats ?? { followers: 0, following: 0, posts: 0, pets: 0 }) as { followers: number; following: number; posts: number; pets: number };
  const posts = (postsRes.data ?? []) as PostRow[];
  const petList = (pets ?? []) as PetRow[];
  const openReports = (adminRes.data as Record<string, number> | null)?.open_reports ?? 0;

  if (profile.is_banned) {
    return <EmptyState tone="card" art="paw" title="This account is suspended" description="It broke our community guidelines." />;
  }

  const menu = isMe ? [
    { href: "/pets", icon: PawPrint, title: "My pets", text: petList.map((p) => p.name).join(", ") || "Add your first pet" },
    { href: "/match/requests", icon: Users, title: "Playdate requests", text: (reqRes.count ?? 0) ? `${reqRes.count} waiting for you` : "Sent, received and matched" },
    { href: "/lost?tab=mine", icon: MapPin, title: "My lost & found reports", text: "Mark reunited, print posters" },
    { href: "/adopt?mine=1", icon: HeartHandshake, title: "My adoption listings", text: "Edit or mark adopted" },
    ...(profile.role === "admin" ? [{ href: "/admin", icon: Shield, title: "Moderation", text: `${openReports} report${openReports === 1 ? "" : "s"} waiting`, badge: openReports }] : []),
    { href: "/settings", icon: Settings, title: "Settings", text: "Profile, notifications, privacy, account" },
  ] : [];

  return (
    <WithRail
      rail={
        isMe ? (
          <TipCard tone="ink" title="Pupmeow is free forever">
            <ul className="space-y-2 text-[0.95rem] font-semibold text-white/90">
              <li>No ads in lost-pet alerts.</li>
              <li>No buying or selling animals.</li>
              <li>Made in Delhi, for NCR pet families.</li>
            </ul>
          </TipCard>
        ) : (
          <TipCard tone="care" title={`Neighbours with ${displayName(profile).split(" ")[0]}?`}>
            <p className="text-[0.95rem] font-semibold text-white/90">Follow to see their posts in your Following feed. Contact details are never shown on profiles.</p>
          </TipCard>
        )
      }
    >
      <div className="space-y-6">
        <header className="overflow-hidden rounded-[var(--radius-xl)] bg-primary p-5 text-on-primary sm:p-6">
          <div className="flex items-start gap-4">
            <Avatar src={profile.avatar_url} name={displayName(profile)} size="xl" className="ring-4 ring-white/30" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h1 className="truncate text-[2rem] font-semibold leading-tight sm:text-[2.4rem]">{displayName(profile)}</h1>
                  <p className="font-bold text-on-primary/85">@{profile.username} · {profile.area && !profile.hide_area ? profile.area : profile.city}</p>
                </div>
                {!isMe && viewer && (
                  <div className="[&_button]:text-on-primary [&_button:hover]:bg-white/15">
                    <ContentMenu targetType="profile" targetId={profile.id} ownerId={profile.id} viewerId={viewer.id} ownerName={displayName(profile)} label="Profile options" />
                  </div>
                )}
              </div>
              {profile.role === "admin" && <span className="mt-2 inline-flex rounded-full bg-white px-2.5 py-1 text-[0.75rem] font-extrabold text-ink">Pupmeow team</span>}
            </div>
          </div>
          {profile.bio && <p className="mt-4 whitespace-pre-line font-semibold text-on-primary/95">{profile.bio}</p>}
          <dl className="mt-5 grid grid-cols-4 gap-2">
            {[["Pets", petList.length], ["Posts", s.posts], ["Followers", s.followers], ["Following", s.following]].map(([k, v]) => (
              <div key={k} className="rounded-[var(--radius-md)] bg-white/15 px-2 py-2.5 text-center">
                <dd className="font-heading text-[1.6rem] font-semibold leading-none">{compactNumber(Number(v))}</dd>
                <dt className="mt-1 text-[0.78rem] font-bold text-on-primary/85">{k}</dt>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex gap-2">
            {isMe ? (
              <ButtonLink href="/settings" variant="white" size="sm"><Settings className="h-4 w-4" aria-hidden /> Edit profile</ButtonLink>
            ) : viewer ? (
              <FollowButton targetId={profile.id} initialFollowing={Boolean(followRes.data)} />
            ) : (
              <ButtonLink href={`/login?next=/u/${profile.username}`} variant="white" size="sm">Log in to follow</ButtonLink>
            )}
          </div>
        </header>

        {isMe && (
          <nav aria-label="Your stuff" className="overflow-hidden rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-card)]">
            {menu.map((m) => (
              <Link key={m.href} href={m.href} className="flex items-center gap-3 border-b border-border px-4 py-3.5 last:border-0 hover:bg-surface-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2"><m.icon className="h-5 w-5" aria-hidden /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{m.title}</span>
                  <span className="block truncate text-sm text-muted">{m.text}</span>
                </span>
                {"badge" in m && m.badge ? <span className="rounded-full bg-danger px-2.5 py-0.5 text-xs font-extrabold text-white">{m.badge}</span> : <ChevronRight className="h-5 w-5 text-muted" aria-hidden />}
              </Link>
            ))}
          </nav>
        )}

        <section aria-labelledby="pets-h">
          <SectionTitle><span id="pets-h">Pets</span></SectionTitle>
          {petList.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {petList.map((p) => <PetCard key={p.id} pet={p} />)}
            </div>
          ) : <p className="text-muted">{isMe ? "You haven't added any pets yet." : "No pets added yet."}</p>}
        </section>

        <section aria-labelledby="posts-h">
          <SectionTitle><span id="posts-h">Posts</span></SectionTitle>
          {!viewer ? (
            <EmptyState tone="card" art="paw" title="Join to see posts" description="Posts are visible to Pupmeow members." action={<ButtonLink href={`/login?next=/u/${profile.username}`}>Log in</ButtonLink>} />
          ) : posts.length ? <PostGrid posts={posts} /> : (
            <EmptyState tone="card" art="paw" title="No posts yet" description={isMe ? "Share your first moment!" : undefined} action={isMe ? <ButtonLink href="/post/new">New post</ButtonLink> : undefined} />
          )}
        </section>
      </div>
    </WithRail>
  );
}
