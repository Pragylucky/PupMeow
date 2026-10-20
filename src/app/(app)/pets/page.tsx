import type { Metadata } from "next";
import Link from "next/link";
import { HeartPulse, Pencil, Plus, Lock } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { WithRail } from "@/components/layout/page-layout";
import { SectionTitle, TipCard, Steps, DateTile } from "@/components/brand/bits";
import { PetImage } from "@/components/brand/pet-image";
import { AddToCalendar, MarkGivenButton } from "@/components/features/care/reminder-actions";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { birthdaySoon, cn, daysUntil, dueLabel, formatAge } from "@/lib/utils";
import type { HealthRecordRow, PetRow } from "@/types/database";

export const metadata: Metadata = { title: "My pets", robots: { index: false } };

const TONES = ["bg-secondary text-ink", "bg-primary text-white", "bg-cat text-white", "bg-cream text-ink"];

export default async function MyPetsPage() {
  const profile = await requireProfile("/pets");
  const supabase = await createClient();
  const in60 = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10);
  const [{ data: pets }, { data: due }] = await Promise.all([
    supabase.from("pets").select("*").eq("owner_id", profile.id).order("created_at"),
    supabase.from("pet_health_records").select("*").eq("owner_id", profile.id).not("next_due_date", "is", null).lte("next_due_date", in60).order("next_due_date").limit(20),
  ]);
  const list = (pets ?? []) as PetRow[];
  const upcoming = (due ?? []) as HealthRecordRow[];
  const petName = (id: string) => list.find((p) => p.id === id)?.name ?? "Pet";

  return (
    <WithRail
      rail={
        <>
          <TipCard tone="care" title="Private by default">
            <Steps items={["Health records are only visible to you.", "Add reminders to your phone's calendar.", "Delete any record, anytime."]} />
          </TipCard>
        </>
      }
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[2rem] font-semibold leading-tight sm:text-[2.4rem]">My pets</h1>
          <p className="mt-1 text-muted">Profiles, vaccines and reminders for your family.</p>
        </div>
        <ButtonLink href="/pets/new"><Plus className="h-4 w-4" aria-hidden /> Add a pet</ButtonLink>
      </div>

      {list.length ? (
        <ul className="space-y-3">
          {list.map((p, i) => {
            const next = upcoming.find((r) => r.pet_id === p.id);
            return (
              <li key={p.id} className={cn("flex flex-wrap items-center gap-4 rounded-[var(--radius-xl)] p-4 sm:flex-nowrap sm:p-5", TONES[i % TONES.length])}>
                <Link href={`/pet/${p.id}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[var(--radius-lg)] bg-white sm:h-28 sm:w-28">
                  <PetImage src={p.photo_url} alt={p.name} species={p.species} hints={[p.breed]} seed={p.id} sizes="112px" tint="#fff8e6" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/pet/${p.id}`} className="font-heading text-[1.8rem] font-semibold leading-none hover:underline">{p.name}</Link>
                  <p className="mt-1 font-bold opacity-85">{[p.breed?.replace(/ \/ .*$/, ""), formatAge(p.birthday), p.gender !== "unknown" ? (p.gender === "male" ? "Boy" : "Girl") : null].filter(Boolean).join(" · ") || (p.species === "dog" ? "Dog" : "Cat")}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {next ? (
                      <span className={cn("rounded-full px-2.5 py-1 text-[0.78rem] font-extrabold", daysUntil(next.next_due_date!) < 0 ? "bg-danger text-white" : "bg-ink text-white")}>{next.title.replace(/^Reminder:\s*/i, "")} {dueLabel(next.next_due_date!)}</span>
                    ) : (
                      <span className="rounded-full bg-white/80 px-2.5 py-1 text-[0.78rem] font-extrabold text-ink">All caught up</span>
                    )}
                    {birthdaySoon(p.birthday) && <span className="rounded-full bg-white px-2.5 py-1 text-[0.78rem] font-extrabold text-ink">Birthday soon 🎂</span>}
                  </div>
                </div>
                <div className="flex w-full gap-2 sm:w-auto sm:flex-col">
                  <ButtonLink href={`/pets/${p.id}/health`} variant="white" size="sm" className="flex-1 sm:flex-none"><HeartPulse className="h-4 w-4" aria-hidden /> Health</ButtonLink>
                  <ButtonLink href={`/pets/${p.id}/edit`} variant="dim" size="sm" className="flex-1 sm:flex-none"><Pencil className="h-4 w-4" aria-hidden /> Edit</ButtonLink>
                </div>
              </li>
            );
          })}
          <li>
            <Link href="/pets/new" className="flex h-16 items-center justify-center gap-2 rounded-[var(--radius-xl)] border-2 border-dashed border-border font-bold text-muted hover:border-text hover:text-text">
              <Plus className="h-5 w-5" aria-hidden /> Add a pet
            </Link>
          </li>
        </ul>
      ) : (
        <EmptyState tone="card" art="dog" title="No pets yet" description="Add your dog or cat to track vaccines, celebrate birthdays and tag them in posts." action={<ButtonLink href="/pets/new">Add your first pet</ButtonLink>} />
      )}

      {upcoming.length > 0 && (
        <section aria-labelledby="upcoming" className="mt-8">
          <SectionTitle><span id="upcoming">Coming up</span></SectionTitle>
          <p className="-mt-2 mb-3 flex items-center gap-1.5 text-sm text-muted"><Lock className="h-3.5 w-3.5" aria-hidden /> Only you can see this.</p>
          <ul className="space-y-2.5">
            {upcoming.map((r) => {
              const overdue = daysUntil(r.next_due_date!) < 0;
              const title = r.title.replace(/^Reminder:\s*/i, "");
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] bg-surface p-3.5 shadow-[var(--shadow-card)] sm:flex-nowrap">
                  <DateTile date={r.next_due_date!} tone={overdue ? "red" : "ink"} className="w-12 [&>span:last-child]:text-[1.3rem]" />
                  <Link href={`/pets/${r.pet_id}/health`} className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{petName(r.pet_id)}: {title}</span>
                    <span className={cn("block text-sm font-semibold", overdue ? "text-danger" : "text-muted")}>{dueLabel(r.next_due_date!)}</span>
                  </Link>
                  <div className="flex gap-2">
                    <AddToCalendar label="Remind me" event={{ title: `${petName(r.pet_id)}: ${title}`, start: r.next_due_date!, details: "Pupmeow reminder." }} />
                    <MarkGivenButton recordId={r.id} label="Done" />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </WithRail>
  );
}
