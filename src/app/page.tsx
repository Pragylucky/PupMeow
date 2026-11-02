import Link from "next/link";
import { ArrowRight, BellRing, CalendarHeart, ChevronDown, HeartHandshake, House, MapPin, MessageCircleHeart, PawPrint, QrCode, ShieldCheck, Sparkles, Syringe, Users } from "lucide-react";
import { getLandingRecentCached } from "@/lib/cache/public-listings";
import { MarketingHeader, SiteFooter } from "@/components/marketing/site-footer";
import { LostFoundCard, AdoptionCard } from "@/components/features/listings/listing-cards";
import { CountUp, HeroPets, KaiaDemoChat, Reveal, RotatingWord } from "@/components/marketing/landing-motion";
import { PetArt } from "@/components/brand/pet-art";
import { Stamp } from "@/components/brand/bits";
import { buttonClasses } from "@/components/ui/button";
import { contactMailto } from "@/lib/constants";
import type { AdoptionRow, LostFoundRow } from "@/types/database";

export const revalidate = 300;

async function getRecent() {
  const empty = { lost: [] as LostFoundRow[], adopt: [] as AdoptionRow[], reunited: 0, reunitedRecent: [] as LostFoundRow[], adoptedRecent: [] as AdoptionRow[] };
  try {
    return await Promise.race([
      getLandingRecentCached(),
      new Promise<typeof empty>((_, reject) => setTimeout(() => reject(new Error("timeout")), 4_000)),
    ]);
  } catch {
    return empty;
  }
}

/** Feature chips floating in the hero's empty top corner (large screens only). */
const HERO_CHIPS = [
  { icon: BellRing, label: "Lost-pet alerts", tint: "text-danger", pos: "left-[3%] top-[6%]" },
  { icon: House, label: "Free adoption", tint: "text-secondary-strong", pos: "left-[38%] top-[17%]" },
  { icon: PawPrint, label: "Playdates nearby", tint: "text-cat", pos: "left-[6%] top-[29%]" },
  { icon: MessageCircleHeart, label: "Ask Kaia", tint: "text-primary", pos: "right-[4%] top-[28%]" },
];

const STEPS = [
  { icon: Sparkles, title: "Sign up in seconds", body: "Continue with Google. No passwords." },
  { icon: PawPrint, title: "Add your pets", body: "A profile for each dog or cat, with photos and private health records." },
  { icon: MapPin, title: "Pick your area", body: "See nearby posts, lost pets and adoptions first." },
];

const FAQ = [
  { q: "Is Pupmeow free?", a: "Yes. Joining, posting, reporting lost pets and listing pets for adoption are all free." },
  { q: "Can I sell puppies or kittens here?", a: "No. Pupmeow is for free adoption only. Listings that mention a price, rehoming fee or stud fee are removed." },
  { q: "Who can see my phone number?", a: "Only signed-in members who tap Call or WhatsApp on your lost, found or adoption post. It's never shown to visitors who aren't logged in, and never on your profile." },
  { q: "Which areas do you cover?", a: "All of Delhi NCR: Delhi, Noida, Greater Noida, Gurugram, Ghaziabad and Faridabad." },
  { q: "Is Kaia, the AI helper, a vet?", a: "No. Kaia gives general care tips and flags emergencies, but it's not a substitute for a vet." },
  { q: "Is there an Android app?", a: "Yes — install from Chrome (Add to Home screen) at pupmeow.in, or see our Get the app page for an APK via PWABuilder. It's the same website, full screen." },
];

