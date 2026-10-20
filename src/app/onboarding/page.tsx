import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { Logo } from "@/components/layout/logo";
import { PetArt } from "@/components/brand/pet-art";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Set up your profile", robots: { index: false } };

export default async function OnboardingPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/onboarding");
  if (profile.is_banned) redirect("/suspended");
  if (profile.onboarded) redirect("/home");

  const suggested = (profile.display_name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 16);
  const first = (profile.display_name ?? "").split(" ")[0];

  return (
    <main id="main" className="min-h-dvh bg-background">
      <div className="bg-primary text-on-primary">
        <div className="mx-auto flex max-w-3xl items-end justify-between gap-4 px-4 pt-6">
          <div className="pb-8">
            <Logo className="[&_span]:text-white [&_svg]:rounded-[9px] [&_svg]:ring-2 [&_svg]:ring-white/80" />
            <h1 className="mt-6 text-[2.3rem] font-bold leading-tight sm:text-[2.8rem]">{first ? `Welcome, ${first}!` : "Welcome to the pack!"}</h1>
            <p className="mt-1 font-semibold text-on-primary/90">Let&apos;s set up your profile. It takes about a minute, and you can change everything later.</p>
          </div>
          <div className="hidden items-end sm:flex" aria-hidden>
            <PetArt pet={{ species: "dog", look: "golden" }} className="h-32 w-32" />
            <PetArt pet={{ species: "cat", look: "violet" }} className="-ml-8 h-24 w-24" />
          </div>
        </div>
      </div>
      <div className="mx-auto -mt-2 max-w-3xl px-4 pb-16">
        <div className="rounded-[var(--radius-xl)] bg-surface p-5 shadow-[var(--shadow-card)] sm:p-8">
          <OnboardingForm
            userId={profile.id}
            defaults={{ display_name: profile.display_name ?? "", username: suggested.length >= 3 ? suggested : "", avatar_url: profile.avatar_url }}
          />
        </div>
      </div>
    </main>
  );
}
