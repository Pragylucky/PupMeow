/** Turn provider / SDK errors into short user-facing copy (no secrets). */
export function userFacingAiError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const lower = msg.toLowerCase();
  if (lower.includes("api key not valid") || lower.includes("api_key_invalid")) {
    return "The Gemini API key on the server is invalid. In Vercel, use a key from Google AI Studio (starts with AIza) named GOOGLE_GENERATIVE_AI_API_KEY, then redeploy.";
  }
  if (lower.includes("permission") && lower.includes("api")) {
    return "Gemini API access is blocked for this key. In Google AI Studio, create a new key with no HTTP referrer restriction (server use).";
  }
  if (lower.includes("not found") && lower.includes("model")) {
    return "The AI model name is outdated on the server. Pull the latest deploy or set AI_MODEL in Vercel.";
  }
  if (lower.includes("aborted") || lower.includes("timeout")) {
    return "Kaia timed out reaching Google. Try again in a moment, or check your network.";
  }
  if (msg.length > 0 && msg.length < 200) return msg;
  return "Kaia couldn't reach Google right now. Please try again in a moment.";
}
