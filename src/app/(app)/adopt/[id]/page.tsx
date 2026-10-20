import type { Metadata } from "next";
import { OnlyAt } from "@/components/layout/only-at";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, ChevronLeft, MapPin, ShieldAlert } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { PhotoGallery } from "@/components/features/upload/lightbox";
import { ContactButton } from "@/components/features/listings/contact-button";
import { ShareButtons } from "@/components/features/listings/share-buttons";
import { Celebration } from "@/components/features/listings/celebration";
import { ContentMenu } from "@/components/features/safety/content-menu";
import { WithRail } from "@/components/layout/page-layout";
import { Steps, TipCard } from "@/components/brand/bits";
import { PetImage } from "@/components/brand/pet-image";
import { Avatar } from "@/components/ui/avatar";
import { displayName, formatDate, sinceLabel } from "@/lib/utils";
import { getAdoption } from "./data";
import { AdoptionOwnerActions } from "./owner-actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const a = await getAdoption((await params).id);
  if (!a) return { title: "Listing not found" };
  const title = `Adopt ${a.pet_name} · ${a.breed ?? (a.species === "dog" ? "Dog" : "Cat")}, ${a.age_text}, ${a.area}`;
  const description = a.description.slice(0, 160);
  return { title, description, openGraph: { title, description, type: "article" }, twitter: { card: "summary_large_image", title, description } };
}

export default async function AdoptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await getAdoption(id);
  if (!a) notFound();
  const user = await getViewer();
  const isOwner = user?.id === a.author_id;
  const adopted = a.status === "adopted";
  const pronoun = a.gender === "female" ? "her" : a.gender === "male" ? "him" : "them";
  const facts = [a.breed?.replace(/ \/ .*$/, ""), a.age_text, a.gender !== "unknown" ? (a.gender === "male" ? "Male" : "Female") : null].filter(Boolean).join(" · ");

  const actions = (
    <div className="space-y-4">
      {isOwner ? (
        <AdoptionOwnerActions id={a.id} status={a.status} name={a.pet_name} />
      ) : !adopted ? (
        <section aria-label="Contact" className="space-y-3 rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-card)]">
          <p className="font-heading text-xl font-semibold">Interested in {a.pet_name}?</p>
          <ContactButton
            kind="adoption"
            id={a.id}
            loggedIn={Boolean(user)}
            method={a.contact_method}
            loginNext={`/adopt/${a.id}`}
            message={`Hi! I saw ${a.pet_name} on Pupmeow and I'd love to know more about adopting ${pronoun}. A little about my home: `}
          />
          <p className="flex gap-2 rounded-[var(--radius-md)] bg-surface-2 p-3 text-sm font-semibold"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden /> Never pay a fee, deposit or transport charge. Report any listing that asks for money.</p>
        </section>
      ) : null}
      <section aria-label="Share" className="space-y-3 rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-card)]">
        <p className="font-heading text-lg font-semibold">{adopted ? "Share the happy tail" : `Help ${a.pet_name} find a home`}</p>
        <ShareButtons path={`/adopt/${a.id}`} text={`${a.pet_name} (${a.age_text}, ${a.area}) is looking for a home! Free adoption on Pupmeow 🐾`} size="sm" />
      </section>
    </div>
  );

  return (
    <WithRail
      rail={
        <>
          <OnlyAt wide>{actions}</OnlyAt>
          <TipCard tone="adopt" title="Before you meet">
            <Steps tone="dark" items={["Ask the foster about food, habits and vaccines.", "Meet the pet in person, at the foster's home or a public place.", "Never pay a fee, deposit or transport charge."]} />
          </TipCard>
        </>
      }
    >
      <article className="space-y-5">
        <Link href="/adopt" className="inline-flex items-center gap-1 text-sm font-bold text-muted hover:text-text"><ChevronLeft className="h-4 w-4" aria-hidden /> Adopt</Link>
        {adopted && <Celebration title={`${a.pet_name} found a home!`} text={`Adopted${a.adopted_at ? ` on ${formatDate(a.adopted_at)}` : ""}. Thank you for sharing.`} stamp="Adopted" species={a.species} />}
        {a.is_hidden && <p className="rounded-[var(--radius-md)] bg-warning-soft px-3 py-2 text-sm font-semibold text-warning">Hidden by moderators.</p>}

        <section className="overflow-hidden rounded-[var(--radius-xl)] bg-secondary text-ink">
          {a.photo_urls.length ? (
            <PhotoGallery images={a.photo_urls} alt={`${a.pet_name} for adoption`} aspect="aspect-[4/3] sm:aspect-[16/9]" rounded="rounded-none" priority />
          ) : (
            <div className="relative aspect-[16/9]"><PetImage alt={a.pet_name} species={a.species} hints={[a.breed]} tint="#fff1cc" /></div>
          )}
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-[2.6rem] font-semibold leading-none sm:text-[3rem]">{a.pet_name}</h1>
                <p className="mt-2 text-[1.05rem] font-bold">{facts}</p>
                <p className="mt-1 flex items-center gap-1 text-[0.95rem] font-semibold text-ink/75"><MapPin className="h-4 w-4" aria-hidden /> {a.area} · listed {sinceLabel(a.created_at)} ago</p>
              </div>
              <ContentMenu targetType="adoption" targetId={a.id} ownerId={a.author_id} viewerId={user?.id ?? null} ownerName={displayName(a.author)} label="Listing options" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-ink px-3 py-1.5 text-[0.85rem] font-extrabold text-white">Free adoption</span>
              {a.vaccinated && <span className="rounded-full bg-white px-3 py-1.5 text-[0.85rem] font-extrabold">Owner says vaccinated</span>}
              {a.neutered && <span className="rounded-full bg-white px-3 py-1.5 text-[0.85rem] font-extrabold">Sterilised</span>}
              {a.is_ngo && <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[0.85rem] font-extrabold"><Building2 className="h-4 w-4" aria-hidden /> {a.org_name}</span>}
            </div>
          </div>
        </section>

        <OnlyAt wide={false}>{actions}</OnlyAt>

        <section className="rounded-[var(--radius-lg)] bg-surface p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-xl font-semibold">About {a.pet_name}</h2>
          <p className="mt-2 whitespace-pre-line text-[1.02rem] leading-relaxed">{a.description}</p>
        </section>

        {a.author && (
          <Link href={`/u/${a.author.username}`} className="flex items-center gap-3 rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-card)] hover:ring-2 hover:ring-border">
            <Avatar src={a.author.avatar_url} name={displayName(a.author)} size="md" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-extrabold uppercase tracking-wider text-muted">{a.is_ngo ? "Listed by an NGO" : "Listed by the foster"}</span>
              <span className="block truncate font-bold">{displayName(a.author)}{a.is_ngo && a.org_name && a.org_name !== displayName(a.author) ? ` · ${a.org_name}` : ""}</span>
            </span>
          </Link>
        )}
        <div className="xl:hidden">
          <TipCard tone="adopt" title="How adoption works">
            <Steps tone="dark" items={["Say hi and share a bit about your home.", "Meet the pet and the foster in person.", "Take them home. Free, always."]} />
          </TipCard>
        </div>
      </article>
    </WithRail>
  );
}
