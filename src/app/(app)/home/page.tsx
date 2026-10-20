import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Camera, HeartHandshake, MapPin, Plus, Sparkles, Users } from "lucide-react";
import { requireProfile, getPrivateProfile } from "@/lib/auth";
import { getSpeciesPref } from "@/lib/species-server";
import { isKaiaListedInApp } from "@/lib/ai/config";
import { loadHome } from "@/lib/home";
import { WithRail } from "@/components/layout/page-layout";
import { SpeciesToggle } from "@/components/features/species/species-toggle";
import { LostFoundCard, AdoptionCard, LostRow } from "@/components/features/listings/listing-cards";
import { PostCard } from "@/components/features/feed/post-card";
import { AddToCalendar, MarkGivenButton } from "@/components/features/care/reminder-actions";
import { PetArt } from "@/components/brand/pet-art";
import { PetImage } from "@/components/brand/pet-image";
import { DateTile, SectionTitle, Stamp } from "@/components/brand/bits";
import { KaiaAvatar } from "@/components/features/ai/kaia-avatar";
import { ButtonLink } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { birthdaySoon, cn, daysUntil, dueLabel, formatAge, formatDate, greeting, shortArea } from "@/lib/utils";
import { WelcomeToast } from "../feed/welcome-toast";

export const metadata: Metadata = { title: "Home", robots: { index: false } };

