import "server-only";
import type { AiProviderName } from "./config";
import { getKaiaChatProviderOrder } from "./config";
import { getChatModelForProvider } from "./provider";

export type ChatProviderName = AiProviderName;

/** Kaia chat: try providers in order (default Groq → Gemini → …) until one works. */
export function buildChatModelChain(): { model: ReturnType<typeof getChatModelForProvider>; provider: ChatProviderName }[] {
  return getKaiaChatProviderOrder().map((provider) => ({
    provider,
    model: getChatModelForProvider(provider),
  }));
}
