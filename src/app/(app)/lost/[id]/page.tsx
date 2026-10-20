import type { Metadata } from "next";
import { OnlyAt } from "@/components/layout/only-at";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink, MapPin, Printer } from "lucide-react";
import { getUser } from "@/lib/auth";
import { isAiEnabled } from "@/lib/ai/config";
import { PhotoGallery } from "@/components/features/upload/lightbox";
import { ContactButton } from "@/components/features/listings/contact-button";
import { ShareButtons } from "@/components/features/listings/share-buttons";
import { Celebration } from "@/components/features/listings/celebration";
import { ContentMenu } from "@/components/features/safety/content-menu";
import { WithRail } from "@/components/layout/page-layout";
import { Steps, TipCard } from "@/components/brand/bits";
import { PetImage } from "@/components/brand/pet-image";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { displayName, formatDate, sinceLabel } from "@/lib/utils";
import { getLostFound, lostHeadline } from "./data";
import { OwnerActions, PossibleMatches } from "./lost-client";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const item = await getLostFound((await params).id);
  if (!item) return { title: "Report not found" };
  const title = lostHeadline(item);
  const description = `${item.description.slice(0, 150)}${item.reward_text ? ` · Reward: ${item.reward_text}` : ""}. Help on Pupmeow.`;
  return { title, description, openGraph: { title, description, type: "article" }, twitter: { card: "summary_large_image", title, description } };
}

