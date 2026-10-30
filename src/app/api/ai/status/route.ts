import { NextResponse } from "next/server";
import { generateText } from "ai";
import { getAiConfigStatus, getKaiaChatProviderOrder, isAiAssistantEnabled } from "@/lib/ai/config";
import { sanitizeAiErrorSnippet, userFacingAiError } from "@/lib/ai/errors";
import { getActiveChatModelId, getChatModelForProvider } from "@/lib/ai/provider";
import { isAdminApiRequest } from "@/lib/auth/admin-api";

export const runtime = "nodejs";
export const maxDuration = 60;

const LIVE_PROBE_MS = 12_000;

/** Public: minimal health. Full config + live probes: admins only. */
export async function GET(request: Request) {
  const assistant = isAiAssistantEnabled();
  const isAdmin = await isAdminApiRequest();

  if (!isAdmin) {
    const order = getKaiaChatProviderOrder();
    return NextResponse.json(
      {
        assistant,
        ok: assistant,
        /** Which providers will be tried for chat (no secrets). */
        chatProviders: assistant ? order : [],
      },
      { status: assistant ? 200 : 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const status = getAiConfigStatus();
  const url = new URL(request.url);
  const body: Record<string, unknown> = {
    ...status,
    chatModel: getActiveChatModelId(),
    deploySha: (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7) || undefined,
  };

  if (url.searchParams.get("live") === "1" && assistant) {
    const order = getKaiaChatProviderOrder();
    let lastErr: unknown;
    for (const provider of order) {
      try {
        const { text } = await generateText({
          model: getChatModelForProvider(provider),
          prompt: "Reply with exactly: ok",
          maxOutputTokens: 8,
          maxRetries: 0,
          abortSignal: AbortSignal.timeout(LIVE_PROBE_MS),
        });
        const sample = text.trim().slice(0, 20);
        body.chatLive = true;
        body.chatLiveProvider = provider;
        body.chatLiveSample = sample;
        if (provider === "google") {
          body.geminiLive = true;
          body.geminiSample = sample;
        } else {
          body.geminiLive = false;
        }
        break;
      } catch (err) {
        lastErr = err;
        if (provider === "google") {
          body.geminiLive = false;
          body.geminiError = userFacingAiError(err);
          const detail = sanitizeAiErrorSnippet(err);
          if (detail) body.geminiErrorDetail = detail;
        }
      }
    }
    if (!body.chatLive) {
      body.chatLive = false;
      body.chatLiveError = userFacingAiError(lastErr);
      const detail = sanitizeAiErrorSnippet(lastErr);
      if (detail) body.chatLiveErrorDetail = detail;
    }
  }

  const googleInOrder = status.chatTryOrder.includes("google");
  const ok =
    status.assistant &&
    status.chatTryOrder.length > 0 &&
    (!googleInOrder || status.checks.googleKeyFormatOk !== false);
  return NextResponse.json(body, {
    status: ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
