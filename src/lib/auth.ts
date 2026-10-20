import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PROFILE_PUBLIC } from "@/lib/columns";
import { env } from "@/lib/env";
import type { ProfilePrivateRow, ProfileRow } from "@/types/database";
import type { User } from "@supabase/supabase-js";

const AUTH_TIMEOUT_MS = 5_000;

/** Session from cookies only — no Auth API round-trip (safe for layout / public pages). */
export const getViewer = cache(async (): Promise<User | null> => {
  if (!env.supabaseUrl || !env.supabaseAnonKey) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.user ?? null;
  } catch {
    return null;
  }
});

async function getVerifiedUser() {
  const supabase = await createClient();
  const result = await Promise.race([
    supabase.auth.getUser(),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("auth_timeout")), AUTH_TIMEOUT_MS)),
  ]);
  return result.data.user ?? null;
}

/** Verified current user (Auth API; capped at 5s so pages do not hang ~60s on bad networks). */
export const getUser = cache(async () => {
  if (!env.supabaseUrl || !env.supabaseAnonKey) return null;
  try {
    return await getVerifiedUser();
  } catch {
    return null;
  }
});

export const getCurrentProfile = cache(async (): Promise<ProfileRow | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select(PROFILE_PUBLIC).eq("id", user.id).maybeSingle();
  return (data as ProfileRow | null) ?? null;
});

export const getPrivateProfile = cache(async (): Promise<ProfilePrivateRow | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profile_private").select("*").eq("id", user.id).maybeSingle();
  return (data as ProfilePrivateRow | null) ?? null;
});

/** For pages: signed-in, onboarded, not banned — otherwise redirect. */
export async function requireProfile(next?: string): Promise<ProfileRow> {
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  if (profile.is_banned) redirect("/suspended");
  if (!profile.onboarded) redirect("/onboarding");
  return profile;
}

export async function requireAdmin(): Promise<ProfileRow> {
  const profile = await requireProfile("/admin");
  if (profile.role !== "admin") redirect("/home");
  return profile;
}

type ActionContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  profile: ProfileRow;
};

/** For server actions: returns context or an error string (never throws to the client). */
export async function actionContext(opts: { allowUnonboarded?: boolean } = {}): Promise<ActionContext | { error: string }> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Please sign in first." };
  const { data: profile } = await supabase.from("profiles").select(PROFILE_PUBLIC).eq("id", data.user.id).maybeSingle();
  if (!profile) return { error: "Your profile could not be found." };
  const p = profile as ProfileRow;
  if (p.is_banned) return { error: "Your account is suspended." };
  if (!p.onboarded && !opts.allowUnonboarded) return { error: "Please finish setting up your profile." };
  return { supabase, userId: data.user.id, profile: p };
}
