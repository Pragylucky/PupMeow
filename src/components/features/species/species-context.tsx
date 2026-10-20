"use client";

import { createContext, useCallback, useContext, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SPECIES_COOKIE, SPECIES_STORAGE_KEY, parseSpeciesPref } from "@/lib/species";
import { saveSpeciesPref } from "@/lib/actions/profile";
import type { SpeciesPref } from "@/types/database";

const Ctx = createContext<{ species: SpeciesPref; setSpecies: (s: SpeciesPref) => void; pending: boolean } | null>(null);

function writeCookie(value: SpeciesPref) {
  document.cookie = `${SPECIES_COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

/** Dog / Cat / Both choice: cookie (for server rendering) + localStorage + profile. */
export function SpeciesProvider({ initial, children }: { initial: SpeciesPref; children: React.ReactNode }) {
  const [species, setState] = useState<SpeciesPref>(initial);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SPECIES_STORAGE_KEY);
      const hasCookie = document.cookie.includes(`${SPECIES_COOKIE}=`);
      if (stored && !hasCookie && parseSpeciesPref(stored) !== initial) {
        const v = parseSpeciesPref(stored);
        setState(v);
        writeCookie(v);
        document.documentElement.dataset.species = v;
        router.refresh();
      } else {
        localStorage.setItem(SPECIES_STORAGE_KEY, initial);
      }
    } catch {
      /* storage blocked: cookie alone still works */
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSpecies = useCallback((s: SpeciesPref) => {
    setState(s);
    writeCookie(s);
    document.documentElement.dataset.species = s;
    try { localStorage.setItem(SPECIES_STORAGE_KEY, s); } catch { /* ignore */ }
    startTransition(async () => {
      await saveSpeciesPref(s);
      router.refresh();
    });
  }, [router]);

  return <Ctx.Provider value={{ species, setSpecies, pending }}>{children}</Ctx.Provider>;
}

export function useSpecies() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSpecies must be used inside SpeciesProvider");
  return ctx;
}
