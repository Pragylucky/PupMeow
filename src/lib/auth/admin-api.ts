import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Returns true when the request has a signed-in admin (for API routes). */
export async function isAdminApiRequest(): Promise<boolean> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;
  const { data: profile } = await supabase.from("profiles").select("role, is_banned").eq("id", userData.user.id).maybeSingle();
  return Boolean(profile && !profile.is_banned && profile.role === "admin");
}