export default async function HomePage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const sp = await searchParams;
  const profile = await requireProfile("/home");
  const priv = await getPrivateProfile();
  const species = await getSpeciesPref();
  const area = priv?.home_area ?? profile.area;
  const d = await loadHome({ userId: profile.id, area, species });
  const firstName = (profile.display_name ?? profile.username ?? "friend").split(" ")[0];
  const hood = shortArea(area);
  const aiOn = isKaiaListedInApp();
  const next = d.due[0];
  const birthdayPet = d.pets.find((p) => birthdaySoon(p.birthday, 10));

  return (
    <WithRail
      rail={
        <>
          <MyPetsCard pets={d.pets} due={d.due} />
          <PlaydateCard requests={d.requests} />
          {d.reunited.length > 0 && (
            <section aria-labelledby="reunited-h">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 id="reunited-h" className="text-xl font-semibold">Reunited this week</h2>
                <Stamp tone="violet" className="text-[0.8rem]">Reunited</Stamp>
              </div>
              <ul className="space-y-2">{d.reunited.map((r) => <li key={r.id}><LostRow item={r} /></li>)}</ul>
            </section>
          )}
        </>
      }
    >
      {sp.welcome && <WelcomeToast path="/home" />}
      <div className="space-y-7">
        {/* Greeting */}
        <section className="relative overflow-hidden rounded-[var(--radius-xl)] bg-primary px-5 pb-6 pt-6 text-on-primary sm:px-7 sm:pt-7">
          <Confetti />
          <div className="relative max-w-[34rem]">
            <p className="text-[0.95rem] font-bold text-on-primary/85">{greeting()}, {firstName} 👋</p>
            <h1 className="mt-1 text-[2.1rem] font-semibold leading-[1.05] text-balance sm:text-[2.6rem]">
              {birthdayPet ? `${birthdayPet.name}'s birthday is coming up!` : d.pets.length ? `What are ${petNames(d.pets)} up to today?` : "Welcome to the pack!"}
            </h1>
            {d.lostNearCount > 0 ? (
              <Link href="/lost" className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-2 text-[0.95rem] font-bold hover:bg-white/25">
                <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff8a8a] opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#ff5a5a]" /></span>
                {d.lostNearCount} lost {d.lostNearCount === 1 ? "pet" : "pets"} near {hood}. Keep an eye out
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            ) : (
              <p className="mt-3 text-[1rem] font-semibold text-on-primary/90">No lost pets reported near {hood} right now. A good day 🐾</p>
            )}
            <SpeciesToggle tone="onColor" className="mt-5" />
          </div>
          <div className="pointer-events-none absolute -bottom-2 right-3 hidden items-end sm:flex" aria-hidden>
            <PetArt pet={{ species: "dog", look: "golden" }} className="h-36 w-36 animate-[pm-bob_3.2s_ease-in-out_infinite]" />
            <PetArt pet={{ species: "cat", look: "violet" }} className="-ml-10 h-28 w-28" />
          </div>
        </section>

        {/* Care reminder */}
        {next ? (
          <section aria-labelledby="care-h" className="rounded-[var(--radius-xl)] bg-secondary p-5 text-ink sm:p-6">
            <div className="flex flex-wrap items-center gap-4">
              <DateTile date={next.next_due_date!} tone={daysUntil(next.next_due_date!) < 0 ? "red" : "ink"} />
              <div className="min-w-0 flex-1">
                <h2 id="care-h" className="text-[1.45rem] font-semibold leading-tight">
                  {next.pet?.name ?? "Your pet"}&apos;s {next.title.replace(/^Reminder:\s*/i, "")}, {dueLabel(next.next_due_date!)}
                </h2>
                <p className="mt-0.5 text-[0.95rem] font-semibold text-ink/75">
                  Last given {formatDate(next.date)}{next.notes ? ` · ${next.notes}` : ""}
                </p>
              </div>
              <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                <AddToCalendar
                  tone="onColor"
                  label="Remind me"
                  event={{
                    title: `${next.pet?.name ?? "Pet"}: ${next.title.replace(/^Reminder:\s*/i, "")}`,
                    start: next.next_due_date!,
                    details: `Pupmeow reminder for ${next.pet?.name ?? "your pet"}. Last given ${formatDate(next.date)}.${next.notes ? ` ${next.notes}` : ""}`,
                  }}
                />
                <MarkGivenButton recordId={next.id} variant="white" />
              </div>
            </div>
            {d.due.length > 1 && (
              <ul className="mt-4 grid gap-2 border-t-2 border-ink/10 pt-3 sm:grid-cols-2">
                {d.due.slice(1, 5).map((r) => (
                  <li key={r.id}>
                    <Link href={`/pets/${r.pet_id}/health`} className="flex items-center justify-between gap-2 rounded-xl bg-white/45 px-3 py-2 text-[0.92rem] font-bold hover:bg-white/70">
                      <span className="truncate">{r.pet?.name}: {r.title.replace(/^Reminder:\s*/i, "")}</span>
                      <span className={cn("shrink-0", daysUntil(r.next_due_date!) < 0 && "text-danger")}>{dueLabel(r.next_due_date!)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : d.pets.length === 0 ? (
          <section className="flex flex-wrap items-center gap-4 rounded-[var(--radius-xl)] bg-secondary p-5 text-ink sm:p-6">
            <PetArt pet={{ species: "dog", look: "brown" }} className="h-20 w-20" />
            <div className="min-w-0 flex-1">
              <h2 className="text-[1.45rem] font-semibold">Add your dog or cat</h2>
              <p className="text-[0.95rem] font-semibold text-ink/75">Get vaccine reminders and a lost-pet poster ready in one tap.</p>
            </div>
            <ButtonLink href="/pets/new"><Plus className="h-4 w-4" aria-hidden /> Add a pet</ButtonLink>
          </section>
        ) : null}

        {/* Quick actions */}
        <nav aria-label="Quick actions" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickTile href="/lost/new" tone="bg-danger text-white halftone" icon={<MapPin className="h-5 w-5" />} title="Lost or found a pet?" text="Alert your area" />
          <QuickTile href="/post/new" tone="bg-surface text-text" icon={<Camera className="h-5 w-5" />} title="Share a moment" text="Photos of your pet" />
          <QuickTile href="/match" tone="bg-cat text-white" icon={<Users className="h-5 w-5" />} title="Find a playdate" text="Pets near you" />
          {aiOn ? (
            <QuickTile href="/assistant" tone="bg-cream text-ink" icon={<KaiaAvatar size={22} className="bg-transparent" />} title="Ask Kaia" text="Pet-care questions" />
          ) : (
            <QuickTile href="/adopt" tone="bg-cream text-ink" icon={<HeartHandshake className="h-5 w-5" />} title="Adopt a pet" text="Always free" />
          )}
        </nav>

        {/* Lost near you */}
        <section aria-labelledby="lost-h">
          <SectionTitle action={<Link href="/lost" className="font-bold text-primary hover:underline">See all</Link>}>
            <span id="lost-h">Lost near you</span>
          </SectionTitle>
          {d.lostNear.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {d.lostNear.map((l) => <LostFoundCard key={l.id} item={l} viewerArea={area} />)}
            </div>
          ) : (
            <div className="flex items-center gap-4 rounded-[var(--radius-lg)] bg-surface p-5 shadow-[var(--shadow-card)]">
              <PetArt pet={{ species: "dog", look: "golden" }} className="h-16 w-16" />
              <p className="font-semibold">No open lost reports. Every pet we know of is home. 🎉</p>
            </div>
          )}
        </section>

        {/* Around the neighbourhood */}
        <section aria-labelledby="around-h">
          <SectionTitle action={<Link href="/feed" className="font-bold text-primary hover:underline">Open feed</Link>}>
            <span id="around-h">Around {hood}</span>
          </SectionTitle>
          {d.posts.length ? (
            <div className="grid items-start gap-4 sm:grid-cols-2">
              {d.posts.map((p) => <PostCard key={p.id} post={p} viewerId={profile.id} compact />)}
            </div>
          ) : (
            <div className="rounded-[var(--radius-lg)] bg-surface p-6 text-center shadow-[var(--shadow-card)]">
              <p className="font-semibold">Be the first to post from {hood}!</p>
              <ButtonLink href="/post/new" className="mt-3">Share a moment</ButtonLink>
            </div>
          )}
        </section>

        {/* Adoption */}
        {d.adoptions.length > 0 && (
          <section aria-labelledby="adopt-h">
            <SectionTitle action={<Link href="/adopt" className="font-bold text-primary hover:underline">See all</Link>}>
              <span id="adopt-h">Looking for a home</span>
            </SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {d.adoptions.map((a) => <AdoptionCard key={a.id} item={a} viewerArea={area} />)}
            </div>
          </section>
        )}
      </div>
    </WithRail>
  );
}

function petNames(pets: { name: string }[]) {
  if (pets.length === 1) return pets[0].name;
  if (pets.length === 2) return `${pets[0].name} and ${pets[1].name}`;
  return "your pets";
}

function QuickTile({ href, tone, icon, title, text }: { href: string; tone: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <Link href={href} className={cn("group flex min-h-[7.5rem] flex-col justify-between rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5 focus-visible:-translate-y-0.5", tone)}>
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/10" aria-hidden>{icon}</span>
      <span>
        <span className="block font-heading text-[1.1rem] font-semibold leading-tight">{title}</span>
        <span className="block text-[0.85rem] font-semibold opacity-80">{text}</span>
      </span>
    </Link>
  );
}

function Confetti() {
  const dots = [
    ["62%", "10%", "#f6b21b", 10], ["74%", "30%", "#fff1cc", 7], ["84%", "8%", "#e5486a", 8], ["92%", "34%", "#f6b21b", 6],
    ["68%", "56%", "#fff1cc", 6], ["96%", "60%", "#7a5af5", 8], ["4%", "92%", "#ffffff", 5], ["56%", "88%", "#e5486a", 6],
  ] as const;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 opacity-70">
      {dots.map(([l, t, c, s], i) => (
        <span key={i} className="absolute rounded-full" style={{ left: l, top: t, width: s, height: s, background: c }} />
      ))}
      <svg className="absolute right-[30%] top-4 hidden h-6 w-6 text-white/30 sm:block" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.4-9.3-8.6C1 9 3 5.5 6.4 5.5c2 0 3.2 1.2 3.6 2 .4-.8 1.6-2 3.6-2C17 5.5 19 9 17.3 12.4 15 16.6 12 21 12 21z" transform="translate(2 0)" /></svg>
    </div>
  );
}

function MyPetsCard({ pets, due }: { pets: import("@/types/database").PetRow[]; due: { pet_id: string; next_due_date: string | null }[] }) {
  return (
    <section aria-labelledby="mypets-h" className="rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-card)]">
      <div className="mb-2 flex items-center justify-between">
        <h2 id="mypets-h" className="text-xl font-semibold">My pets</h2>
        <Link href="/pets" className="text-sm font-bold text-primary hover:underline">Manage</Link>
      </div>
      {pets.length === 0 ? (
        <Link href="/pets/new" className="flex items-center gap-3 rounded-[var(--radius-md)] border-2 border-dashed border-border p-3 font-bold hover:border-text">
          <Plus className="h-5 w-5" aria-hidden /> Add your first pet
        </Link>
      ) : (
        <ul className="divide-y divide-border">
          {pets.map((p) => {
            const next = due.find((x) => x.pet_id === p.id)?.next_due_date;
            const overdue = next ? daysUntil(next) < 0 : false;
            return (
              <li key={p.id}>
                <Link href={`/pet/${p.id}`} className="flex items-center gap-3 py-2.5 hover:opacity-85">
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[0.8rem]">
                    <PetImage src={p.photo_url} alt={p.name} species={p.species} hints={[p.breed]} seed={p.id} sizes="48px" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{p.name}</span>
                    <span className="block truncate text-[0.85rem] text-muted">{[p.breed?.replace(/ \/ .*$/, ""), formatAge(p.birthday)].filter(Boolean).join(" · ")}</span>
                  </span>
                  {next ? (
                    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[0.75rem] font-extrabold", overdue ? "bg-danger text-white" : "bg-secondary text-ink")}>
                      {overdue ? "Overdue" : `Due ${formatDate(next).replace(/ \d{4}$/, "")}`}
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-[0.75rem] font-extrabold text-on-primary">All done</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function PlaydateCard({ requests }: { requests: import("@/types/models").MatchRequestWithPets[] }) {
  if (!requests.length) {
    return (
      <Link href="/match" className="relative block overflow-hidden rounded-[var(--radius-lg)] bg-cat p-4 text-white shadow-[var(--shadow-card)] hover:brightness-105">
        <p className="font-heading text-xl font-semibold">Find a playdate</p>
        <p className="mt-0.5 max-w-[12rem] text-[0.9rem] font-semibold text-white/85">Dogs and cats near you who&apos;d love a friend.</p>
        <PetArt pet={{ species: "dog", look: "beagle" }} className="absolute -bottom-2 right-2 h-20 w-20" />
      </Link>
    );
  }
  return (
    <Link href="/match/requests" className="block rounded-[var(--radius-lg)] bg-cat p-4 text-white shadow-[var(--shadow-card)] hover:brightness-105">
      <p className="font-heading text-xl font-semibold">{requests.length} playdate {requests.length === 1 ? "request" : "requests"}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="flex -space-x-2">
          {requests.slice(0, 4).map((r) => (
            <span key={r.id} className="relative h-10 w-10 overflow-hidden rounded-full ring-2 ring-cat">
              {r.from_pet?.photo_url ? (
                <PetImage src={r.from_pet.photo_url} alt={r.from_pet.name} species={r.from_pet.species} sizes="40px" />
              ) : (
                <Avatar name={r.from_pet?.name} size="md" />
              )}
            </span>
          ))}
        </span>
        <span className="inline-flex items-center gap-1 font-extrabold">Review <ArrowRight className="h-4 w-4" aria-hidden /></span>
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-[0.85rem] font-semibold text-white/85"><Sparkles className="h-4 w-4" aria-hidden /> Contact is shared only after you both say yes.</p>
    </Link>
  );
}
