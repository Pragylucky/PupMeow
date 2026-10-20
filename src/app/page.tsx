import Link from "next/link";
import { ArrowRight, CalendarHeart, ChevronDown, HeartHandshake, MapPin, QrCode, ShieldCheck, Syringe, Users } from "lucide-react";
import { createPublicClient } from "@/lib/supabase/server";
import { LOST_FOUND_COLUMNS, ADOPTION_COLUMNS } from "@/lib/columns";
import { MarketingHeader, SiteFooter } from "@/components/marketing/site-footer";
import { LostFoundCard, AdoptionCard } from "@/components/features/listings/listing-cards";
import { KaiaAvatar } from "@/components/features/ai/kaia-avatar";
import { PetArt } from "@/components/brand/pet-art";
import { Stamp } from "@/components/brand/bits";
import { buttonClasses } from "@/components/ui/button";
import type { AdoptionRow, LostFoundRow } from "@/types/database";

export const revalidate = 300;

async function getRecent() {
  try {
    const supabase = createPublicClient();
    const [lost, adopt, reunited] = await Promise.all([
      supabase.from("lost_found").select(LOST_FOUND_COLUMNS).eq("status", "open").eq("is_hidden", false).order("created_at", { ascending: false }).limit(3),
      supabase.from("adoptions").select(ADOPTION_COLUMNS).eq("status", "available").eq("is_hidden", false).order("created_at", { ascending: false }).limit(3),
      supabase.from("lost_found").select("id", { count: "exact", head: true }).eq("status", "reunited"),
    ]);
    return { lost: (lost.data ?? []) as LostFoundRow[], adopt: (adopt.data ?? []) as AdoptionRow[], reunited: reunited.count ?? 0 };
  } catch {
    return { lost: [], adopt: [], reunited: 0 };
  }
}

const FAQ = [
  { q: "Is Pupmeow free?", a: "Yes. Joining, posting, reporting lost pets and listing pets for adoption are all free." },
  { q: "Can I sell puppies or kittens here?", a: "No. Pupmeow is for free adoption only. Listings that mention a price, rehoming fee or stud fee are removed." },
  { q: "Who can see my phone number?", a: "Only signed-in members who tap Call or WhatsApp on your lost, found or adoption post. It's never shown to visitors who aren't logged in, and never on your profile." },
  { q: "Which areas do you cover?", a: "All of Delhi NCR: Delhi, Noida, Greater Noida, Gurugram, Ghaziabad and Faridabad." },
  { q: "Is Kaia, the AI helper, a vet?", a: "No. Kaia gives general care tips and flags emergencies, but it's not a substitute for a vet." },
];