export default async function LandingPage() {
  const { lost, adopt, reunited, reunitedRecent, adoptedRecent } = await getRecent();
  return (
    <>
      <MarketingHeader />
      <main id="main">
        {/* Hero */}
        <section className="relative overflow-hidden bg-primary text-on-primary">
          <div className="mx-auto grid max-w-6xl items-end gap-8 px-5 pb-0 pt-12 md:grid-cols-[1.15fr_1fr] md:pt-20 [&>*]:min-w-0">
            <div className="pb-12 md:pb-20">
              <h1 className="text-[2.9rem] font-bold leading-[1.02] tracking-tight text-balance sm:text-[4.2rem]">
                Pet neighbours, from Dwarka to <RotatingWord words={["Noida", "Gurugram", "Ghaziabad", "Faridabad"]} />.
              </h1>
              <p className="mt-5 max-w-lg text-[1.1rem] font-semibold text-on-primary/90 text-pretty">
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
              <p className="mt-7 text-[0.9rem] font-bold text-on-primary/80">Free forever · Your number stays hidden until you choose to share it · No buying or selling animals</p>
            </div>
            <div className="relative flex h-full min-h-48 items-end justify-center overflow-hidden sm:min-h-64" aria-hidden>
              <span className="absolute bottom-0 left-1/2 h-48 w-[110%] -translate-x-1/2 rounded-t-full bg-white/10" />
              {HERO_CHIPS.map(({ icon: Icon, label, tint, pos }, k) => (
                <span
                  key={label}
                  className={`absolute hidden items-center gap-2 rounded-full bg-white px-4 py-2 text-[0.95rem] font-extrabold text-ink shadow-[0_6px_20px_rgb(26_34_51/0.18)] lg:inline-flex ${pos}`}
                  style={{ animation: `pm-rise 500ms ${200 + k * 150}ms ease-out both, pm-float ${5 + k * 0.7}s ${900 + k * 150}ms ease-in-out infinite` }}
                >
                  <Icon className={`h-[1.1rem] w-[1.1rem] ${tint}`} aria-hidden /> {label}
                </span>
              ))}
              <HeroPets>
                <PetArt pet={{ species: "dog", look: "brown" }} animated className="h-44 w-44 sm:h-80 sm:w-80" />
                <PetArt pet={{ species: "cat", look: "violet" }} animated className="h-32 w-32 sm:h-60 sm:w-60" />
              </HeroPets>
              {reunited > 0 && <Stamp tone="violet" className="absolute right-2 top-6 text-lg sm:top-10"><CountUp value={reunited} />&nbsp;reunited</Stamp>}
            </div>
          </div>
        </section>

        {/* Lost & Found */}
        <section aria-labelledby="lf" className="halftone bg-danger text-white">
          <Reveal className="mx-auto grid max-w-6xl gap-8 px-5 py-16 md:grid-cols-[1fr_1.4fr] md:items-center">
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
              <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{lost.map((l) => <LostFoundCard key={l.id} item={l} size="sm" className="ring-4 ring-white/15" />)}</div>
            ) : (
              <div className="flex flex-col items-center rounded-[var(--radius-xl)] bg-white/10 p-8 text-center">
                <PetArt pet={{ species: "dog", look: "beagle" }} animated className="h-32 w-32" />
                <p className="mt-3 font-heading text-2xl font-semibold">No open reports right now. A good day!</p>
              </div>
            )}
          </Reveal>
        </section>

        {/* Adopt */}
        <section aria-labelledby="adopt" className="bg-secondary text-ink">
          <Reveal className="mx-auto max-w-6xl px-5 py-16">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-xl">
                <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-ink/70">Adopt</p>
                <h2 id="adopt" className="mt-2 text-[2.3rem] font-bold leading-tight sm:text-[2.8rem]">Adopt. Don&apos;t shop.</h2>
                <p className="mt-3 text-[1.05rem] font-semibold text-ink/80">Fosters and NGOs list Indies and desi cats for free. No prices and no &quot;rehoming fees&quot;, ever.</p>
              </div>
              <Link href="/adopt" className={buttonClasses("primary", "lg")}>See pets for adoption</Link>
            </div>
            {adopt.length > 0 ? (
              <div className="stagger mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{adopt.map((a) => <AdoptionCard key={a.id} item={a} />)}</div>
            ) : (
              <div className="mt-8 flex flex-col items-center gap-5 rounded-[var(--radius-xl)] bg-white/45 p-8 text-center sm:flex-row sm:text-left">
                <div className="flex shrink-0 items-end">
                  <PetArt pet={{ species: "cat", look: "orange" }} animated className="h-24 w-24" />
                  <PetArt pet={{ species: "dog", look: "cream" }} animated className="-ml-5 h-28 w-28" />
                </div>
                <div>
                  <p className="font-heading text-2xl font-semibold">No pets listed right this minute.</p>
                  <p className="mt-1 font-semibold text-ink/75">Fosters and NGOs add Indies and desi cats all the time, so check back soon.</p>
                  <Link href="#ngos" className="mt-3 inline-flex items-center gap-1.5 font-extrabold underline decoration-2 underline-offset-4">Rescuer or NGO? List your animals free <ArrowRight className="h-4 w-4" aria-hidden /></Link>
                </div>
              </div>
            )}
          </Reveal>
        </section>

        {/* Happy endings: real reunions and adoptions only; hidden until there are some. */}
        {reunitedRecent.length + adoptedRecent.length > 0 && (
          <section aria-labelledby="happy" className="mx-auto max-w-6xl px-5 pt-16">
            <Reveal>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="max-w-xl">
                  <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-muted">Happy endings</p>
                  <h2 id="happy" className="mt-2 text-[2.3rem] font-bold leading-tight sm:text-[2.8rem]">Home again, home at last.</h2>
                  <p className="mt-3 text-[1.05rem] font-semibold text-muted">
                    Real pets from the community{reunited > 0 ? `: ${reunited} reunited with their families so far` : ""}.
                  </p>
                </div>
                <Link href="/lost?tab=reunited" className={buttonClasses("outline", "lg")}>See all reunions</Link>
              </div>
              <div className="stagger mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {reunitedRecent.map((l) => <LostFoundCard key={l.id} item={l} size="sm" />)}
                {adoptedRecent.map((a) => <AdoptionCard key={a.id} item={a} />)}
              </div>
            </Reveal>
          </section>
        )}

        {/* Playdates + Care */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <Reveal className="grid gap-4 md:grid-cols-2">
          <article className="group relative overflow-hidden rounded-[var(--radius-xl)] bg-cat p-7 text-white transition-transform duration-300 hover:-translate-y-1">
            <Users className="h-8 w-8" aria-hidden />
            <h2 className="mt-3 text-[2rem] font-bold leading-tight">A playmate in your park.</h2>
            <p className="mt-2 max-w-sm font-semibold text-white/90">Find a dog or cat nearby for a walk. WhatsApp unlocks only when both owners say yes. No stud fees, ever.</p>
            <PetArt pet={{ species: "dog", look: "golden" }} animated className="absolute -bottom-3 right-3 h-32 w-32 origin-bottom group-hover:animate-[pm-wiggle_600ms_ease-in-out]" />
            <div className="h-24" />
          </article>
          <article className="relative overflow-hidden rounded-[var(--radius-xl)] bg-primary p-7 text-on-primary transition-transform duration-300 hover:-translate-y-1">
            <Syringe className="h-8 w-8" aria-hidden />
            <h2 className="mt-3 text-[2rem] font-bold leading-tight">One page for your pet.</h2>
            <p className="mt-2 max-w-sm font-semibold text-on-primary/90">Vaccines, vet visits and weight in one private place. Reminders go straight into your phone&apos;s calendar.</p>
            <ul className="mt-4 flex flex-wrap gap-2 text-sm font-extrabold">
              <li className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5"><CalendarHeart className="h-4 w-4" aria-hidden /> Calendar reminders</li>
              <li className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5"><ShieldCheck className="h-4 w-4" aria-hidden /> Private by default</li>
            </ul>
          </article>
          </Reveal>
        </section>

        {/* Kaia */}
        <section aria-labelledby="kaia" className="bg-cream text-ink">
          <Reveal className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-2">
            <div className="order-2 md:order-1">
              <KaiaDemoChat />
            </div>
            <div className="order-1 md:order-2">
              <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-ink/70">Meet Kaia</p>
              <h2 id="kaia" className="mt-2 text-[2.3rem] font-bold leading-tight sm:text-[2.8rem]">Pet-care answers, any time of day.</h2>
              <p className="mt-3 text-[1.05rem] font-semibold text-ink/80">Ticks, vaccines, Delhi heat, Diwali nerves. Kaia is an AI helper, not a vet, and points you to one straight away for anything serious.</p>
            </div>
          </Reveal>
        </section>

        {/* How it works */}
        <section aria-labelledby="how" className="mx-auto max-w-6xl px-5 py-16">
          <Reveal>
          <h2 id="how" className="text-[2.2rem] font-bold">Three steps to join the pack</h2>
          <ol className="stagger mt-8 grid gap-4 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="group relative rounded-[var(--radius-xl)] bg-surface p-6 shadow-[var(--shadow-card)] transition-transform duration-300 hover:-translate-y-1">
                {/* Dashed path to the next step, across the grid gap. */}
                {i < STEPS.length - 1 && <span className="absolute left-full top-12 hidden w-4 border-t-2 border-dashed border-ink/25 sm:block" aria-hidden />}
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary font-heading text-2xl font-bold text-ink transition-transform group-hover:scale-110" aria-hidden>{i + 1}</span>
                  <Icon className="h-7 w-7 text-primary/70 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110" aria-hidden />
                </div>
                <h3 className="mt-4 text-xl font-semibold">{title}</h3>
                <p className="mt-1 text-muted">{body}</p>
              </li>
            ))}
          </ol>
          </Reveal>
        </section>

        {/* NGOs */}
        <section id="ngos" aria-labelledby="ngo-h" className="bg-ink text-white">
          <Reveal className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-5 py-14">
            <div className="max-w-xl">
              <HeartHandshake className="h-8 w-8 text-secondary" aria-hidden />
              <h2 id="ngo-h" className="mt-3 text-[2rem] font-bold">For NGOs and rescuers</h2>
              <p className="mt-2 font-semibold text-white/85">List your animals for free, with your organisation&apos;s name on every listing. Adopters reach you on WhatsApp.</p>
            </div>
            <a href={contactMailto("Partner with Pupmeow")} className={buttonClasses("white", "lg")}>Partner with us</a>
          </Reveal>
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
