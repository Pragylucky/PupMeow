import type { SpeciesPref } from "@/types/database";

export const SPECIES_COOKIE = "pm_species";
export const SPECIES_STORAGE_KEY = "pupmeow:species";

export function parseSpeciesPref(v: string | null | undefined): SpeciesPref {
  return v === "dog" || v === "cat" || v === "both" ? v : "both";
}

/** Supabase filter helper: which species values to include. */
export function speciesIn(pref: SpeciesPref): ("dog" | "cat")[] {
  return pref === "both" ? ["dog", "cat"] : [pref];
}
