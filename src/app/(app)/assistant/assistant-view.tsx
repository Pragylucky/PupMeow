import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAiConfigStatus, getAiDailyLimit, isAiAssistantEnabled } from "@/lib/ai/config";
import { AI_DISCLAIMER } from "@/lib/constants";
import { EmptyState } from "@/components/ui/empty-state";
import { KaiaAvatar } from "@/components/features/ai/kaia-avatar";
import { ChatClient } from "./chat-client";
import type { AiConversationRow, AiMessageRow, PetRow } from "@/types/database";

export async function AssistantView({ conversationId }: { conversationId: string | null }) {
  const profile = await requireProfile(conversationId ? `/assistant/${conversationId}` : "/assistant");
  const dailyLimit = getAiDailyLimit();
  if (!isAiAssistantEnabled()) {
    const status = getAiConfigStatus();
    const needsKeyFix = status.checks.googleKey && status.checks.googleKeyFormatOk === false;
    return (
      <div className="mx-auto max-w-2xl">
        <section className="rounded-[var(--radius-xl)] bg-cream p-8 text-center text-ink">
          <KaiaAvatar size={96} className="mx-auto bg-white" />
          <h1 className="mt-4 text-[2.2rem] font-semibold">{needsKeyFix ? "Kaia is almost ready" : "Kaia is coming soon"}</h1>
          <p className="mx-auto mt-2 max-w-md font-semibold text-ink/80">
            {status.hint ??
              "Our friendly pet-care helper will answer questions about food, ticks, Delhi heat, vaccines and behaviour, and point you to a vet when it matters."}
          </p>
          {needsKeyFix && (
            <p className="mx-auto mt-4 max-w-md text-sm font-semibold text-ink/70">
              On Vercel: edit <code className="rounded bg-white/80 px-1">GOOGLE_GENERATIVE_AI_API_KEY</code> → paste an <strong>AIzaSy</strong> key from Google AI Studio → Redeploy.
            </p>
          )}
        </section>
        <EmptyState art="chat" title="Meanwhile" description="For anything urgent, call your vet or a 24×7 animal hospital." />
      </div>
    );
  }
  const supabase = await createClient();
  const [{ data: convs }, { data: pets }, { data: usage }] = await Promise.all([
    supabase.from("ai_conversations").select("*").eq("user_id", profile.id).order("updated_at", { ascending: false }).limit(50),
    supabase.from("pets").select("id, name, species").eq("owner_id", profile.id).order("name"),
    supabase.rpc("my_ai_usage"),
  ]);
  let messages: AiMessageRow[] = [];
  let current: AiConversationRow | null = null;
  if (conversationId) {
    current = ((convs ?? []) as AiConversationRow[]).find((c) => c.id === conversationId) ?? null;
    if (!current) notFound();
    const { data } = await supabase.from("ai_messages").select("*").eq("conversation_id", conversationId).order("created_at").limit(200);
    messages = (data ?? []) as AiMessageRow[];
  }
  const u = (usage as { used: number; reset_at: string }[] | null)?.[0];
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const resetDay = u ? new Date(u.reset_at).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) : today;
  const used = u && resetDay === today ? u.used : 0;

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <h1 className="sr-only">Kaia, the Pupmeow AI helper. {AI_DISCLAIMER}</h1>
      <ChatClient
        key={conversationId ?? "new"}
        conversationId={conversationId}
        conversations={(convs ?? []) as AiConversationRow[]}
        initialMessages={messages.map((m) => ({ id: m.id, role: m.role, content: m.content }))}
        pets={(pets ?? []) as Pick<PetRow, "id" | "name" | "species">[]}
        initialPetId={current?.pet_id ?? null}
        dailyLimit={dailyLimit}
        remaining={Math.max(0, dailyLimit - used)}
        firstName={(profile.display_name ?? profile.username ?? "there").split(" ")[0]}
      />
    </div>
  );
}
