"use server";

import { revalidatePath } from "next/cache";
import { actionContext } from "@/lib/auth";
import { lostFoundSchema } from "@/lib/validations/listings";
import { uuidSchema, zodFieldErrors } from "@/lib/validations/common";
import { isOwnUpload } from "@/lib/storage-paths";
import { friendlyError } from "@/lib/utils";
import { moderateText, blockedMessage, flagForReview } from "@/lib/ai/moderation";
import { buildLostFoundEmbedding, toPgVector } from "@/lib/ai/embeddings";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import type { ActionResult } from "@/types/models";
import type { ContactMethod } from "@/types/database";

export interface PossibleMatch {
  id: string; pet_name: string | null; species: string; breed: string | null; color: string | null;
  photo_urls: string[]; last_seen_area: string; last_seen_date: string; author_id: string; similarity: number;
}

const MATCH_NOTIFY_THRESHOLD = 0.78;

export async function createLostFound(_prev: ActionResult<string> | null, formData: FormData): Promise<ActionResult<string>> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const { supabase, userId } = ctx;
  const parsed = lostFoundSchema.safeParse({
    type: formData.get("type"),
    pet_name: formData.get("pet_name") ?? undefined,
    species: formData.get("species"),
    breed: formData.get("breed") ?? undefined,
    color: formData.get("color") ?? undefined,
    gender: formData.get("gender") || "unknown",
    description: formData.get("description"),
    photo_urls: formData.getAll("photo_urls").map(String),
    last_seen_area: formData.get("last_seen_area"),
    landmark: formData.get("landmark") ?? undefined,
    last_seen_date: formData.get("last_seen_date"),
    reward_text: formData.get("reward_text") ?? undefined,
    contact_method: formData.get("contact_method") || "whatsapp",
    contact_value: formData.get("contact_value"),
  });
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: zodFieldErrors(parsed.error) };
  const v = parsed.data;
  // Photos can be new uploads or the pet's existing profile photos (both must be in the user's own folder).
  if (!v.photo_urls.every((u) => isOwnUpload(u, "lost-found", userId) || isOwnUpload(u, "pets", userId))) return { ok: false, error: "Please re-upload the photos." };

  // Rewards are fine on lost posts; only check the description for abuse/spam.
  const mod = await moderateText(v.description, "post");
  if (mod.verdict === "block" && !mod.categories.every((c) => c === "animal_sale")) {
    return { ok: false, error: blockedMessage(mod), fieldErrors: { description: blockedMessage(mod) } };
  }

  const lastSeenIso = new Date(v.last_seen_date).toISOString();
  const { data, error } = await supabase
    .from("lost_found")
    .insert({ ...v, last_seen_date: lastSeenIso, author_id: userId, city: "Delhi NCR" })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: friendlyError(error, "Couldn't publish your report.") };
  if (mod.verdict === "flag") await flagForReview("lost_found", data.id, mod);

  // AI smart matching: embed this post, then notify owners of similar open LOST posts.
  if (hasServiceRole()) {
    try {
      const emb = await buildLostFoundEmbedding({ species: v.species, breed: v.breed, color: v.color, gender: v.gender, description: v.description, photoUrl: v.photo_urls[0] });
      if (emb) {
        const admin = createAdminClient();
        await admin.from("lost_found").update({ image_embedding: toPgVector(emb.embedding), ai_description: emb.aiDescription }).eq("id", data.id);
        if (v.type === "found") {
          const { data: matches } = await supabase.rpc("match_lost_found", { p_found_id: data.id, p_limit: 6 });
          const strong = ((matches ?? []) as PossibleMatch[]).filter((m) => m.similarity >= MATCH_NOTIFY_THRESHOLD && m.author_id !== userId);
          if (strong.length) {
            await admin.from("notifications").insert(strong.map((m) => ({
              user_id: m.author_id, type: "lost_match", actor_id: userId, entity_type: "lost_found", entity_id: data.id,
              message: `A ${v.species} was found in ${v.last_seen_area} that looks like ${m.pet_name ?? "your pet"}. Take a look.`,
            })));
          }
        }
      }
    } catch (err) {
      console.error("[lost] smart matching failed", err);
    }
  }

  revalidatePath("/lost");
  return { ok: true, data: data.id };
}

export async function getPossibleMatches(id: string): Promise<ActionResult<PossibleMatch[]>> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const pid = uuidSchema.safeParse(id);
  if (!pid.success) return { ok: false, error: "Invalid id" };
  const { data, error } = await ctx.supabase.rpc("match_lost_found", { p_found_id: pid.data, p_limit: 6 });
  if (error) return { ok: false, error: friendlyError(error) };
  return { ok: true, data: ((data ?? []) as PossibleMatch[]).filter((m) => m.similarity >= 0.6) };
}

export async function setLostFoundStatus(id: string, status: "open" | "reunited"): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const pid = uuidSchema.safeParse(id);
  if (!pid.success || !["open", "reunited"].includes(status)) return { ok: false, error: "Invalid request" };
  const { error, count } = await ctx.supabase.from("lost_found").update({ status }, { count: "exact" }).eq("id", pid.data).eq("author_id", ctx.userId);
  if (error) return { ok: false, error: friendlyError(error) };
  if (!count) return { ok: false, error: "Only the person who posted can change this." };
  revalidatePath(`/lost/${pid.data}`);
  revalidatePath("/lost");
  return { ok: true, message: status === "reunited" ? "Marked as reunited 🎉" : "Reopened" };
}

export async function deleteLostFound(id: string): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const pid = uuidSchema.safeParse(id);
  if (!pid.success) return { ok: false, error: "Invalid request" };
  const { error, count } = await ctx.supabase.from("lost_found").delete({ count: "exact" }).eq("id", pid.data).eq("author_id", ctx.userId);
  if (error) return { ok: false, error: friendlyError(error) };
  if (!count) return { ok: false, error: "Not found." };
  revalidatePath("/lost");
  return { ok: true, message: "Report deleted" };
}

export async function getContact(kind: "lost_found" | "adoption", id: string): Promise<ActionResult<{ method: ContactMethod; value: string }>> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const pid = uuidSchema.safeParse(id);
  if (!pid.success) return { ok: false, error: "Invalid id" };
  const fn = kind === "lost_found" ? "get_lost_found_contact" : "get_adoption_contact";
  const { data, error } = await ctx.supabase.rpc(fn, { p_id: pid.data });
  if (error) return { ok: false, error: friendlyError(error, "Couldn't load contact details.") };
  const row = (data as { contact_method: ContactMethod; contact_value: string }[] | null)?.[0];
  if (!row) return { ok: false, error: "Contact details aren't available." };
  return { ok: true, data: { method: row.contact_method, value: row.contact_value } };
}
