import type { Metadata } from "next";
import { OnlyAt } from "@/components/layout/only-at";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { canViewHiddenContent } from "@/lib/moderation/visibility";
import { createClient } from "@/lib/supabase/server";
import { MINI_PROFILE } from "@/lib/columns";
import { PhotoGallery } from "@/components/features/upload/lightbox";
import { ContentMenu } from "@/components/features/safety/content-menu";
import { WithRail } from "@/components/layout/page-layout";
import { Steps, TipCard } from "@/components/brand/bits";
import { PetImage } from "@/components/brand/pet-image";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { displayName, formatAge } from "@/lib/utils";
import { RequestForm, MatchOwnerActions } from "./match-client";
import type { MatchProfileCard } from "@/types/models";
import type { PetRow } from "@/types/database";

export const metadata: Metadata = { title: "Playdate profile", robots: { index: false } };

export default async function MatchProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const profile = await requireProfile(`/match/${id}`);
  const supabase = await createClient();
  const { data } = await supabase
    .from("pet_match_profiles")
    .select(`*, pet:pets(id, name, species, breed, gender, birthday, photo_url, is_neutered), owner:profiles!pet_match_profiles_owner_id_fkey(${MINI_PROFILE})`)
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const m = data as MatchProfileCard;
  if (!canViewHiddenContent({ is_hidden: m.is_hidden, author_id: m.owner_id }, profile)) notFound();
  const isOwner = m.owner_id === profile.id;
  const [{ data: myPets }, { data: existing }] = await Promise.all([
    isOwner ? Promise.resolve({ data: [] }) : supabase.from("pets").select("id, name, species, gender, birthday").eq("owner_id", profile.id).eq("species", m.pet?.species ?? "dog"),
    isOwner ? Promise.resolve({ data: [] }) : supabase.from("match_requests").select("id, status").eq("to_pet_id", m.pet_id).eq("from_owner_id", profile.id).order("created_at", { ascending: false }).limit(1),
  ]);
  const prior = ((existing ?? []) as { id: string; status: string }[])[0];
  const photos = m.photo_urls.length ? m.photo_urls : m.pet?.photo_url ? [m.pet.photo_url] : [];
  const facts = [m.pet?.breed?.replace(/ \/ .*$/, ""), formatAge(m.pet?.birthday), m.pet?.gender !== "unknown" ? (m.pet?.gender === "male" ? "Male" : "Female") : null].filter(Boolean).join(" · ");
  const name = m.pet?.name ?? "This pet";

  const actions = isOwner ? (
    <MatchOwnerActions id={m.id} active={m.is_active} petId={m.pet_id} />
  ) : prior && prior.status !== "declined" ? (
    <section className="space-y-2 rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-card)]">
      <p className="font-heading text-xl font-semibold">{prior.status === "accepted" ? `You and ${name} are matched!` : "Request sent"}</p>
      <p className="text-sm text-muted">{prior.status === "accepted" ? "Contact details are unlocked on your requests page." : `Waiting for ${name}'s family to reply. We'll notify you.`}</p>
      <ButtonLink href={`/match/requests?tab=${prior.status === "accepted" ? "accepted" : "sent"}`} variant={prior.status === "accepted" ? "whatsapp" : "outline"} className="w-full">
        {prior.status === "accepted" ? "Open contact" : "See my requests"}
      </ButtonLink>
    </section>
  ) : (
    <RequestForm toPetId={m.pet_id} toPetName={name} lookingFor={m.looking_for} myPets={(myPets ?? []) as Pick<PetRow, "id" | "name" | "species" | "gender" | "birthday">[]} species={m.pet?.species ?? "dog"} />
  );

  return (
    <WithRail
      rail={
        <>
          <OnlyAt wide>{actions}</OnlyAt>
          <TipCard tone="play" title="Playdate safety">
            <Steps items={["First meet in a public park, never at home.", "Owners confirm both pets are vaccinated.", "Leashes on for the first 10 minutes."]} />
          </TipCard>
        </>
      }
    >
      <article className="space-y-5">
        <Link href="/match" className="inline-flex items-center gap-1 text-sm font-bold text-muted hover:text-text"><ChevronLeft className="h-4 w-4" aria-hidden /> Playdates</Link>
        {!m.is_active && <p className="rounded-[var(--radius-md)] bg-warning-soft px-3 py-2 text-sm font-semibold text-warning">This profile is paused.</p>}
        <section className="overflow-hidden rounded-[var(--radius-xl)] bg-cat text-white">
          {photos.length ? (
            <PhotoGallery images={photos} alt={name} aspect="aspect-[4/3] sm:aspect-[16/9]" rounded="rounded-none" priority />
          ) : (
            <div className="relative aspect-[16/9]"><PetImage alt={name} species={m.pet?.species} hints={[m.pet?.breed]} tint="#ece7ff" /></div>
          )}
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-[2.6rem] font-semibold leading-none sm:text-[3rem]">{name}</h1>
                <p className="mt-2 text-[1.05rem] font-bold text-white/90">{facts}</p>
                <p className="mt-1 flex items-center gap-1 text-[0.95rem] font-semibold text-white/85"><MapPin className="h-4 w-4" aria-hidden /> {m.area}</p>
              </div>
              <div className="[&_button]:text-white [&_button:hover]:bg-white/15">
                <ContentMenu targetType="match_profile" targetId={m.id} ownerId={m.owner_id} viewerId={profile.id} ownerName={displayName(m.owner)} label="Profile options" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-3 py-1.5 text-[0.85rem] font-extrabold text-ink">{m.looking_for === "both" ? "Playdates & breeding" : m.looking_for === "playdate" ? "Playdates" : "Breeding"}</span>
            </div>
          </div>
        </section>

        <OnlyAt wide={false}>{actions}</OnlyAt>

        <dl className="grid gap-3 sm:grid-cols-3">
          {[
            ["Vaccines", m.health_confirmed ? "Owner confirms up to date" : "Not confirmed"],
            ["Sterilised", m.pet?.is_neutered ? "Yes" : "No"],
            ["Papers", m.has_papers ? "Has papers" : "No papers"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-card)]">
              <dt className="text-xs font-extrabold uppercase tracking-wider text-muted">{k}</dt>
              <dd className="mt-1 font-bold">{v}</dd>
            </div>
          ))}
        </dl>

        <section className="rounded-[var(--radius-lg)] bg-cream p-5 text-ink">
          <h2 className="text-xl font-semibold">{m.owner ? `${displayName(m.owner).split(" ")[0]}'s playdate style` : "About"}</h2>
          <p className="mt-2 whitespace-pre-line text-[1.02rem] leading-relaxed">{m.about}</p>
        </section>

        {m.owner && (
          <Link href={`/u/${m.owner.username}`} className="flex items-center gap-3 rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-card)] hover:ring-2 hover:ring-border">
            <Avatar src={m.owner.avatar_url} name={displayName(m.owner)} size="md" />
            <span className="min-w-0">
              <span className="block text-xs font-extrabold uppercase tracking-wider text-muted">Lives with</span>
              <span className="block truncate font-bold">{displayName(m.owner)}</span>
            </span>
          </Link>
        )}
      </article>
    </WithRail>
  );
}
