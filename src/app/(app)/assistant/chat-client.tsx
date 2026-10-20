"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Plus, Trash2, History, Siren, MapPin } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { Markdown } from "@/components/features/ai/markdown";
import { KaiaAvatar } from "@/components/features/ai/kaia-avatar";
import { detectEmergency } from "@/lib/ai/emergency";
import { cn, timeAgo } from "@/lib/utils";
import { deleteConversation } from "./actions";
import type { AiConversationRow, PetRow } from "@/types/database";

interface Msg { id: string; role: "user" | "assistant"; content: string; emergency?: boolean }

const STARTERS = [
  "What should I feed my Indie puppy?",
  "How do I protect my dog from ticks in monsoon?",
  "Vaccination schedule for a kitten in India",
  "My dog is scared of Diwali crackers. Tips?",
  "Is it too hot for a walk at 6 pm?",
  "How do I report a lost dog on Pupmeow?",
];

const VET_SEARCH = "https://www.google.com/maps/search/?api=1&query=24+hour+veterinary+hospital+near+me";

/** Marks Kaia replies that follow an emergency-sounding message (for saved chats). */
export function withEmergencyFlags(list: Msg[]): Msg[] {
  return list.map((m, i) => (m.role === "assistant" && i > 0 && list[i - 1].role === "user" && detectEmergency(list[i - 1].content) ? { ...m, emergency: true } : m));
}

