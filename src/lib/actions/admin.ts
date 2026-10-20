"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionContext } from "@/lib/auth";
import { friendlyError } from "@/lib/utils";
import type { ActionResult } from "@/types/models";

const targetSchema = z.enum(["post", "comment", "profile", "lost_found", "adoption", "match_profile"]);

async function adminCtx() {
  const ctx = await actionContext();
  if ("error" in ctx) return ctx;
  if (ctx.profile.role !== "admin") return { error: "Admins only." };
  return ctx;
}

export async function adminSetHidden(targetType: string, targetId: string, hidden: boolean): Promise<ActionResult> {
  const ctx = await adminCtx();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const t = targetSchema.safeParse(targetType);
  const id = z.uuid().safeParse(targetId);
  if (!t.success || !id.success) return { ok: false, error: "Invalid target" };
  const { error } = await ctx.supabase.rpc("admin_set_hidden", { p_target_type: t.data, p_target_id: id.data, p_hidden: hidden });
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/admin");
  return { ok: true, message: hidden ? "Content hidden" : "Content restored" };
}

export async function adminSetBan(userId: string, banned: boolean): Promise<ActionResult> {
  const ctx = await adminCtx();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const id = z.uuid().safeParse(userId);
  if (!id.success) return { ok: false, error: "Invalid user" };
  const { error } = await ctx.supabase.rpc("admin_set_ban", { p_user_id: id.data, p_banned: banned });
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/admin");
  return { ok: true, message: banned ? "User banned" : "User unbanned" };
}

export async function adminResolveReport(reportId: string, status: "open" | "resolved" | "dismissed"): Promise<ActionResult> {
  const ctx = await adminCtx();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const id = z.uuid().safeParse(reportId);
  if (!id.success || !["open", "resolved", "dismissed"].includes(status)) return { ok: false, error: "Invalid report" };
  const { error } = await ctx.supabase.rpc("admin_resolve_report", { p_report_id: id.data, p_status: status });
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/admin");
  return { ok: true, message: status === "dismissed" ? "Report dismissed" : status === "resolved" ? "Report resolved" : "Report reopened" };
}
