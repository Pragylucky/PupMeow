"use server";

import { actionContext } from "@/lib/auth";
import { reportSchema, } from "@/lib/validations/listings";
import { zodFieldErrors } from "@/lib/validations/common";
import { friendlyError } from "@/lib/utils";
import type { ActionResult } from "@/types/models";

export async function submitReport(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const parsed = reportSchema.safeParse({
    target_type: formData.get("target_type"),
    target_id: formData.get("target_id"),
    reason: formData.get("reason"),
    details: formData.get("details") ?? undefined,
  });
  if (!parsed.success) return { ok: false, error: "Pick a reason for the report.", fieldErrors: zodFieldErrors(parsed.error) };
  const { error } = await ctx.supabase.from("reports").insert({ ...parsed.data, reporter_id: ctx.userId });
  if (error) {
    if (error.code === "23505") return { ok: true, message: "You've already reported this. Our team is on it." };
    return { ok: false, error: friendlyError(error, "Couldn't send the report.") };
  }
  return { ok: true, message: "Thanks — our moderators will review it." };
}
