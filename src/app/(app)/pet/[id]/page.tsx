import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ChevronRight, HeartPulse, Lock, Pencil, QrCode, Syringe, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { MINI_PROFILE } from "@/lib/columns";
import { PhotoGallery } from "@/components/features/upload/lightbox";
import { PostGrid } from "@/components/features/feed/post-grid";
import { WithRail } from "@/components/layout/page-layout";
import { Steps, TipCard, SectionTitle } from "@/components/brand/bits";
import { PetImage } from "@/components/brand/pet-image";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { birthdaySoon, cn, daysUntil, displayName, dueLabel, formatAge, formatDate } from "@/lib/utils";
import type { HealthRecordRow, PetRow, PostRow } from "@/types/database";
import type { MiniProfile } from "@/types/models";

async function load(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("pets").select(`*, owner:profiles!pets_owner_id_fkey(${MINI_PROFILE})`).eq("id", id).maybeSingle();
  return data as (PetRow & { owner: MiniProfile | null }) | null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const pet = await load((await params).id);
  if (!pet) return { title: "Pet not found" };
  const desc = `${pet.name} the ${pet.breed ?? pet.species} on Pupmeow${pet.owner?.username ? `, with @${pet.owner.username}` : ""}.`;
  return { title: pet.name, description: desc, openGraph: { title: `${pet.name} on Pupmeow`, description: desc, images: pet.photo_url ? [pet.photo_url] : undefined } };
}

