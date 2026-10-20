import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { env } from "@/lib/env";
import { SPECIES_COOKIE, parseSpeciesPref } from "@/lib/species";
import type { SpeciesPref } from "@/types/database";

/** Cookie wins (instant toggles), then the saved profile choice, then "both". */
function hasAuthCookies(store: Awaited<ReturnType<typeof cookies>>) {
  return store.getAll().some((c) => c.name.includes("-auth-token") || (c.name.startsWith("sb-") && c.name.includes("auth")));
}

export async function getSpeciesPref(): Promise<SpeciesPref> {
  const store = await cookies();
  const fromCookie = store.get(SPECIES_COOKIE)?.value;
  if (fromCookie) return parseSpeciesPref(fromCookie);
  if (!hasAuthCookies(store)) return "both";
  const viewer = await getViewer();
  if (!viewer || !env.supabaseUrl) return "both";
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("species_pref").eq("id", viewer.id).maybeSingle();
  return parseSpeciesPref(data?.species_pref);
}
