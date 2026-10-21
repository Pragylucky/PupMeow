import "server-only";
import type { AiProviderName } from "./config";
import { getAiProviderName, getChatFallbackProviders, hasProviderKey } from "./config";
import { getChatModelForProvider } from "./provider";

export type ChatProviderName = AiProviderName;

/** Primary + optional fallbacks for Kaia chat (order matters). */
export function buildChatModelChain(): { model: ReturnType<typeof getChatModelForProvider>; provider: ChatProviderName }[] {
  const primary = getAiProviderName();
  if (!primary) throw new Error("AI is not configured");
  const chain: ChatProviderName[] = [primary, ...getChatFallbackProviders(primary)];
  const seen = new Set<ChatProviderName>();
  return chain
    .filter((p) => {
      if (seen.has(p) || !hasProviderKey(p)) return false;
      seen.add(p);
      return true;
    })
    .map((provider) => ({ provider, model: getChatModelForProvider(provider) }));
}