export default async function LandingPage() {
  const { lost, adopt, reunited } = await getRecent();
  return (
    <>
      <MarketingHeader />
      <main id="main">
        {/* Hero */}
        <section className="relative overflow-hidden bg-primary text-white">
          <div className="mx-auto grid max-w-6xl items-end gap-8 px-5 pb-0 pt-12 md:grid-cols-[1.15fr_1fr] md:pt-20 [&>*]:min-w-0">
            <div className="pb-12 md:pb-20">
              <h1 className="text-[2.9rem] font-bold leading-[1.02] tracking-tight text-balance sm:text-[4.2rem]">Pet neighbours, from Dwarka to Noida.</h1>
              <p className="mt-5 max-w-lg text-[1.1rem] font-semibold text-white/90 text-pretty">
                Lost-pet alerts for your area, free adoption with no prices ever, playdates in your park, and Kaia for everyday pet questions.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/login" className={buttonClasses("white", "lg")}>Join free</Link>
                <Link href="/login?next=/lost/new" className={buttonClasses("danger", "lg")}><MapPin className="h-5 w-5" aria-hidden /> I lost my pet</Link>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[0.98rem] font-extrabold">
                <Link href="/login?next=/lost/new%3Ftype%3Dfound" className="underline decoration-2 underline-offset-4 hover:text-cream">I found a pet →</Link>
                <Link href="/lost" className="underline decoration-2 underline-offset-4 hover:text-cream">See lost pets near me</Link>
              </div>
              <p className="mt-7 text-[0.9rem] font-bold text-white/80">Free forever · Your number stays hidden until you choose to share it · No buying or selling animals</p>
            </div>
            <div className="relative flex h-full min-h-48 items-end justify-center overflow-hidden sm:min-h-64" aria-hidden>
              <span className="absolute bottom-0 left-1/2 h-48 w-[110%] -translate-x-1/2 rounded-t-full bg-white/10" />
              <PetArt pet={{ species: "dog", look: "brown" }} className="relative h-44 w-44 animate-[pm-bob_3.4s_ease-in-out_infinite] sm:h-80 sm:w-80" />
              <PetArt pet={{ species: "cat", look: "violet" }} className="relative -ml-10 h-32 w-32 sm:-ml-16 sm:h-60 sm:w-60" />
              {reunited > 0 && <Stamp tone="violet" className="absolute right-2 top-6 text-lg sm:top-10">{reunited} reunited</Stamp>}
            </div>
          </div>
        </section>

        {/* Lost & Found */}
        <section aria-labelledby="lf" className="halftone bg-danger text-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 md:grid-cols-[1fr_1.4fr] md:items-center">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-white/85">Lost &amp; Found</p>
              <h2 id="lf" className="mt-2 text-[2.3rem] font-bold leading-tight sm:text-[2.8rem]">Lost a pet? Every minute counts.</h2>
              <p className="mt-3 text-[1.05rem] font-semibold text-white/90">Post a photo and the last-seen spot. People in that area get an alert, and you get a printable poster and an image for WhatsApp with a QR code.</p>
              <ul className="mt-5 space-y-2 font-bold">
                <li className="flex items-center gap-2"><QrCode className="h-5 w-5" aria-hidden /> Poster with a QR code, ready to print</li>
                <li className="flex items-center gap-2"><MapPin className="h-5 w-5" aria-hidden /> &quot;I saw him&quot; sends the spot straight to the owner</li>
              </ul>
              <Link href="/lost" className={`${buttonClasses("white", "lg")} mt-6`}>See all lost pets <ArrowRight className="h-5 w-5" aria-hidden /></Link>
            </div>
            {lost.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{lost.map((l) => <LostFoundCard key={l.id} item={l} size="sm" className="ring-4 ring-white/15" />)}</div>
            ) : (
              <div className="flex flex-col items-center rounded-[var(--radius-xl)] bg-white/10 p-8 text-center">
                <PetArt pet={{ species: "dog", look: "beagle" }} className="h-32 w-32" />
                <p className="mt-3 font-heading text-2xl font-semibold">No open reports right now. A good day!</p>
              </div>
            )}
          </div>
        </section>

        {/* Adopt */}
        <section aria-labelledby="adopt" className="bg-secondary text-ink">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-xl">
                <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-ink/70">Adopt</p>
                <h2 id="adopt" className="mt-2 text-[2.3rem] font-bold leading-tight sm:text-[2.8rem]">Adopt. Don&apos;t shop.</h2>
                <p className="mt-3 text-[1.05rem] font-semibold text-ink/80">Fosters and NGOs list Indies and desi cats for free. No prices and no &quot;rehoming fees&quot;, ever.</p>
              </div>
              <Link href="/adopt" className={buttonClasses("primary", "lg")}>See pets for adoption</Link>
            </div>
            {adopt.length > 0 && <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{adopt.map((a) => <AdoptionCard key={a.id} item={a} />)}</div>}
          </div>
        </section>

        {/* Playdates + Care */}
        <section className="mx-auto grid max-w-6xl gap-4 px-5 py-16 md:grid-cols-2">
          <article className="relative overflow-hidden rounded-[var(--radius-xl)] bg-cat p-7 text-white">
            <Users className="h-8 w-8" aria-hidden />
            <h2 className="mt-3 text-[2rem] font-bold leading-tight">A playmate in your park.</h2>
            <p className="mt-2 max-w-sm font-semibold text-white/90">Find a dog or cat nearby for a walk. WhatsApp unlocks only when both owners say yes. No stud fees, ever.</p>
            <PetArt pet={{ species: "dog", look: "golden" }} className="absolute -bottom-3 right-3 h-32 w-32" />
            <div className="h-24" />
          </article>
          <article className="relative overflow-hidden rounded-[var(--radius-xl)] bg-primary p-7 text-white">
            <Syringe className="h-8 w-8" aria-hidden />
            <h2 className="mt-3 text-[2rem] font-bold leading-tight">One page for your pet.</h2>
            <p className="mt-2 max-w-sm font-semibold text-white/90">Vaccines, vet visits and weight in one private place. Reminders go straight into your phone&apos;s calendar.</p>
            <ul className="mt-4 flex flex-wrap gap-2 text-sm font-extrabold">
              <li className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5"><CalendarHeart className="h-4 w-4" aria-hidden /> Calendar reminders</li>
              <li className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5"><ShieldCheck className="h-4 w-4" aria-hidden /> Private by default</li>
            </ul>
          </article>
        </section>

        {/* Kaia */}
        <section aria-labelledby="kaia" className="bg-cream text-ink">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-2">
            <div className="order-2 space-y-3 md:order-1" aria-label="Example chat">
              <div className="flex items-center gap-2"><KaiaAvatar size={44} className="bg-white" /><span className="font-heading text-xl font-semibold">Kaia</span><span className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold">Example chat</span></div>
              <p className="ml-auto max-w-xs rounded-[1.25rem] rounded-br-md bg-primary px-4 py-3 font-semibold text-white">Bruno keeps scratching after walks. Ticks?</p>
              <p className="max-w-sm rounded-[1.25rem] rounded-bl-md bg-white px-4 py-3 font-semibold">Could be! Check his ears, neck and between the toes after each walk. If you find one, your vet can suggest the right tick treatment.</p>
            </div>
            <div className="order-1 md:order-2">
              <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-ink/70">Meet Kaia</p>
              <h2 id="kaia" className="mt-2 text-[2.3rem] font-bold leading-tight sm:text-[2.8rem]">Pet-care answers, any time of day.</h2>
              <p className="mt-3 text-[1.05rem] font-semibold text-ink/80">Ticks, vaccines, Delhi heat, Diwali nerves. Kaia is an AI helper, not a vet, and points you to one straight away for anything serious.</p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section aria-labelledby="how" className="mx-auto max-w-6xl px-5 py-16">
          <h2 id="how" className="text-[2.2rem] font-bold">Three steps to join the pack</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ["Sign up in seconds", "Continue with Google, or get a sign-in code by email. No passwords."],
              ["Add your pets", "A profile for each dog or cat, with birthday and vaccine reminders."],
              ["Pick your area", "See nearby posts, lost pets and adoptions first."],
            ].map(([t, d], i) => (
              <li key={t} className="rounded-[var(--radius-xl)] bg-surface p-6 shadow-[var(--shadow-card)]">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary font-heading text-2xl font-bold text-ink" aria-hidden>{i + 1}</span>
                <h3 className="mt-4 text-xl font-semibold">{t}</h3>
                <p className="mt-1 text-muted">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* NGOs */}
        <section id="ngos" aria-labelledby="ngo-h" className="bg-ink text-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-5 py-14">
            <div className="max-w-xl">
              <HeartHandshake className="h-8 w-8 text-secondary" aria-hidden />
              <h2 id="ngo-h" className="mt-3 text-[2rem] font-bold">For NGOs and rescuers</h2>
              <p className="mt-2 font-semibold text-white/85">List your animals for free, with your organisation&apos;s name on every listing. Adopters reach you on WhatsApp.</p>
            </div>
            <a href="mailto:ngo@pupmeow.in?subject=Partner%20with%20Pupmeow" className={buttonClasses("white", "lg")}>Partner with us</a>
          </div>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq" className="mx-auto max-w-3xl px-5 py-16">
          <h2 id="faq" className="text-[2.2rem] font-bold">Questions people ask</h2>
          <div className="mt-6 space-y-2">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-[var(--radius-lg)] bg-surface px-5 py-4 shadow-[var(--shadow-card)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[1.05rem] font-bold">
                  {f.q}
                  <ChevronDown className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <p className="mt-2 text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
