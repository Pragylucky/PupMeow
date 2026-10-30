export function flattenAiErrorMessage(err: unknown): string {
  const parts: string[] = [];
  let cur: unknown = err;
  for (let depth = 0; depth < 6 && cur; depth++) {
    if (cur instanceof Error) {
      if (cur.message) parts.push(cur.message);
      cur = (cur as Error & { cause?: unknown }).cause;
    } else {
      const s = String(cur).trim();
      if (s) parts.push(s);
      break;
    }
  }
  const joined = parts.join(" ");
  const last = joined.match(/Last error:\s*(?:AI_\w+:\s*)?(.+)/i);
  return (last?.[1] ?? joined).trim();
}

/** Short ops-safe snippet for status JSON (no API keys). */
export function sanitizeAiErrorSnippet(err: unknown, max = 280): string {
  const msg = flattenAiErrorMessage(err)
    .replace(/\bAIza[\w-]{10,}\b/g, "[key]")
    .replace(/\bAQ\.[\w.-]{20,}\b/g, "[key]");
  if (!msg) return "";
  return msg.length <= max ? msg : `${msg.slice(0, max - 1)}…`;
}

/** Turn provider / SDK errors into short user-facing copy (no secrets). */
export function userFacingAiError(err: unknown): string {
  const msg = flattenAiErrorMessage(err);
  const lower = msg.toLowerCase();
  if (lower.includes("api key not valid") || lower.includes("api_key_invalid")) {
    return "The Gemini API key on the server is invalid. In Vercel, paste your key from Google AI Studio into GOOGLE_GENERATIVE_AI_API_KEY, then redeploy.";
  }
  if (lower.includes("permission") && lower.includes("api")) {
    return "Gemini API access is blocked for this key. In Google AI Studio, create a new key with no HTTP referrer restriction (server use).";
  }
  if (lower.includes("no longer available to new users") || lower.includes("use models/gemini-3.8-flash")) {
    return "This Gemini key must use gemini-3.8-flash (not 2.5 Flash). Remove AI_MODEL on Vercel or set AI_MODEL=gemini-3.8-flash, then redeploy.";
  }
  if (lower.includes("quota") || lower.includes("rate limit") || lower.includes("resource_exhausted") || lower.includes("rate_limit")) {
    return "AI free-tier limit reached for today. Wait a bit and try again, or check usage in Groq / Google AI Studio.";
  }
  if (lower.includes("not found") && lower.includes("model")) {
    return "The AI model name is wrong for this key. Set GROQ_MODEL=qwen/qwen3.8-27b on Vercel (Groq retired llama-3.3-70b-versatile), or AI_MODEL=gemini-3.8-flash for Gemini, then redeploy.";
  }
  if (lower.includes("model_not_found") || lower.includes("does not exist or you do not have access")) {
    return "Groq rejected the chat model. On Vercel set GROQ_MODEL=qwen/qwen3.8-27b (or remove GROQ_MODEL to use the app default), then redeploy.";
  }
  if (lower.includes("aborted") || lower.includes("timeout")) {
    return "Kaia timed out. Try again in a moment.";
  }
  if (lower.includes("empty response")) {
    return "Kaia couldn't get an answer from the AI right now. Wait a moment and try again.";
  }
  if (lower.includes("invalid api key") || lower.includes("invalid_api_key")) {
    return "The Groq or Gemini API key on the server is invalid. Check keys on Vercel and redeploy.";
  }
  const firstLine = msg.split("\n")[0]?.trim() ?? "";
  if (firstLine.length > 0 && firstLine.length <= 220) return firstLine;
  if (firstLine.length > 220) return `${firstLine.slice(0, 217)}…`;
  return "Kaia couldn't reach Google right now. Please try again in a moment.";
}
