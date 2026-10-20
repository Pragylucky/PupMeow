import "server-only";
import { generateText, Output } from "ai";
import { getLanguageModel } from "./provider";
import { isAiModerationLlmEnabled } from "./config";
import { MODERATION_PROMPT } from "./prompts";
import { moderationResultSchema, type ModerationResult } from "@/lib/validations/ai";
import { SALE_PATTERN } from "@/lib/validations/listings";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import type { ReportTarget } from "@/types/database";

const ABUSE_PATTERN = /\b(?:kill (?:all|the) (?:dogs|cats)|poison (?:the )?(?:dogs|cats)|madarchod|bhenchod|chutiya|fuck you|kill yourself)\b/i;
const SPAM_PATTERN = /(https?:\/\/\S+.*){4,}|(?:earn|make) ₹?\d+.*(?:daily|per day)|crypto|bitcoin|telegram\.me/i;

/** Fast, offline checks that always run (also the fallback when AI is not configured). */
export function heuristicModeration(text: string, kind: "post" | "comment" | "listing" | "profile"): ModerationResult {
  if (ABUSE_PATTERN.test(text)) return { verdict: "block", categories: ["abuse"], reason: "Abusive or violent language." };
  if (SPAM_PATTERN.test(text)) return { verdict: "flag", categories: ["spam"], reason: "Looks like spam." };
  if (SALE_PATTERN.test(text)) {
    return kind === "listing"
      ? { verdict: "block", categories: ["animal_sale"], reason: "Mentions a price or fee for an animal." }
      : { verdict: "flag", categories: ["animal_sale"], reason: "Mentions a price; possible animal sale." };
  }
  return { verdict: "allow", categories: [], reason: "" };
}

export async function moderateText(text: string, kind: "post" | "comment" | "listing" | "profile"): Promise<ModerationResult> {
  const quick = heuristicModeration(text, kind);
  if (quick.verdict === "block" || !isAiModerationLlmEnabled() || text.trim().length < 40) return quick;
  try {
    const { output } = await generateText({
      model: getLanguageModel(),
      system: MODERATION_PROMPT,
      prompt: `Content type: ${kind}\n---\n${text.slice(0, 4000)}\n---`,
      output: Output.object({ schema: moderationResultSchema }),
      abortSignal: AbortSignal.timeout(8000),
      maxRetries: 1,
    });
    if (quick.verdict === "flag" && output.verdict === "allow") return quick;
    return output;
  } catch (err) {
    console.error("[moderation] AI check failed, using heuristics", err);
    return quick;
  }
}

export function blockedMessage(result: ModerationResult) {
  if (result.categories.includes("animal_sale")) {
    return "Pupmeow doesn't allow buying or selling animals. Please remove any price or fee and try again.";
  }
  if (result.categories.includes("animal_cruelty")) return "This content can't be posted because it may promote harm to animals.";
  if (result.categories.includes("abuse")) return "Please keep it kind — this looks abusive, so it wasn't posted.";
  if (result.categories.includes("sexual")) return "This content isn't allowed on Pupmeow.";
  return "This looks like spam, so it wasn't posted. If that's a mistake, edit it and try again.";
}

/** Put borderline content into the admin queue (system report with reporter_id = NULL). */
export async function flagForReview(targetType: ReportTarget, targetId: string, result: ModerationResult) {
  if (!hasServiceRole()) return;
  try {
    const admin = createAdminClient();
    await admin.from("reports").insert({
      reporter_id: null,
      target_type: targetType,
      target_id: targetId,
      reason: "ai_flag",
      ai_reason: `${result.categories.join(", ") || "review"}: ${result.reason}`.slice(0, 500),
    });
  } catch (err) {
    console.error("[moderation] could not flag content", err);
  }
}
