import "server-only";
import { generateText } from "ai";
import { getAuxiliaryLanguageProviderOrder, getKaiaChatProviderOrder, type AiProviderName } from "./config";
import { sanitizeAiErrorSnippet } from "./errors";
import { getChatModelForProvider } from "./provider";

/** Hard caps so a draft always fits its form field. */
export const WRITE_MAX_CHARS: Record<string, number> = { profile_bio: 200, pet_about: 300, post_caption: 400 };

/** Providers to try: the ones Kaia chat already uses first (known to work), then any other keyed one. */
export function writeProviderOrder(): AiProviderName[] {
  return [...new Set([...getKaiaChatProviderOrder(), ...getAuxiliaryLanguageProviderOrder()])];
}

/** Drop reasoning blocks some models leak, wrapping quotes, and trim to the field's limit. */
export function cleanDraft(raw: string, max?: number): string {
  let t = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim().replace(/^["“”']+|["“”']+$/g, "").trim();
  if (max && t.length > max) {
    const cut = t.slice(0, max);
    const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
    t = end > max * 0.5 ? cut.slice(0, end + 1) : cut.slice(0, cut.lastIndexOf(" ") > 0 ? cut.lastIndexOf(" ") : max).trim();
  }
  return t;
}

/** Generate a draft, falling through providers on an error or an empty reply. */
export async function generateDraft({ kind, system, prompt }: { kind: string; system: string; prompt: string }) {
  const order = writeProviderOrder();
  if (!order.length) throw new Error("AI is not configured");
  let lastError: unknown;
  for (const provider of order) {
    try {
      const { text } = await generateText({
        model: getChatModelForProvider(provider),
        system,
        prompt,
        // Thinking models spend part of this on reasoning; too small a budget returns empty text.
        maxOutputTokens: 1500,
        temperature: 0.7,
        abortSignal: AbortSignal.timeout(15000),
      });
      const draft = cleanDraft(text, WRITE_MAX_CHARS[kind]);
      if (draft) return { text: draft, provider };
      lastError = new Error(`${provider} returned an empty draft`);
    } catch (err) {
      lastError = err;
      console.error(`[ai/write] ${provider} failed:`, sanitizeAiErrorSnippet(err));
    }
  }
  throw lastError ?? new Error("AI is not configured");
}
