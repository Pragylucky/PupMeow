import type { SupabaseClient } from "@supabase/supabase-js";
import { safeNext } from "@/lib/redirect";

async function loadProfile(supabase: SupabaseClient, userId: string) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded, is_banned")
      .eq("id", userId)
      .maybeSingle();
    if (profile) return profile;
    if (attempt < 5) await new Promise((r) => setTimeout(r, 120 * (attempt + 1)));
  }
  return null;
}

/** Where to send the user after a successful sign-in (onboarding, suspended, or `next`). */
export async function resolvePostSignInPath(
  supabase: SupabaseClient,
  userId: string,
  next: string | null | undefined,
): Promise<string> {
  const profile = await loadProfile(supabase, userId);
  if (profile?.is_banned) return "/suspended";
  if (!profile || !profile.onboarded) return "/onboarding";
  return safeNext(next);
}
