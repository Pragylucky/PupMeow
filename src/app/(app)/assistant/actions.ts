"use server";

import { revalidatePath } from "next/cache";
import { actionContext } from "@/lib/auth";
import { uuidSchema } from "@/lib/validations/common";
import type { ActionResult } from "@/types/models";

function deleteChatError(error: { message?: string }): string {
  const msg = error.message ?? "";
  if (msg.includes("Could not find the function") || msg.includes("delete_ai_conversation")) {
    return "Run migration 20261024000003_delete_ai_conversation.sql in Supabase SQL, then try again.";
  }
  if (msg.includes("Chat not found")) return "Chat not found or already deleted.";
  return "Couldn't delete the chat.";
}

export async function deleteConversation(id: string): Promise<ActionResult> {
  const ctx = await actionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const cid = uuidSchema.safeParse(id);
  if (!cid.success) return { ok: false, error: "Invalid chat" };

  const { error: rpcError } = await ctx.supabase.rpc("delete_ai_conversation", { p_conversation_id: cid.data });
  if (!rpcError) {
    revalidatePath("/assistant");
    revalidatePath(`/assistant/${cid.data}`);
    return { ok: true, message: "Chat deleted" };
  }

  const rpcMissing =
    rpcError.message?.includes("Could not find the function") || rpcError.message?.includes("delete_ai_conversation");
  if (!rpcMissing) return { ok: false, error: deleteChatError(rpcError) };

  await ctx.supabase.from("ai_messages").delete().eq("conversation_id", cid.data);
  const { error, count } = await ctx.supabase
    .from("ai_conversations")
    .delete({ count: "exact" })
    .eq("id", cid.data)
    .eq("user_id", ctx.userId);
  if (error || !count) return { ok: false, error: deleteChatError(error ?? rpcError) };
  revalidatePath("/assistant");
  revalidatePath(`/assistant/${cid.data}`);
  return { ok: true, message: "Chat deleted" };
}
