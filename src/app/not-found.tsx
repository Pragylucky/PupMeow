import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { PetArt } from "@/components/brand/pet-art";

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 text-center">
      <Logo className="mb-8" />
      <p className="font-heading text-[6rem] font-bold leading-none text-secondary">404</p>
      <PetArt pet={{ species: "dog", look: "beagle" }} className="-mt-6 h-36 w-36" />
      <h1 className="mt-4 text-[2rem] font-semibold">This page ran off chasing a squirrel</h1>
      <p className="mt-1 max-w-sm text-muted">It may have been removed, or the link is wrong.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/" className={buttonClasses()}>Go home</Link>
        <Link href="/lost" className={buttonClasses("outline")}>Lost &amp; Found</Link>
      </div>
    </main>
  );
}
