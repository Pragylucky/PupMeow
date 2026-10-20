"use server";

import { revalidatePath } from "next/cache";
import { actionContext } from "@/lib/auth";
import { uuidSchema } from "@/lib/validations/common";
import type { ActionResult } from "@/types/models";

export async function deleteConversation(id: string): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const cid = uuidSchema.safeParse(id);
  if (!cid.success) return { ok: false, error: "Invalid chat" };
  const { error } = await ctx.supabase.from("ai_conversations").delete().eq("id", cid.data).eq("user_id", ctx.userId);
  if (error) return { ok: false, error: "Couldn't delete the chat." };
  revalidatePath("/assistant");
  return { ok: true, message: "Chat deleted" };
}
