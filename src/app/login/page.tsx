import type { Metadata } from "next";
import Link from "next/link";
import { HeartHandshake, MapPin, PawPrint, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { PetArt } from "@/components/brand/pet-art";
import { PetSign } from "@/components/brand/pet-sign";
import { HeroPets, RotatingWord } from "@/components/marketing/landing-motion";
import { LoginForm } from "./login-form";
import { loginErrorMessage } from "@/lib/login-errors";
import { safeNext } from "@/lib/redirect";

const CITIES = ["Dwarka", "Noida", "Gurugram", "Ghaziabad", "Faridabad"];
/** Staggered entrance: each piece rises in a beat after the last. Reduced motion turns it off globally. */
const rise = (i: number) => ({ className: "animate-[pm-rise_650ms_ease-out_both]", style: { animationDelay: `${120 + i * 110}ms` } });
/** Faint paw prints drifting behind the green panel. */
const PAWS = [
  { cls: "left-[8%] top-[14%] h-10 w-10 rotate-[-18deg]", delay: "0s", dur: "7s" },
  { cls: "right-[10%] top-[22%] h-14 w-14 rotate-[14deg]", delay: "-2s", dur: "8.5s" },
  { cls: "right-[22%] top-[52%] h-8 w-8 rotate-[-8deg]", delay: "-4s", dur: "6.5s" },
  { cls: "left-[34%] top-[8%] h-7 w-7 rotate-[22deg]", delay: "-1s", dur: "9s" },
];

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  return (
    <main id="main" className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-primary p-10 text-on-primary lg:flex lg:flex-col">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <span className="absolute -right-24 -top-24 h-80 w-80 animate-[pm-float_9s_ease-in-out_infinite] rounded-full bg-white/[0.07]" />
          <span className="absolute -bottom-16 right-[18%] h-64 w-64 animate-[pm-float_11s_ease-in-out_infinite] rounded-full bg-secondary/15 [animation-delay:-3s]" />
          {PAWS.map((p, i) => (
            <PawPrint key={i} className={`absolute text-white/15 animate-[pm-float_var(--d)_ease-in-out_infinite] ${p.cls}`} style={{ "--d": p.dur, animationDelay: p.delay } as React.CSSProperties} />
          ))}
        </div>
        <Logo className="[&_span]:text-white [&_svg]:rounded-[9px] [&_svg]:ring-2 [&_svg]:ring-white/80" />
        <div className="mt-auto max-w-lg pb-56">
          <h1 className={`text-[3.6rem] font-bold leading-[1.02] ${rise(0).className}`} style={rise(0).style}><RotatingWord words={["Delhi's", "Dwarka's", "Noida's", "Gurugram's"]} /> pet community.</h1>
          <p className={`mt-4 text-[1.1rem] font-semibold text-on-primary/90 ${rise(1).className}`} style={rise(1).style}>Lost-pet alerts for your area, free adoption, playdates and Kaia, for dog and cat families across Delhi NCR.</p>
          <ul className="mt-6 space-y-3 font-bold">
            <li className={`flex items-center gap-3 ${rise(2).className}`} style={rise(2).style}><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15"><MapPin className="h-5 w-5" aria-hidden /></span> Alerts when a pet goes missing near you</li>
            <li className={`flex items-center gap-3 ${rise(3).className}`} style={rise(3).style}><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15"><HeartHandshake className="h-5 w-5" aria-hidden /></span> Free adoption. No buying or selling, ever</li>
            <li className={`flex items-center gap-3 ${rise(4).className}`} style={rise(4).style}><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15"><ShieldCheck className="h-5 w-5" aria-hidden /></span> Your number stays private until you choose</li>
          </ul>
        </div>
        {/* Their eyes follow the cursor, and a tap makes them hop. */}
        <div className="absolute bottom-0 left-10 flex items-end">
          <HeroPets>
            <PetArt pet={{ species: "dog", look: "brown" }} animated className="h-56 w-56" />
            <PetArt pet={{ species: "cat", look: "black" }} animated className="h-44 w-44" />
          </HeroPets>
          <PetArt pet={{ species: "dog", look: "golden" }} animated className="pointer-events-none -ml-10 h-48 w-48" />
          <PetSign paw="left" className="-ml-9 mb-5 hidden w-[8.75rem] xl:block" />
        </div>
      </section>

      <section className="relative flex flex-col items-center justify-center overflow-hidden bg-background px-4 py-10 sm:px-8">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <span className="absolute -left-20 top-10 h-56 w-56 animate-[pm-float_10s_ease-in-out_infinite] rounded-full bg-secondary-soft/70" />
          <span className="absolute -right-16 bottom-16 h-64 w-64 animate-[pm-float_12s_ease-in-out_infinite] rounded-full bg-primary-soft/70 [animation-delay:-4s]" />
        </div>
        <div className="relative w-full max-w-md">
          <div className="lg:hidden">
            <Logo />
            <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-surface px-3.5 py-2 text-sm font-bold shadow-[var(--shadow-card)]">
              <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" /></span>
              Lost-pet alerts for <RotatingWord words={CITIES} className="text-primary" />
            </p>
          </div>
          {/* Phones: the dog holds the note. Medium screens: just the taped note. Wide screens: the green panel's dog holds it. */}
          <div className="mt-6 flex items-end justify-end pr-3 lg:hidden">
            <PetSign paw="right" className="-mr-3 mb-3" />
            <HeroPets>
              <PetArt pet={{ species: "dog", look: "golden" }} animated className="h-24 w-24" />
              <PetArt pet={{ species: "cat", look: "violet" }} animated className="h-20 w-20" />
            </HeroPets>
          </div>
          <div className="mb-3 mt-2 hidden justify-end pr-2 lg:flex xl:hidden"><PetSign /></div>
          <div className="relative rounded-[var(--radius-xl)] bg-surface p-6 shadow-[var(--shadow-card)] animate-[pm-rise_600ms_ease-out_both] [animation-delay:150ms] sm:p-8">
            <h2 className="text-[2rem] font-semibold leading-tight">Welcome to Pupmeow</h2>
            <p className="mb-6 mt-1 text-muted">Log in or create your free account. Browsing lost pets never needs one.</p>
            <LoginForm next={next} initialError={loginErrorMessage(sp.error)} />
          </div>
          <p className="mt-5 text-center text-sm text-muted">
            <Link href="/lost" className="font-bold text-text underline underline-offset-2">See lost pets near me</Link>
          </p>
          <p className="mt-3 text-center text-xs text-muted">
            By continuing you agree to our <Link className="underline" href="/terms">Terms</Link> and <Link className="underline" href="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}
