"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonClasses } from "@/components/ui/button";
import { PetArt } from "@/components/brand/pet-art";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main id="main" className="flex min-h-[70dvh] flex-col items-center justify-center px-4 text-center">
      <PetArt pet={{ species: "cat", look: "orange" }} className="h-32 w-32" />
      <h1 className="mt-4 text-[2rem] font-semibold">Something knocked this page off the table</h1>
      <p className="mt-1 max-w-sm text-muted">Please try again. If it keeps happening, let us know.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>Try again</Button>
        <Link href="/home" className={buttonClasses("outline")}>Go home</Link>
      </div>
    </main>
  );
}