export default async function LostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getLostFound(id);
  if (!item) notFound();
  const user = await getUser();
  const isOwner = user?.id === item.author_id;
  const reunited = item.status === "reunited";
  const lost = item.type === "lost";
  const headline = lostHeadline(item);
  const petLabel = item.pet_name ?? `this ${item.species}`;
  const pronoun = item.gender === "male" ? "him" : item.gender === "female" ? "her" : "them";
  const msg = lost
    ? `Hi! I saw your Pupmeow post about ${petLabel} (lost near ${item.last_seen_area}). `
    : `Hi! I think the ${item.species} you found near ${item.last_seen_area} may be mine. `;
  const place = [item.landmark, item.last_seen_area, item.city].filter(Boolean).join(", ");
  const mapsQuery = encodeURIComponent(place);
  const label = reunited ? "REUNITED" : lost ? "LOST" : "FOUND";
  const tone = reunited ? "bg-primary text-white" : lost ? "bg-danger text-white halftone" : "bg-secondary text-ink";

  const actions = (
    <div className="space-y-4">
      {isOwner ? (
        <OwnerActions id={item.id} status={item.status} petName={item.pet_name} type={item.type} />
      ) : !reunited ? (
        <section aria-label="Help" className="space-y-3 rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-card)]">
          <p className="font-heading text-xl font-semibold">{lost ? `Seen ${item.pet_name ?? "this pet"}?` : "Is this your pet?"}</p>
          <ContactButton
            kind="lost_found"
            id={item.id}
            loggedIn={Boolean(user)}
            method={item.contact_method}
            message={msg}
            loginNext={`/lost/${item.id}`}
            label="WhatsApp"
            sighting={lost ? { petName: item.pet_name ?? `the ${item.species}`, pronoun, defaultArea: item.last_seen_area } : undefined}
          />
        </section>
      ) : null}
      <section aria-label="Share" className="space-y-3 rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-card)]">
        <p className="font-heading text-lg font-semibold">{reunited ? "Share the good news" : "Every share helps"}</p>
        <ShareButtons path={`/lost/${item.id}`} text={reunited ? `${petLabel} is back home! Thank you Delhi 🎉` : `${headline}. Please share! 🐾`} size="sm" />
        {!reunited && !isOwner && (
          <ButtonLink href={`/lost/${item.id}/poster`} variant="outline" size="sm"><Printer className="h-4 w-4" aria-hidden /> Printable poster</ButtonLink>
        )}
      </section>
    </div>
  );

  return (
    <WithRail
      rail={
        <>
          <OnlyAt wide>{actions}</OnlyAt>
          {!reunited && (
            <TipCard tone={lost ? "lost" : "adopt"} title={lost ? "If you spot this pet" : "Before you hand over"}>
              <Steps tone={lost ? "light" : "dark"} items={lost ? [
                "Don't chase. Note the lane and the time.",
                `Tap "I saw ${pronoun === "them" ? "it" : pronoun}" and send the spot to the owner.`,
                "Offer water from a distance and stay nearby if you can.",
              ] : [
                "Ask for a photo of the pet at home.",
                "Ask about a detail only the owner would know.",
                "Meet in a public place, never alone.",
              ]} />
            </TipCard>
          )}
        </>
      }
    >
      <article className="space-y-5">
        <Link href="/lost" className="inline-flex items-center gap-1 text-sm font-bold text-muted hover:text-text"><ChevronLeft className="h-4 w-4" aria-hidden /> Lost &amp; Found</Link>
        {reunited && <Celebration title={`${item.pet_name ?? "This pet"} is home!`} text={`Reunited${item.reunited_at ? ` on ${formatDate(item.reunited_at)}` : ""}. Thank you to everyone who shared.`} species={item.species} />}
        {item.is_hidden && <p className="rounded-[var(--radius-md)] bg-warning-soft px-3 py-2 text-sm font-semibold text-warning">Hidden by moderators.</p>}

        <section className={`overflow-hidden rounded-[var(--radius-xl)] p-4 sm:p-6 ${tone}`}>
          <div className="flex items-start justify-between gap-3">
            <p className="font-heading text-[3rem] font-bold leading-none tracking-[0.04em] sm:text-[3.6rem]">{label}</p>
            <div className="flex items-center gap-1">
              <span className={`rounded-full px-3 py-1.5 text-[0.8rem] font-extrabold ${lost || reunited ? "bg-white text-ink" : "bg-ink text-white"}`}>{sinceLabel(item.created_at)} ago</span>
              <div className={lost || reunited ? "[&_button]:text-white [&_button:hover]:bg-white/15" : undefined}>
                <ContentMenu targetType="lost_found" targetId={item.id} ownerId={item.author_id} viewerId={user?.id ?? null} ownerName={displayName(item.author)} label="Report options" />
              </div>
            </div>
          </div>
          <div className="tape mt-4 rounded-[0.8rem] bg-cream p-1.5">
            {item.photo_urls.length ? (
              <PhotoGallery images={item.photo_urls} alt={headline} aspect="aspect-[4/3] sm:aspect-[16/9]" rounded="rounded-[0.6rem]" priority />
            ) : (
              <div className="relative aspect-[16/9] overflow-hidden rounded-[0.6rem]"><PetImage alt={headline} species={item.species} hints={[item.breed, item.color]} tint="#fff1cc" /></div>
            )}
          </div>
          <h1 className="mt-4 text-[2.4rem] font-semibold leading-tight sm:text-[2.8rem]">{item.pet_name ?? (lost ? "Unnamed" : `Found ${item.species}`)}</h1>
          <p className="mt-1 text-[1.05rem] font-bold opacity-90">{[item.breed, item.gender !== "unknown" ? (item.gender === "male" ? "Male" : "Female") : null, item.color].filter(Boolean).join(" · ")}</p>
          {item.reward_text && <p className="mt-3 inline-flex rounded-full bg-white px-3.5 py-1.5 text-[0.95rem] font-extrabold text-danger">{item.reward_text}</p>}
        </section>

        <OnlyAt wide={false}>{actions}</OnlyAt>

        <section className="rounded-[var(--radius-lg)] bg-surface p-5 shadow-[var(--shadow-card)]">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-extrabold uppercase tracking-wider text-muted">{lost ? "Last seen" : "Found near"}</dt>
              <dd className="mt-0.5 text-[1.05rem] font-bold">{[item.landmark, item.last_seen_area].filter(Boolean).join(", ")}</dd>
            </div>
            <div>
              <dt className="text-xs font-extrabold uppercase tracking-wider text-muted">When</dt>
              <dd className="mt-0.5 text-[1.05rem] font-bold">{formatDate(item.last_seen_date, true)}</dd>
            </div>
          </dl>
          <p className="mt-4 whitespace-pre-line text-[1.02rem] leading-relaxed">{item.description}</p>
        </section>

        <section aria-label="Map" className="overflow-hidden rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-card)]">
          <div className="relative bg-[#e9efe6] bg-[linear-gradient(90deg,rgb(255_255_255/0.7)_2px,transparent_2px),linear-gradient(rgb(255_255_255/0.7)_2px,transparent_2px)] bg-[size:56px_56px]">
          <span className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full bg-danger text-white shadow-[var(--shadow-lift)]" aria-hidden><MapPin className="h-5 w-5" /></span>
          <iframe
            title={`Map of ${place}`}
            src={`https://maps.google.com/maps?q=${mapsQuery}&z=15&output=embed`}
            className="relative h-64 w-full border-0 sm:h-72"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 p-3">
            <p className="text-sm text-muted">Approximate area. Exact home addresses are never shown.</p>
            <ButtonLink href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`} target="_blank" rel="noopener noreferrer" variant="outline" size="sm">
              <ExternalLink className="h-4 w-4" aria-hidden /> Open in Google Maps
            </ButtonLink>
          </div>
        </section>

        {user && !reunited && isAiEnabled() && <PossibleMatches id={item.id} type={item.type} />}

        {item.author && (
          <div className="flex items-center gap-3 text-sm">
            <Avatar src={item.author.avatar_url} name={displayName(item.author)} size="sm" />
            <span>Posted by <Link href={`/u/${item.author.username}`} className="font-bold hover:underline">{displayName(item.author)}</Link> on {formatDate(item.created_at)}</span>
          </div>
        )}
      </article>
    </WithRail>
  );
}
