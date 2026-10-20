import type { SupabaseClient } from "@supabase/supabase-js";
import { safeNext } from "@/lib/redirect";

/** Where to send the user after a successful sign-in (onboarding, suspended, or `next`). */
export async function resolvePostSignInPath(
  supabase: SupabaseClient,
  userId: string,
  next: string | null | undefined,
): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded, is_banned")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.is_banned) return "/suspended";
  if (!profile?.onboarded) return "/onboarding";
  return safeNext(next);
}
