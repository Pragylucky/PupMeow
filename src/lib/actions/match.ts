"use server";

import { revalidatePath } from "next/cache";
import { actionContext } from "@/lib/auth";
import { matchProfileSchema, matchRequestSchema } from "@/lib/validations/listings";
import { uuidSchema, zodFieldErrors } from "@/lib/validations/common";
import { allOwnUploads, isOwnDocumentPath } from "@/lib/storage-paths";
import { friendlyError } from "@/lib/utils";
import { moderateText, blockedMessage, flagForReview } from "@/lib/ai/moderation";
import type { ActionResult } from "@/types/models";

export async function saveMatchProfile(_prev: ActionResult<string> | null, formData: FormData): Promise<ActionResult<string>> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const parsed = matchProfileSchema.safeParse({
    pet_id: formData.get("pet_id"),
    looking_for: formData.get("looking_for"),
    has_papers: formData.get("has_papers") ?? undefined,
    health_confirmed: formData.get("health_confirmed") ?? undefined,
    about: formData.get("about"),
    photo_urls: formData.getAll("photo_urls").map(String),
    area: formData.get("area"),
    health_doc_path: formData.get("health_doc_path") ?? undefined,
  });
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: zodFieldErrors(parsed.error) };
  const v = parsed.data;
  if (!allOwnUploads(v.photo_urls, "matchmaking", ctx.userId)) return { ok: false, error: "Please re-upload the photos." };
  if (v.health_doc_path && !isOwnDocumentPath(v.health_doc_path, ctx.userId)) return { ok: false, error: "Please re-upload the certificate." };
  const mod = await moderateText(v.about, "listing");
  if (mod.verdict === "block") return { ok: false, error: blockedMessage(mod), fieldErrors: { about: blockedMessage(mod) } };

  const { data: existing } = await ctx.supabase.from("pet_match_profiles").select("id").eq("pet_id", v.pet_id).eq("owner_id", ctx.userId).maybeSingle();
  const res = existing
    ? await ctx.supabase.from("pet_match_profiles").update({ ...v, is_active: true }).eq("id", existing.id).eq("owner_id", ctx.userId).select("id").single()
    : await ctx.supabase.from("pet_match_profiles").insert({ ...v, owner_id: ctx.userId }).select("id").single();
  if (res.error || !res.data) return { ok: false, error: friendlyError(res.error, "Couldn't save the match profile.") };
  if (mod.verdict === "flag") await flagForReview("match_profile", res.data.id, mod);
  revalidatePath("/match");
  return { ok: true, data: res.data.id };
}

export async function setMatchActive(id: string, active: boolean): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const pid = uuidSchema.safeParse(id);
  if (!pid.success) return { ok: false, error: "Invalid id" };
  const { error, count } = await ctx.supabase.from("pet_match_profiles").update({ is_active: active }, { count: "exact" }).eq("id", pid.data).eq("owner_id", ctx.userId);
  if (error) return { ok: false, error: friendlyError(error) };
  if (!count) return { ok: false, error: "Not found." };
  revalidatePath(`/match/${pid.data}`);
  revalidatePath("/match");
  return { ok: true, message: active ? "Match profile is live again" : "Match profile paused" };
}

export async function deleteMatchProfile(id: string): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const pid = uuidSchema.safeParse(id);
  if (!pid.success) return { ok: false, error: "Invalid id" };
  const { data: row } = await ctx.supabase.from("pet_match_profiles").select("health_doc_path").eq("id", pid.data).eq("owner_id", ctx.userId).maybeSingle();
  if (!row) return { ok: false, error: "Not found." };
  const { error } = await ctx.supabase.from("pet_match_profiles").delete().eq("id", pid.data).eq("owner_id", ctx.userId);
  if (error) return { ok: false, error: friendlyError(error) };
  if (row.health_doc_path) await ctx.supabase.storage.from("documents").remove([row.health_doc_path]);
  revalidatePath("/match");
  return { ok: true, message: "Match profile removed" };
}

export async function sendMatchRequest(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const parsed = matchRequestSchema.safeParse({
    from_pet_id: formData.get("from_pet_id"),
    to_pet_id: formData.get("to_pet_id"),
    purpose: formData.get("purpose"),
    message: formData.get("message") ?? undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form", fieldErrors: zodFieldErrors(parsed.error) };
  if (parsed.data.message) {
    const mod = await moderateText(parsed.data.message, "comment");
    if (mod.verdict === "block") return { ok: false, error: blockedMessage(mod) };
  }
  // to_owner_id is overwritten by a trigger from the target pet; the placeholder satisfies NOT NULL.
  const { error } = await ctx.supabase.from("match_requests").insert({ ...parsed.data, from_owner_id: ctx.userId, to_owner_id: ctx.userId });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "You've already sent a request between these two pets." };
    return { ok: false, error: friendlyError(error, "Couldn't send the request.") };
  }
  revalidatePath("/match/requests");
  return { ok: true, message: "Request sent! You'll be notified when they reply." };
}

export async function respondMatchRequest(id: string, accept: boolean): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const pid = uuidSchema.safeParse(id);
  if (!pid.success) return { ok: false, error: "Invalid request" };
  const { error, count } = await ctx.supabase.from("match_requests").update({ status: accept ? "accepted" : "declined" }, { count: "exact" }).eq("id", pid.data).eq("to_owner_id", ctx.userId).eq("status", "pending");
  if (error) return { ok: false, error: friendlyError(error) };
  if (!count) return { ok: false, error: "This request was already answered." };
  revalidatePath("/match/requests");
  return { ok: true, message: accept ? "Accepted! Contact details are now shared." : "Request declined" };
}

export async function cancelMatchRequest(id: string): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const pid = uuidSchema.safeParse(id);
  if (!pid.success) return { ok: false, error: "Invalid request" };
  const { error, count } = await ctx.supabase.from("match_requests").delete({ count: "exact" }).eq("id", pid.data).eq("from_owner_id", ctx.userId).eq("status", "pending");
  if (error) return { ok: false, error: friendlyError(error) };
  if (!count) return { ok: false, error: "Only pending requests can be cancelled." };
  revalidatePath("/match/requests");
  return { ok: true, message: "Request cancelled" };
}

export async function getMatchContact(id: string): Promise<ActionResult<{ username: string | null; display_name: string | null; whatsapp: string | null }>> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const pid = uuidSchema.safeParse(id);
  if (!pid.success) return { ok: false, error: "Invalid request" };
  const { data, error } = await ctx.supabase.rpc("get_match_contact", { p_request_id: pid.data });
  if (error) return { ok: false, error: friendlyError(error) };
  const row = (data as { username: string | null; display_name: string | null; whatsapp: string | null }[] | null)?.[0];
  if (!row) return { ok: false, error: "Contact not available." };
  return { ok: true, data: row };
}
