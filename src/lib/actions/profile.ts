"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { actionContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { onboardingSchema, profileSettingsSchema, notificationPrefsSchema, usernameSchema } from "@/lib/validations/profile";
import { petSchema } from "@/lib/validations/pet";
import { speciesPrefSchema, uuidSchema, zodFieldErrors } from "@/lib/validations/common";
import { SPECIES_COOKIE } from "@/lib/species";
import { friendlyError } from "@/lib/utils";
import { moderateText, blockedMessage } from "@/lib/ai/moderation";
import { isOwnUpload } from "@/lib/storage-paths";
import type { ActionResult } from "@/types/models";

export async function saveSpeciesPref(value: string): Promise<ActionResult> {
  const parsed = speciesPrefSchema.safeParse(value);
  if (!parsed.success) return { ok: false, error: "Invalid choice" };
  const store = await cookies();
  store.set(SPECIES_COOKIE, parsed.data, { path: "/", maxAge: 31536000, sameSite: "lax" });
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    await supabase.from("profiles").update({ species_pref: parsed.data }).eq("id", data.user.id);
  }
  return { ok: true };
}

export async function checkUsername(raw: string): Promise<{ available: boolean; message: string }> {
  const parsed = usernameSchema.safeParse(raw);
  if (!parsed.success) return { available: false, message: parsed.error.issues[0]?.message ?? "Invalid username" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("username_available", { p_username: parsed.data });
  if (error) return { available: false, message: "Couldn't check right now" };
  return data ? { available: true, message: `@${parsed.data} is available` } : { available: false, message: `@${parsed.data} is taken` };
}

export async function completeOnboarding(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await actionContext({ allowUnonboarded: true });
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const { supabase, userId } = ctx;

  const parsed = onboardingSchema.safeParse({
    username: formData.get("username"),
    display_name: formData.get("display_name"),
    area: formData.get("area"),
    bio: formData.get("bio") ?? undefined,
    avatar_url: formData.get("avatar_url") ?? undefined,
    species_pref: formData.get("species_pref") || "both",
  });
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: zodFieldErrors(parsed.error) };
  const v = parsed.data;
  if (v.avatar_url && !isOwnUpload(v.avatar_url, "avatars", userId)) {
    return { ok: false, error: "Please upload your photo again.", fieldErrors: { avatar_url: "Upload failed" } };
  }
  if (v.bio) {
    const mod = await moderateText(v.bio, "profile", { supabase: ctx.supabase });
    if (mod.verdict === "block") return { ok: false, error: blockedMessage(mod), fieldErrors: { bio: blockedMessage(mod) } };
  }

  const { data: free } = await supabase.rpc("username_available", { p_username: v.username });
  if (!free) return { ok: false, error: "That username is taken.", fieldErrors: { username: "That username is taken" } };

  const { error } = await supabase
    .from("profiles")
    .update({
      username: v.username, display_name: v.display_name, area: v.area, bio: v.bio,
      avatar_url: v.avatar_url, species_pref: v.species_pref, onboarded: true, city: "Delhi NCR",
    })
    .eq("id", userId);
  if (error) return { ok: false, error: friendlyError(error, "Couldn't save your profile.") };
  await supabase.from("profile_private").update({ home_area: v.area }).eq("id", userId);

  // Optional quick add-pet step
  if (formData.get("add_pet") === "yes") {
    const pet = petSchema.safeParse({
      name: formData.get("pet_name"),
      species: formData.get("pet_species"),
      breed: formData.get("pet_breed") ?? undefined,
      gender: formData.get("pet_gender") || "unknown",
      birthday: formData.get("pet_birthday") ?? "",
      photo_urls: [],
    });
    if (!pet.success) {
      return { ok: false, error: "Check your pet's details.", fieldErrors: Object.fromEntries(Object.entries(zodFieldErrors(pet.error)).map(([k, m]) => [`pet_${k}`, m])) };
    }
    const { error: petErr } = await supabase.from("pets").insert({ ...pet.data, owner_id: userId });
    if (petErr) return { ok: false, error: friendlyError(petErr, "Profile saved, but we couldn't add your pet.") };
  }

  const store = await cookies();
  store.set(SPECIES_COOKIE, v.species_pref, { path: "/", maxAge: 31536000, sameSite: "lax" });
  revalidatePath("/", "layout");
  redirect("/home?welcome=1");
}

