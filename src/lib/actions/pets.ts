"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionContext } from "@/lib/auth";
import { petSchema, healthRecordSchema } from "@/lib/validations/pet";
import { uuidSchema, zodFieldErrors } from "@/lib/validations/common";
import { allOwnUploads, isOwnDocumentPath } from "@/lib/storage-paths";
import { friendlyError, todayIso } from "@/lib/utils";
import { moderateText, blockedMessage } from "@/lib/ai/moderation";
import type { ActionResult } from "@/types/models";

function petInput(formData: FormData) {
  return {
    name: formData.get("name"),
    species: formData.get("species"),
    breed: formData.get("breed") ?? undefined,
    gender: formData.get("gender") || "unknown",
    birthday: formData.get("birthday") ?? "",
    weight_kg: formData.get("weight_kg") ?? "",
    photo_urls: formData.getAll("photo_urls").map(String),
    bio: formData.get("bio") ?? undefined,
    is_neutered: formData.get("is_neutered") ?? undefined,
  };
}

export async function savePet(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const { supabase, userId } = ctx;
  const id = formData.get("id") ? uuidSchema.safeParse(formData.get("id")) : null;
  if (id && !id.success) return { ok: false, error: "Invalid pet" };

  const parsed = petSchema.safeParse(petInput(formData));
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: zodFieldErrors(parsed.error) };
  const v = parsed.data;
  if (!allOwnUploads(v.photo_urls, "pets", userId)) return { ok: false, error: "Please re-upload the photos." };
  if (v.bio) {
    const mod = await moderateText(v.bio, "profile");
    if (mod.verdict === "block") return { ok: false, error: blockedMessage(mod), fieldErrors: { bio: blockedMessage(mod) } };
  }
  const row = { ...v, photo_url: v.photo_urls[0] ?? null };

  if (id?.success) {
    const { error } = await supabase.from("pets").update(row).eq("id", id.data).eq("owner_id", userId);
    if (error) return { ok: false, error: friendlyError(error, "Couldn't save your pet.") };
    revalidatePath(`/pet/${id.data}`);
    revalidatePath("/pets");
    redirect(`/pet/${id.data}?saved=1`);
  }
  const { data, error } = await supabase.from("pets").insert({ ...row, owner_id: userId }).select("id").single();
  if (error || !data) return { ok: false, error: friendlyError(error, "Couldn't add your pet.") };
  revalidatePath("/pets");
  redirect(`/pet/${data.id}?new=1`);
}

export async function deletePet(petId: string): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const id = uuidSchema.safeParse(petId);
  if (!id.success) return { ok: false, error: "Invalid pet" };
  const { error, count } = await ctx.supabase.from("pets").delete({ count: "exact" }).eq("id", id.data).eq("owner_id", ctx.userId);
  if (error) return { ok: false, error: friendlyError(error) };
  if (!count) return { ok: false, error: "Pet not found." };
  revalidatePath("/pets");
  return { ok: true, message: "Pet removed" };
}

export async function addHealthRecord(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const parsed = healthRecordSchema.safeParse({
    pet_id: formData.get("pet_id"),
    type: formData.get("type"),
    title: formData.get("title"),
    date: formData.get("date"),
    next_due_date: formData.get("next_due_date") ?? "",
    weight_kg: formData.get("weight_kg") ?? "",
    notes: formData.get("notes") ?? undefined,
    document_url: formData.get("document_url") ?? undefined,
  });
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: zodFieldErrors(parsed.error) };
  const v = parsed.data;
  if (v.document_url && !isOwnDocumentPath(v.document_url, ctx.userId)) return { ok: false, error: "Please re-upload the document." };
  const { error } = await ctx.supabase.from("pet_health_records").insert({ ...v, owner_id: ctx.userId });
  if (error) return { ok: false, error: friendlyError(error, "Couldn't save the record.") };
  revalidatePath(`/pets/${v.pet_id}/health`);
  revalidatePath("/pets");
  return { ok: true, message: "Record added" };
}

