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
  revalidatePath("/feed");
  revalidatePath("/lost");
  revalidatePath("/adopt");
  revalidatePath("/match");
  if (t.data === "post") revalidatePath(`/post/${id.data}`);
  if (t.data === "lost_found") revalidatePath(`/lost/${id.data}`);
  if (t.data === "adoption") revalidatePath(`/adopt/${id.data}`);
  return { ok: true, message: hidden ? "Hidden for review (off the app)" : "Content restored" };
}

export async function adminDeleteTarget(targetType: string, targetId: string, reason: string): Promise<ActionResult> {
  const ctx = await adminCtx();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const t = targetSchema.safeParse(targetType);
  const id = z.uuid().safeParse(targetId);
  const r = (reason ?? "").trim();
  if (!t.success || !id.success) return { ok: false, error: "Invalid target" };
  if (t.data === "profile") return { ok: false, error: "Use ban for user profiles." };
  if (r.length < 3) return { ok: false, error: "Please add a short reason for removal (audit log)." };
  const { error } = await ctx.supabase.rpc("admin_delete_target", {
    p_target_type: t.data,
    p_target_id: id.data,
    p_reason: r,
  });
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/admin");
  revalidatePath("/feed");
  revalidatePath("/lost");
  revalidatePath("/adopt");
  revalidatePath("/match");
  if (t.data === "post") revalidatePath(`/post/${id.data}`);
  if (t.data === "lost_found") revalidatePath(`/lost/${id.data}`);
  if (t.data === "adoption") revalidatePath(`/adopt/${id.data}`);
  return { ok: true, message: "Content removed permanently" };
}

export async function adminSetBan(userId: string, banned: boolean, reason?: string): Promise<ActionResult> {
  const ctx = await adminCtx();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const id = z.uuid().safeParse(userId);
  if (!id.success) return { ok: false, error: "Invalid user" };
  if (banned) {
    const r = (reason ?? "").trim();
    if (r.length < 3) return { ok: false, error: "Please add a short reason for the ban (for the audit log)." };
  }
  const { error } = await ctx.supabase.rpc("admin_set_ban", {
    p_user_id: id.data,
    p_banned: banned,
    p_reason: banned ? reason?.trim() : null,
  });
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
