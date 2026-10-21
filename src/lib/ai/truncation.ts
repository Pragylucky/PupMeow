/** Detect replies cut off mid-stream (common with some Groq streaming responses). */
export function isLikelyTruncatedReply(text: string, finishReason?: string): boolean {
  if (finishReason && finishReason !== "stop") return true;
  const t = text.trim();
  if (!t) return true;

  const boldMarkers = (t.match(/\*\*/g) ?? []).length;
  if (boldMarkers % 2 === 1) return true;

  const lastLine = t.split("\n").pop()?.trim() ?? "";
  if (/^\d+\.\s+\*\*[^*\n]{0,160}$/.test(lastLine)) return true;
  if (/^\d+\.\s+\S+/.test(lastLine) && !/[.!?)]$/.test(lastLine) && lastLine.length < 120) return true;

  return false;
}
