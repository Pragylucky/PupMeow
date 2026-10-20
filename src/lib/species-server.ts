import "server-only";
import { cookies } from "next/headers";
import { getCurrentProfile } from "@/lib/auth";
import { SPECIES_COOKIE, parseSpeciesPref } from "@/lib/species";
import type { SpeciesPref } from "@/types/database";

/** Cookie wins (instant toggles), then the saved profile choice, then "both". */
export async function getSpeciesPref(): Promise<SpeciesPref> {
  const store = await cookies();
  const fromCookie = store.get(SPECIES_COOKIE)?.value;
  if (fromCookie) return parseSpeciesPref(fromCookie);
  const profile = await getCurrentProfile();
  return parseSpeciesPref(profile?.species_pref);
}
