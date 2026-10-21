import { NextResponse } from "next/server";
import { generateText } from "ai";
import { getAiConfigStatus, isAiAssistantEnabled } from "@/lib/ai/config";
import { sanitizeAiErrorSnippet, userFacingAiError } from "@/lib/ai/errors";
import { getActiveChatModelId, getLanguageModel } from "@/lib/ai/provider";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Public health check: is Kaia configured on this deployment? (no secrets returned) */
export async function GET(request: Request) {
  const status = getAiConfigStatus();
  const url = new URL(request.url);
  const body: Record<string, unknown> = {
    ...status,
    chatModel: getActiveChatModelId(),
    deploySha: (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7) || undefined,
  };

  if (url.searchParams.get("live") === "1" && isAiAssistantEnabled()) {
    try {
      const { text } = await generateText({
        model: getLanguageModel(),
        prompt: "Reply with exactly: ok",
        maxOutputTokens: 8,
        maxRetries: 1,
        abortSignal: AbortSignal.timeout(28_000),
      });
      body.geminiLive = true;
      body.geminiSample = text.trim().slice(0, 20);
    } catch (err) {
      body.geminiLive = false;
      body.geminiError = userFacingAiError(err);
      const detail = sanitizeAiErrorSnippet(err);
      if (detail) body.geminiErrorDetail = detail;
    }
  }

  const ok = status.assistant && status.checks.googleKeyFormatOk !== false;
  return NextResponse.json(body, {
    status: ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