export async function deleteHealthRecord(recordId: string): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const id = uuidSchema.safeParse(recordId);
  if (!id.success) return { ok: false, error: "Invalid record" };
  const { data: rec } = await ctx.supabase.from("pet_health_records").select("pet_id, document_url").eq("id", id.data).eq("owner_id", ctx.userId).maybeSingle();
  if (!rec) return { ok: false, error: "Record not found." };
  const { error } = await ctx.supabase.from("pet_health_records").delete().eq("id", id.data).eq("owner_id", ctx.userId);
  if (error) return { ok: false, error: friendlyError(error) };
  if (rec.document_url) await ctx.supabase.storage.from("documents").remove([rec.document_url]);
  revalidatePath(`/pets/${rec.pet_id}/health`);
  return { ok: true, message: "Record deleted" };
}

/** Short-lived signed URL for a private document the caller owns. */
export async function getDocumentUrl(path: string): Promise<ActionResult<string>> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  if (!isOwnDocumentPath(path, ctx.userId)) return { ok: false, error: "Not allowed" };
  const { data, error } = await ctx.supabase.storage.from("documents").createSignedUrl(path, 60 * 5);
  if (error || !data) return { ok: false, error: "Couldn't open the document." };
  return { ok: true, data: data.signedUrl };
}

/** Add AI-suggested vaccinations as reminders (records with a next-due date). */
export async function addVaccineReminders(petId: string, items: { title: string; due_date: string }[]): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const id = uuidSchema.safeParse(petId);
  if (!id.success || !Array.isArray(items) || !items.length || items.length > 8) return { ok: false, error: "Nothing to add" };
  const today = todayIso();
  const rows = items
    .filter((i) => typeof i.title === "string" && /^\d{4}-\d{2}-\d{2}$/.test(i.due_date))
    .map((i) => ({
      pet_id: id.data,
      owner_id: ctx.userId,
      type: "vaccination" as const,
      title: `Reminder: ${i.title}`.slice(0, 80),
      date: today,
      next_due_date: i.due_date < today ? today : i.due_date,
      notes: "Suggested by Kaia (AI). Confirm with your vet.",
    }));
  const { error } = await ctx.supabase.from("pet_health_records").insert(rows);
  if (error) return { ok: false, error: friendlyError(error, "Couldn't add reminders.") };
  revalidatePath(`/pets/${id.data}/health`);
  revalidatePath("/pets");
  return { ok: true, message: `${rows.length} reminder${rows.length === 1 ? "" : "s"} added` };
}

/** Rough repeat interval for common records, used when a due item is marked as done. */
function repeatMonthsFor(title: string, type: string): number | null {
  const t = title.toLowerCase();
  if (type === "weight" || type === "vet_visit") return null;
  if (/tick|flea/.test(t)) return 1;
  if (/deworm/.test(t)) return 3;
  if (/rabies|dhpp|lepto|fvrcp|annual|booster|vaccin/.test(t) || type === "vaccination") return 12;
  return null;
}

/** "Mark as given": logs today's dose and schedules the next one (when it usually repeats). */
export async function markHealthDone(recordId: string): Promise<ActionResult<{ nextDue: string | null }>> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const id = uuidSchema.safeParse(recordId);
  if (!id.success) return { ok: false, error: "Invalid record" };
  const { data: rec } = await ctx.supabase
    .from("pet_health_records")
    .select("id, pet_id, type, title, next_due_date")
    .eq("id", id.data)
    .eq("owner_id", ctx.userId)
    .maybeSingle();
  if (!rec) return { ok: false, error: "Record not found." };
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const months = repeatMonthsFor(rec.title, rec.type);
  let nextDue: string | null = null;
  if (months) {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + months);
    nextDue = d.toISOString().slice(0, 10);
  }
  const title = rec.title.replace(/^Reminder:\s*/i, "");
  const { error: insErr } = await ctx.supabase.from("pet_health_records").insert({
    pet_id: rec.pet_id, owner_id: ctx.userId, type: rec.type, title, date: today, next_due_date: nextDue,
    notes: "Marked as given on Pupmeow.",
  });
  if (insErr) return { ok: false, error: friendlyError(insErr, "Couldn't save that.") };
  await ctx.supabase.from("pet_health_records").update({ next_due_date: null }).eq("id", rec.id).eq("owner_id", ctx.userId);
  revalidatePath(`/pets/${rec.pet_id}/health`);
  revalidatePath("/pets");
  revalidatePath("/home");
  return {
    ok: true,
    data: { nextDue },
    message: nextDue
      ? `Marked as given. Next one is due ${new Date(`${nextDue}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.`
      : "Marked as given.",
  };
}