export function ChatClient({ conversationId, conversations, initialMessages, pets, initialPetId, dailyLimit, remaining: initialRemaining, firstName }: {
  conversationId: string | null; conversations: AiConversationRow[]; initialMessages: Msg[]; pets: Pick<PetRow, "id" | "name" | "species">[]; initialPetId: string | null; dailyLimit: number; remaining: number; firstName: string;
}) {
  const [messages, setMessages] = useState<Msg[]>(withEmergencyFlags(initialMessages));
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [petId, setPetId] = useState(initialPetId ?? (pets.length === 1 ? pets[0].id : ""));
  const [convId, setConvId] = useState(conversationId);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const toast = useToast();
  const pet = pets.find((p) => p.id === petId);

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    if (remaining <= 0) { toast("You've used all of today's Kaia messages. They reset at midnight.", "info"); return; }
    const emergency = detectEmergency(message);
    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", content: message };
    const botId = `a-${Date.now()}`;
    setMessages((m) => [...m, userMsg, { id: botId, role: "assistant", content: "", emergency }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convId, petId: petId || null, message }),
      });
      if (!res.ok || !res.body) {
        const raw = await res.text().catch(() => "");
        let message = "Kaia is unavailable right now.";
        try {
          const j = JSON.parse(raw) as { error?: string };
          if (j.error) message = j.error;
        } catch {
          if (raw && raw.length < 280 && !raw.includes("<!DOCTYPE")) message = raw;
        }
        throw new Error(message);
      }
      const newId = res.headers.get("X-Conversation-Id");
      const left = Number(res.headers.get("X-AI-Remaining"));
      if (Number.isFinite(left)) setRemaining(left);
      if (res.headers.get("X-PM-Emergency") === "1") setMessages((m) => m.map((x) => (x.id === botId ? { ...x, emergency: true } : x)));
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => m.map((x) => (x.id === botId ? { ...x, content: acc } : x)));
      }
      if (newId && newId !== convId) {
        setConvId(newId);
        window.history.replaceState(null, "", `/assistant/${newId}`);
        router.refresh();
      }
    } catch (e) {
      setMessages((m) => m.map((x) => (x.id === botId ? { ...x, content: e instanceof Error ? e.message : "Something went wrong." } : x)));
    } finally {
      setBusy(false);
    }
  };

  const history = (
    <ul className="divide-y divide-border">
      {conversations.map((c) => (
        <li key={c.id} className="flex items-center gap-1">
          <Link href={`/assistant/${c.id}`} onClick={() => setHistoryOpen(false)} className={cn("min-w-0 flex-1 rounded-xl px-2 py-2.5 hover:bg-surface-2", c.id === convId && "bg-cream text-ink")}>
            <span className="block truncate font-bold">{c.title}</span>
            <span className="text-xs text-muted">{timeAgo(c.updated_at)}</span>
          </Link>
          <button type="button" onClick={() => setToDelete(c.id)} className="rounded-full p-2 text-muted hover:text-danger" aria-label={`Delete chat ${c.title}`}><Trash2 className="h-4 w-4" /></button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-h-[calc(100dvh-10.5rem)] flex-col overflow-hidden rounded-[var(--radius-xl)] bg-surface shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2 border-b border-border px-3 py-3 sm:gap-3 sm:px-4">
          <KaiaAvatar size={44} />
          <div className="min-w-0 flex-1">
            <p className="font-heading text-xl font-semibold leading-tight">Kaia</p>
            <p className="truncate text-[0.82rem] text-muted"><span className="sm:hidden">AI helper, not a vet</span><span className="hidden sm:inline">AI helper, not a vet · in an emergency, call a clinic</span></p>
          </div>
          {pets.length > 0 && (
            <label className="flex items-center gap-2 text-sm font-bold">
              <span className="sr-only">Chat about</span>
              <select value={petId} onChange={(e) => setPetId(e.target.value)} className="h-10 max-w-[9.5rem] rounded-full border-2 border-border bg-surface px-3 text-sm font-bold focus:border-primary focus:outline-none">
                <option value="">Any pet</option>
                {pets.map((p) => <option key={p.id} value={p.id}>About {p.name}</option>)}
              </select>
            </label>
          )}
          <Button variant="ghost" size="icon-sm" className="xl:hidden" onClick={() => setHistoryOpen(true)} aria-label="Past chats"><History className="h-5 w-5" /></Button>
          <Button variant="soft" size="sm" onClick={() => router.push("/assistant")} aria-label="New chat"><Plus className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">New</span></Button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite" aria-busy={busy}>
          {messages.length === 0 && (
            <div className="mx-auto max-w-lg py-6 text-center">
              <KaiaAvatar size={88} className="mx-auto animate-[pm-bob_3s_ease-in-out_infinite]" />
              <h2 className="mt-3 text-[1.9rem] font-semibold">Hi {firstName}! I&apos;m Kaia</h2>
              <p className="mx-auto mt-1 max-w-sm text-muted">Ask me about food, ticks, Delhi heat, vaccines, behaviour, or how to use Pupmeow.{pet ? ` I'll keep ${pet.name} in mind.` : pets.length ? " Pick a pet above for personal tips." : ""}</p>
              <div className="mt-5 grid gap-2 text-left sm:grid-cols-2">
                {STARTERS.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)} className="rounded-[var(--radius-md)] border-2 border-border bg-surface px-4 py-3 text-[0.92rem] font-bold hover:border-text">{s}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <p className="max-w-[85%] whitespace-pre-line rounded-[1.25rem] rounded-br-md bg-primary px-4 py-3 text-on-primary">{m.content}</p>
              </div>
            ) : (
              <div key={m.id} className="space-y-3">
                {m.emergency && (
                  <div role="alert" className="flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] bg-danger px-4 py-3.5 text-white">
                    <Siren className="h-6 w-6 shrink-0" aria-hidden />
                    <div className="min-w-[12rem] flex-1">
                      <p className="font-heading text-xl font-semibold leading-tight">See a vet now</p>
                      <p className="text-[0.92rem] font-semibold text-white/90">This could be an emergency. Don&apos;t wait for an online answer.</p>
                    </div>
                    <ButtonLink href={VET_SEARCH} target="_blank" rel="noopener noreferrer" variant="white" size="sm"><MapPin className="h-4 w-4" aria-hidden /> 24×7 vets near me</ButtonLink>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <KaiaAvatar size={32} className="mb-1" />
                  <div className={cn("max-w-[88%] rounded-[1.25rem] rounded-bl-md px-4 py-3", m.emergency ? "border-l-4 border-danger bg-ink text-white" : "bg-surface-2")}>
                    {m.content ? <Markdown text={m.content} /> : (
                      <span className="inline-flex gap-1 py-1" aria-label="Kaia is typing">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-muted" /><span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:120ms]" /><span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:240ms]" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          ))}
          <div ref={endRef} />
        </div>

        <div className="border-t border-border p-3 sm:p-4">
          <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="flex items-end gap-2 rounded-[1.6rem] border-2 border-border bg-surface p-1.5 pl-4 focus-within:border-primary">
            <label htmlFor="ai-input" className="sr-only">Message Kaia</label>
            <textarea
              id="ai-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={1}
              maxLength={2000}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }}
              placeholder={pet ? `Ask Kaia about ${pet.name}…` : "Ask Kaia anything about your pet…"}
              className="max-h-40 min-h-11 flex-1 resize-none bg-transparent py-2.5 text-[0.98rem] focus:outline-none"
            />
            <Button type="submit" size="icon" loading={busy} disabled={!input.trim()} aria-label="Send">{!busy && <Send className="h-[1.1rem] w-[1.1rem]" />}</Button>
          </form>
          <p className="mt-2 text-center text-xs font-semibold text-muted">Kaia is an AI, not a vet. Suggestions aren&apos;t a substitute for a vet · {remaining} of {dailyLimit} messages left today</p>
        </div>
      </div>

      <aside className="hidden space-y-4 xl:block">
        <section className="rounded-[var(--radius-lg)] bg-cream p-5 text-ink">
          <h2 className="text-[1.4rem] font-semibold leading-tight">What Kaia can help with</h2>
          <ol className="mt-3 space-y-2.5 text-[0.95rem] font-semibold">
            <li className="flex gap-2.5"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-[0.8rem] text-white">1</span> Food, ticks, heat, vaccines, behaviour.</li>
            <li className="flex gap-2.5"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-[0.8rem] text-white">2</span> Ask in plain English, like you would ask a friend.</li>
            <li className="flex gap-2.5"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-[0.8rem] text-white">3</span> Not a vet. In an emergency, call a clinic first.</li>
          </ol>
        </section>
        <section className="rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-card)]">
          <h2 className="mb-2 text-lg font-semibold">Past chats</h2>
          {conversations.length ? history : <p className="text-sm text-muted">Your chats with Kaia are saved here.</p>}
        </section>
      </aside>

      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title="Past chats" variant="sheet">
        {conversations.length === 0 ? <p className="text-sm text-muted">No saved chats yet.</p> : history}
      </Modal>
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} destructive title="Delete this chat?" confirmLabel="Delete" onConfirm={async () => {
        const id = toDelete!;
        const r = await deleteConversation(id);
        setToDelete(null);
        toast(r.ok ? r.message ?? "Deleted" : r.error, r.ok ? "success" : "error");
        if (r.ok && id === convId) router.push("/assistant"); else router.refresh();
      }} />
    </div>
  );
}
