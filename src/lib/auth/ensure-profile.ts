import "server-only";
import type { User } from "@supabase/supabase-js";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

function displayNameFromUser(user: User): string {
  const meta = user.user_metadata ?? {};
  const raw =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    user.email?.split("@")[0] ||
    "Pupmeow member";
  return raw.slice(0, 50);
}

function avatarFromUser(user: User): string | null {
  const meta = user.user_metadata ?? {};
  if (typeof meta.avatar_url === "string" && meta.avatar_url) return meta.avatar_url;
  if (typeof meta.picture === "string" && meta.picture) return meta.picture;
  return null;
}

/** Idempotent — matches DB trigger `handle_new_user` if it is slow or missed. */
export async function ensureProfileForUser(user: User) {
  if (!hasServiceRole()) return;
  const admin = createAdminClient();
  const { data: existing } = await admin.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (existing) return;
  await admin.from("profiles").insert({
    id: user.id,
    display_name: displayNameFromUser(user),
    avatar_url: avatarFromUser(user),
  });
  await admin.from("profile_private").upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });
}
