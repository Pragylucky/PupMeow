"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionContext } from "@/lib/auth";
import { friendlyError } from "@/lib/utils";
import type { ActionResult } from "@/types/models";

const targetSchema = z.enum(["post", "comment", "profile", "lost_found", "adoption", "match_profile"]);

function adminRpcError(error: { message?: string; code?: string }, hint?: string): string {
  const msg = error.message ?? "";
  if (msg.includes("Could not find the function") || msg.includes("admin_set_hidden") || msg.includes("admin_delete_target")) {
    return hint ?? "Database moderation functions are missing. Run the latest Supabase migrations (admin_delete_content).";
  }
  if (msg.includes("Admins only")) return "Your account is not recognised as admin in the database. Sign out and back in, or check your role in Supabase.";
  const friendly = friendlyError(error);
  if (friendly === "Something went wrong. Please try again." && msg.length > 0 && msg.length < 220) return msg;
  return friendly;
}

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
  if (error) {
    console.error("[admin] admin_set_hidden", error);
    return { ok: false, error: adminRpcError(error) };
  }
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
  if (error) {
    console.error("[admin] admin_delete_target", error);
    return { ok: false, error: adminRpcError(error, "Delete is not set up yet. Run migration 20261021000000_admin_delete_content.sql in Supabase SQL.") };
  }
  revalidatePath("/admin");
  revalidatePath("/feed");
  revalidatePath("/lost");
  revalidatePath("/adopt");
  revalidatePath("/match");
  if (t.data === "post") revalidatePath(`/post/${id.data}`);
  if (t.data === "lost_found") revalidatePath(`/lost/${id.data}`);
  if (t.data === "adoption") revalidatePath(`/adopt/${id.data}`);
  return { ok: true, message: "Content deleted" };
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
