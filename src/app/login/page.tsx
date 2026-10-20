import type { Metadata } from "next";
import Link from "next/link";
import { HeartHandshake, MapPin, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { PetArt } from "@/components/brand/pet-art";
import { LoginForm } from "./login-form";
import { safeNext } from "@/lib/redirect";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  return (
    <main id="main" className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-primary p-10 text-on-primary lg:flex lg:flex-col">
        <Logo className="[&_span]:text-white [&_svg]:rounded-[9px] [&_svg]:ring-2 [&_svg]:ring-white/80" />
        <div className="mt-auto max-w-lg pb-56">
          <h1 className="text-[3.6rem] font-bold leading-[1.02]">Delhi&apos;s pet community.</h1>
          <p className="mt-4 text-[1.1rem] font-semibold text-on-primary/90">Lost-pet alerts for your area, free adoption, playdates and Kaia, for dog and cat families across Delhi NCR.</p>
          <ul className="mt-6 space-y-3 font-bold">
            <li className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15"><MapPin className="h-5 w-5" aria-hidden /></span> Alerts when a pet goes missing near you</li>
            <li className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15"><HeartHandshake className="h-5 w-5" aria-hidden /></span> Free adoption. No buying or selling, ever</li>
            <li className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15"><ShieldCheck className="h-5 w-5" aria-hidden /></span> Your number stays private until you choose</li>
          </ul>
        </div>
        <div className="pointer-events-none absolute bottom-0 left-10 flex items-end" aria-hidden>
          <PetArt pet={{ species: "dog", look: "brown" }} className="h-56 w-56" />
          <PetArt pet={{ species: "cat", look: "black" }} className="-ml-12 h-44 w-44" />
          <PetArt pet={{ species: "dog", look: "golden" }} className="-ml-10 h-48 w-48" />
        </div>
      </section>

      <section className="flex flex-col items-center justify-center bg-background px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Logo />
            <PetArt pet={{ species: "dog", look: "golden" }} className="h-16 w-16" />
          </div>
          <div className="rounded-[var(--radius-xl)] bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8">
            <h2 className="text-[2rem] font-semibold leading-tight">Welcome to Pupmeow</h2>
            <p className="mb-6 mt-1 text-muted">Log in or create your free account. Browsing lost pets never needs one.</p>
            <LoginForm next={next} initialError={sp.error ? decodeURIComponent(sp.error) : undefined} />
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