export default async function PetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pet = await load(id);
  if (!pet) notFound();
  const user = await getUser();
  const isOwner = user?.id === pet.owner_id;
  const age = formatAge(pet.birthday);
  const photos = pet.photo_urls?.length ? pet.photo_urls : pet.photo_url ? [pet.photo_url] : [];
  const supabase = await createClient();

  const [postsRes, recordsRes, matchRes] = await Promise.all([
    user ? supabase.from("posts").select("id, image_urls, caption, like_count, comment_count").eq("pet_id", pet.id).order("created_at", { ascending: false }).limit(30) : Promise.resolve({ data: [] }),
    isOwner ? supabase.from("pet_health_records").select("*").eq("pet_id", pet.id).order("date", { ascending: false }).limit(50) : Promise.resolve({ data: [] }),
    isOwner ? supabase.from("pet_match_profiles").select("id, is_active").eq("pet_id", pet.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const posts = (postsRes.data ?? []) as PostRow[];
  const records = (recordsRes.data ?? []) as HealthRecordRow[];
  const nextDue = records.filter((r) => r.next_due_date).sort((a, b) => a.next_due_date!.localeCompare(b.next_due_date!))[0];
  const lastVisit = records.find((r) => r.type === "vet_visit");
  const vaccines = records.filter((r) => r.type === "vaccination");
  const match = matchRes.data as { id: string; is_active: boolean } | null;
  const dog = pet.species === "dog";
  const band = dog ? "bg-secondary text-ink" : "bg-cat text-white";
  const facts = [pet.breed?.replace(/ \/ .*$/, ""), age, pet.gender !== "unknown" ? (pet.gender === "male" ? "Boy" : "Girl") : null, pet.weight_kg ? `${pet.weight_kg} kg` : null].filter(Boolean).join(" · ");

  return (
    <WithRail
      rail={
        isOwner ? (
          <TipCard tone="care" title="Private by default">
            <Steps items={["Health records are only visible to you.", "Reminders go to your calendar, a week ahead is best.", "Delete any record, anytime."]} />
          </TipCard>
        ) : (
          <TipCard tone={dog ? "adopt" : "play"} title={`Say hi to ${pet.name}`}>
            <p className={cn("text-[0.95rem] font-semibold", dog ? "text-ink/80" : "text-white/90")}>Like and comment on {pet.name}&apos;s moments, or find a playdate for your own pet nearby.</p>
            <ButtonLink href="/match" variant={dog ? "primary" : "white"} size="sm" className="mt-3"><Users className="h-4 w-4" aria-hidden /> Find a playdate</ButtonLink>
          </TipCard>
        )
      }
    >
      <article className="space-y-5">
        <section className={cn("overflow-hidden rounded-[var(--radius-xl)] p-4 sm:p-6", band)}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
            <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-[var(--radius-lg)] bg-white sm:w-56">
              {photos.length > 1 ? (
                <PhotoGallery images={photos} alt={pet.name} aspect="aspect-square" rounded="rounded-[var(--radius-lg)]" priority />
              ) : (
                <PetImage src={photos[0]} alt={pet.name} species={pet.species} hints={[pet.breed]} seed={pet.id} sizes="(max-width: 640px) 100vw, 224px" priority tint="#fff8e6" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              {birthdaySoon(pet.birthday) && <span className="mb-2 inline-flex rounded-full bg-white px-3 py-1 text-[0.85rem] font-extrabold text-ink">Birthday soon 🎂 {pet.birthday ? formatDate(pet.birthday).replace(/ \d{4}$/, "") : ""}</span>}
              <h1 className="text-[3rem] font-semibold leading-none sm:text-[3.6rem]">{pet.name}</h1>
              <p className="mt-2 text-[1.05rem] font-bold opacity-90">{facts || (dog ? "Dog" : "Cat")}</p>
              {pet.bio && <p className="mt-2 max-w-xl text-[1rem] font-semibold opacity-85">{pet.bio}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {pet.is_neutered && <span className="rounded-full bg-white px-3 py-1.5 text-[0.82rem] font-extrabold text-ink">Sterilised</span>}
                {isOwner && <ButtonLink href={`/pets/${pet.id}/edit`} variant={dog ? "primary" : "white"} size="sm"><Pencil className="h-4 w-4" aria-hidden /> Edit</ButtonLink>}
              </div>
            </div>
          </div>
        </section>

        {isOwner && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href={`/pets/${pet.id}/health`} className={cn("rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-card)]", nextDue && daysUntil(nextDue.next_due_date!) < 0 ? "bg-danger text-white" : nextDue ? "bg-ink text-white" : "bg-surface")}>
                <p className="text-xs font-extrabold uppercase tracking-wider opacity-80">Next due</p>
                <p className="mt-1 font-heading text-xl font-semibold">{nextDue ? `${nextDue.title.replace(/^Reminder:\s*/i, "")} · ${formatDate(nextDue.next_due_date).replace(/ \d{4}$/, "")}` : "Nothing due"}</p>
                <p className="text-sm font-semibold opacity-85">{nextDue ? dueLabel(nextDue.next_due_date!) : "All caught up"}</p>
              </Link>
              <div className="rounded-[var(--radius-lg)] bg-cream p-4 text-ink">
                <p className="text-xs font-extrabold uppercase tracking-wider opacity-70">Last vet visit</p>
                <p className="mt-1 font-heading text-xl font-semibold">{lastVisit ? formatDate(lastVisit.date) : "Not logged yet"}</p>
                <p className="text-sm font-semibold opacity-80">{lastVisit ? lastVisit.title : "Add one in Health records"}</p>
              </div>
            </div>

            <nav aria-label={`${pet.name}'s tools`} className="overflow-hidden rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-card)]">
              {[
                { href: `/pets/${pet.id}/health`, icon: HeartPulse, tone: "bg-primary-soft text-primary-strong", title: "Health records", text: "Private · only you", badge: <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[0.72rem] font-extrabold text-white"><Lock className="h-3 w-3" aria-hidden /> Private</span> },
                { href: `/pets/${pet.id}/health?tab=vaccination`, icon: Syringe, tone: "bg-danger-soft text-danger", title: "Vaccines and reminders", text: `${vaccines.length} logged${nextDue ? ` · next ${dueLabel(nextDue.next_due_date!)}` : ""}` },
                { href: match ? `/match/${match.id}` : `/match/new?pet=${pet.id}`, icon: Users, tone: "bg-cat-soft text-cat", title: "Playdate profile", text: match ? (match.is_active ? "Visible to people near you" : "Paused") : "Not set up yet" },
                { href: `/lost/new?pet=${pet.id}`, icon: QrCode, tone: "bg-secondary-soft text-on-secondary", title: "Lost-pet poster", text: "Ready to share in one tap if you ever need it" },
              ].map((it) => (
                <Link key={it.title} href={it.href} className="flex items-center gap-3 border-b border-border px-4 py-3.5 last:border-0 hover:bg-surface-2">
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", it.tone)}><it.icon className="h-5 w-5" aria-hidden /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{it.title}</span>
                    <span className="block truncate text-sm text-muted">{it.text}</span>
                  </span>
                  {it.badge ?? <ChevronRight className="h-5 w-5 text-muted" aria-hidden />}
                </Link>
              ))}
            </nav>
          </>
        )}

        <section aria-labelledby="pet-posts">
          <SectionTitle><span id="pet-posts">{pet.name}&apos;s moments</span></SectionTitle>
          {!user ? (
            <EmptyState tone="card" art="paw" title="Join to see posts" description={`Log in to see photos of ${pet.name}.`} action={<ButtonLink href={`/login?next=/pet/${pet.id}`}>Log in</ButtonLink>} />
          ) : posts.length ? <PostGrid posts={posts} /> : (
            <div className="rounded-[var(--radius-lg)] bg-surface p-5 text-center shadow-[var(--shadow-card)]">
              <p className="font-semibold">No posts tagged with {pet.name} yet.</p>
              {isOwner && <ButtonLink href="/post/new" size="sm" className="mt-3">Share a moment</ButtonLink>}
            </div>
          )}
        </section>

        {pet.owner && !isOwner && (
          <Link href={`/u/${pet.owner.username}`} className="flex items-center gap-3 rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-card)] hover:ring-2 hover:ring-border">
            <Avatar src={pet.owner.avatar_url} name={displayName(pet.owner)} size="md" />
            <span className="min-w-0">
              <span className="block text-xs font-extrabold uppercase tracking-wider text-muted">Lives with</span>
              <span className="block truncate font-bold">{displayName(pet.owner)}</span>
            </span>
          </Link>
        )}

        {isOwner && (
          <div className="pt-2">
            <ButtonLink href={`/lost/new?pet=${pet.id}`} variant="danger" size="lg" className="w-full shadow-[var(--shadow-lift)]">
              <AlertTriangle className="h-5 w-5" aria-hidden /> {pet.name} is missing
            </ButtonLink>
            <p className="mt-1 text-center text-xs font-semibold text-muted">Opens a lost report with {pet.name}&apos;s photo and details filled in.</p>
          </div>
        )}
      </article>
    </WithRail>
  );
}
