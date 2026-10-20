"use server";

import { revalidatePath } from "next/cache";
import { actionContext } from "@/lib/auth";
import { adoptionSchema } from "@/lib/validations/listings";
import { uuidSchema, zodFieldErrors } from "@/lib/validations/common";
import { allOwnUploads } from "@/lib/storage-paths";
import { friendlyError } from "@/lib/utils";
import { moderateText, blockedMessage, flagForReview } from "@/lib/ai/moderation";
import type { ActionResult } from "@/types/models";

export async function createAdoption(_prev: ActionResult<string> | null, formData: FormData): Promise<ActionResult<string>> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const parsed = adoptionSchema.safeParse({
    pet_name: formData.get("pet_name"),
    species: formData.get("species"),
    breed: formData.get("breed") ?? undefined,
    age_text: formData.get("age_text"),
    age_months: formData.get("age_months") ?? "",
    gender: formData.get("gender") || "unknown",
    vaccinated: formData.get("vaccinated") ?? undefined,
    neutered: formData.get("neutered") ?? undefined,
    description: formData.get("description"),
    photo_urls: formData.getAll("photo_urls").map(String),
    area: formData.get("area"),
    is_ngo: formData.get("is_ngo") ?? undefined,
    org_name: formData.get("org_name") ?? undefined,
    contact_method: formData.get("contact_method") || "whatsapp",
    contact_value: formData.get("contact_value"),
    no_sale_ack: formData.get("no_sale_ack") ?? undefined,
  });
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: zodFieldErrors(parsed.error) };
  const { no_sale_ack: _ack, ...v } = parsed.data;
  if (!allOwnUploads(v.photo_urls, "adoptions", ctx.userId)) return { ok: false, error: "Please re-upload the photos." };
  const mod = await moderateText(`${v.pet_name}\n${v.description}`, "listing");
  if (mod.verdict === "block") return { ok: false, error: blockedMessage(mod), fieldErrors: { description: blockedMessage(mod) } };
  const { data, error } = await ctx.supabase.from("adoptions").insert({ ...v, author_id: ctx.userId, city: "Delhi NCR", org_name: v.is_ngo ? v.org_name : null }).select("id").single();
  if (error || !data) return { ok: false, error: friendlyError(error, "Couldn't publish the listing.") };
  if (mod.verdict === "flag") await flagForReview("adoption", data.id, mod);
  revalidatePath("/adopt");
  return { ok: true, data: data.id };
}

export async function setAdoptionStatus(id: string, status: "available" | "adopted"): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const pid = uuidSchema.safeParse(id);
  if (!pid.success || !["available", "adopted"].includes(status)) return { ok: false, error: "Invalid request" };
  const { error, count } = await ctx.supabase.from("adoptions").update({ status }, { count: "exact" }).eq("id", pid.data).eq("author_id", ctx.userId);
  if (error) return { ok: false, error: friendlyError(error) };
  if (!count) return { ok: false, error: "Only the lister can change this." };
  revalidatePath(`/adopt/${pid.data}`);
  revalidatePath("/adopt");
  return { ok: true, message: status === "adopted" ? "Marked as adopted 💛" : "Listing reopened" };
}

export async function deleteAdoption(id: string): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const pid = uuidSchema.safeParse(id);
  if (!pid.success) return { ok: false, error: "Invalid request" };
  const { error, count } = await ctx.supabase.from("adoptions").delete({ count: "exact" }).eq("id", pid.data).eq("author_id", ctx.userId);
  if (error) return { ok: false, error: friendlyError(error) };
  if (!count) return { ok: false, error: "Not found." };
  revalidatePath("/adopt");
  return { ok: true, message: "Listing deleted" };
}
