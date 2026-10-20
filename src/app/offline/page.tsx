import type { Metadata } from "next";
import { Logo } from "@/components/layout/logo";
import { PetArt } from "@/components/brand/pet-art";

export const metadata: Metadata = { title: "You're offline", robots: { index: false } };

export default function OfflinePage() {
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <Logo className="mb-8" />
      <PetArt pet={{ species: "cat", look: "grey" }} className="h-32 w-32" />
      <h1 className="mt-4 text-[2rem] font-semibold">You&apos;re offline</h1>
      <p className="mt-1 max-w-sm text-muted">Check your internet connection. Pupmeow will be right here when you&apos;re back.</p>
    </main>
  );
}