export async function updateProfile(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const { supabase, userId, profile } = ctx;
  const parsed = profileSettingsSchema.safeParse({
    display_name: formData.get("display_name"),
    username: formData.get("username"),
    area: formData.get("area"),
    bio: formData.get("bio") ?? undefined,
    avatar_url: formData.get("avatar_url") ?? undefined,
    hide_area: formData.get("hide_area") ?? undefined,
    whatsapp: formData.get("whatsapp") ?? "",
  });
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: zodFieldErrors(parsed.error) };
  const v = parsed.data;
  if (v.avatar_url && v.avatar_url !== profile.avatar_url && !isOwnUpload(v.avatar_url, "avatars", userId)) {
    return { ok: false, error: "Please upload your photo again.", fieldErrors: { avatar_url: "Upload failed" } };
  }
  if (v.username.toLowerCase() !== (profile.username ?? "").toLowerCase()) {
    const { data: free } = await supabase.rpc("username_available", { p_username: v.username });
    if (!free) return { ok: false, error: "That username is taken.", fieldErrors: { username: "That username is taken" } };
  }
  if (v.display_name) {
    const modName = await moderateText(v.display_name, "profile", { supabase: ctx.supabase });
    if (modName.verdict === "block") {
      return { ok: false, error: blockedMessage(modName), fieldErrors: { display_name: blockedMessage(modName) } };
    }
  }
  if (v.bio) {
    const mod = await moderateText(v.bio, "profile", { supabase: ctx.supabase });
    if (mod.verdict === "block") return { ok: false, error: blockedMessage(mod), fieldErrors: { bio: blockedMessage(mod) } };
  }
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: v.display_name, username: v.username, bio: v.bio, avatar_url: v.avatar_url,
      hide_area: v.hide_area, area: v.hide_area ? null : v.area,
    })
    .eq("id", userId);
  if (error) return { ok: false, error: friendlyError(error, "Couldn't save changes.") };
  const { error: privErr } = await supabase.from("profile_private").update({ home_area: v.area, whatsapp: v.whatsapp }).eq("id", userId);
  if (privErr) return { ok: false, error: friendlyError(privErr, "Couldn't save your area.") };
  revalidatePath("/", "layout");
  if (profile.username) revalidatePath(`/u/${profile.username}`);
  if (v.username !== profile.username) revalidatePath(`/u/${v.username}`);
  return { ok: true, message: "Profile saved" };
}

export async function updateNotificationPrefs(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const parsed = notificationPrefsSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: "Invalid preferences" };
  const { error } = await ctx.supabase.from("profile_private").update(parsed.data).eq("id", ctx.userId);
  if (error) return { ok: false, error: friendlyError(error) };
  return { ok: true, message: "Notification settings saved" };
}

export async function toggleFollow(targetId: string, follow: boolean): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const id = uuidSchema.safeParse(targetId);
  if (!id.success || id.data === ctx.userId) return { ok: false, error: "Invalid user" };
  const { error } = follow
    ? await ctx.supabase.from("follows").insert({ follower_id: ctx.userId, following_id: id.data })
    : await ctx.supabase.from("follows").delete().eq("follower_id", ctx.userId).eq("following_id", id.data);
  if (error && error.code !== "23505") return { ok: false, error: friendlyError(error) };
  revalidatePath("/u/[username]", "page");
  return { ok: true };
}

export async function toggleBlock(targetId: string, block: boolean): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const id = uuidSchema.safeParse(targetId);
  if (!id.success || id.data === ctx.userId) return { ok: false, error: "Invalid user" };
  const { error } = block
    ? await ctx.supabase.from("blocks").insert({ blocker_id: ctx.userId, blocked_id: id.data })
    : await ctx.supabase.from("blocks").delete().eq("blocker_id", ctx.userId).eq("blocked_id", id.data);
  if (error && error.code !== "23505") return { ok: false, error: friendlyError(error) };
  revalidatePath("/", "layout");
  return { ok: true, message: block ? "User blocked. You won't see their content." : "User unblocked." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

const BUCKETS = ["avatars", "pets", "posts", "lost-found", "adoptions", "matchmaking", "documents"] as const;

/** Deletes every file in the user's folders, then the auth user (rows cascade via foreign keys). */
export async function deleteAccount(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, error: "Please sign in first." };
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") {
    return { ok: false, error: "Type DELETE to confirm.", fieldErrors: { confirm: "Type DELETE to confirm" } };
  }
  const userId = data.user.id;
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, error: "Account deletion is not configured on this server (missing service role key)." };
  }

  for (const bucket of BUCKETS) {
    // Paginate through the user's folder and remove everything.
    for (let round = 0; round < 50; round++) {
      const { data: files, error } = await admin.storage.from(bucket).list(userId, { limit: 100 });
      if (error || !files?.length) break;
      const paths = files.map((f) => `${userId}/${f.name}`);
      const { error: rmErr } = await admin.storage.from(bucket).remove(paths);
      if (rmErr) break;
      if (files.length < 100) break;
    }
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: "We couldn't delete your account. Please contact support." };
  await supabase.auth.signOut();
  const store = await cookies();
  store.delete(SPECIES_COOKIE);
  redirect("/?deleted=1");
}
