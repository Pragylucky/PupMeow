import { userFacingAiError } from "./errors";

/** Friendly copy when Kaia has nothing to show — keep warm, never technical. */
export const KAIA_UNABLE_TO_REPLY =
  "Sorry — I couldn't put together an answer just now. My brain did a tiny bonk. 🐾 Try sending your question again in a moment?";

/** Shown when the client waits too long with no usable reply. */
export const KAIA_REPLY_TIMEOUT =
  "Hmm… this one took longer than a catnap and I still couldn't finish. Sorry, friend! 🐾 Please try again — I'll hop right back to it.";

/** User-facing Kaia errors in chat (no API keys or provider jargon). */
export function userFacingKaiaChatError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const lower = msg.toLowerCase();
  if (lower.includes("daily") && lower.includes("limit")) {
    return "You've used all of today's Kaia messages — they reset at midnight. See you tomorrow! 🌙";
  }
  if (lower.includes("onboarding") || lower.includes("finish onboarding")) {
    return "Finish setting up your profile first, then come chat with me. 🐾";
  }
  if (lower.includes("coming soon")) {
    return "Kaia is resting for a bit — check back soon! 🐾";
  }
  if (lower.includes("aborted") || lower.includes("timeout") || lower.includes("timed out")) {
    return KAIA_REPLY_TIMEOUT;
  }
  const fromProvider = userFacingAiError(err);
  const helpful =
    /api key|quota|rate limit|timed out|didn't get a reply|couldn't get an answer|model name|gemini|groq|cerebras|redeploy|vercel/i.test(fromProvider);
  if (helpful) return fromProvider;
  return KAIA_UNABLE_TO_REPLY;
}
