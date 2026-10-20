"use client";

import { useCallback, useState } from "react";
import { Eye, Lock, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";
import { Button, ButtonLink } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { ContactSafetySheet, hasAcceptedContactSafety } from "@/components/features/listings/contact-safety-sheet";
import { getContact, reportLostSighting } from "@/lib/actions/lost";
import { cn, telLink, whatsappLink } from "@/lib/utils";

type Contact = { method: "whatsapp" | "phone"; value: string };

function useContact(kind: "lost_found" | "adoption", id: string) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState<"wa" | "call" | null>(null);
  const toast = useToast();
  const load = async (which: "wa" | "call"): Promise<Contact | null> => {
    if (contact) return contact;
    setLoading(which);
    const res = await getContact(kind, id);
    setLoading(null);
    if (res.ok && res.data) { setContact(res.data); return res.data; }
    toast(res.ok ? "Contact isn't available" : res.error, "error");
    return null;
  };
  return { contact, loading, load };
}

/** Opens WhatsApp in a new tab without being blocked as a pop-up (the tab is opened on tap, filled after the lookup). */
async function openWhatsApp(getNumber: () => Promise<Contact | null>, message: string) {
  const win = window.open("about:blank", "_blank");
  const c = await getNumber();
  if (!c) { win?.close(); return; }
  const url = whatsappLink(c.value, message);
  if (win) win.location.href = url; else window.location.href = url;
}

type PendingAction = { kind: "call" } | { kind: "wa" } | { kind: "sighting-send"; text: string };

/**
 * Contact buttons for lost/found reports and adoption listings.
 * Numbers are only revealed to signed-in members (server RPC), never in the page HTML.
 */
export function ContactButton({
  kind, id, loggedIn, message, loginNext, label = "WhatsApp", className, sighting, method = "whatsapp",
}: {
  kind: "lost_found" | "adoption";
  /** The lister's chosen contact method. "phone" hides WhatsApp. */
  method?: "whatsapp" | "phone";
  id: string;
  loggedIn: boolean;
  message: string;
  loginNext: string;
  label?: string;
  className?: string;
  /** Lost pets: adds an "I saw him" button that notifies the owner and opens WhatsApp/call. */
  sighting?: { petName: string; pronoun: "him" | "her" | "them"; defaultArea: string };
}) {
  const { contact, loading, load } = useContact(kind, id);
  const [sightOpen, setSightOpen] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const toast = useToast();

  const runAfterSafety = useCallback(async (action: PendingAction) => {
    if (action.kind === "call") {
      const c = await load("call");
      if (c) window.location.href = telLink(c.value);
      return;
    }
    if (action.kind === "wa") {
      await openWhatsApp(() => load("wa"), message);
      return;
    }
    const res = await reportLostSighting(id, action.text);
    if (!res.ok) {
      toast(res.error, "error");
      return;
    }
    toast(res.message ?? "Sighting sent", "success");
    if (method === "phone") {
      try { await navigator.clipboard.writeText(action.text); } catch { /* ignore */ }
      const c = await load("call");
      if (c) window.location.href = telLink(c.value);
    } else {
      await openWhatsApp(() => load("wa"), action.text);
    }
  }, [id, load, message, method, toast]);

  const withSafety = (action: PendingAction) => {
    if (!hasAcceptedContactSafety()) {
      setPending(action);
      setSafetyOpen(true);
      return;
    }
    void runAfterSafety(action);
  };

  const sightingLabel = sighting
    ? `I saw ${sighting.pronoun === "them" ? sighting.petName : sighting.pronoun}`
    : "";

  if (!loggedIn) {
    return (
      <div className={cn("space-y-3", className)}>
        {sighting && (
          <div className="rounded-[var(--radius-lg)] border-2 border-danger/30 bg-danger-soft p-4 text-center">
            <p className="flex items-center justify-center gap-2 font-heading text-lg font-semibold text-danger">
              <Eye className="h-4 w-4" aria-hidden /> {sightingLabel}?
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm font-semibold text-ink/80">
              Sign in free to send the spot to the owner inside Pupmeow, then call or WhatsApp if you want.
            </p>
            <ButtonLink href={`/login?next=${encodeURIComponent(loginNext)}`} className="mt-3" variant="danger">
              Sign in to report a sighting
            </ButtonLink>
          </div>
        )}
        <div className="rounded-[var(--radius-lg)] border-2 border-dashed border-border bg-surface p-5 text-center">
          <p className="flex items-center justify-center gap-2 font-heading text-lg font-semibold"><Lock className="h-4 w-4" aria-hidden /> Join free to contact the {kind === "adoption" ? "lister" : "owner"}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Phone numbers are shown only to signed-in members, so they stay safe from spammers.</p>
          <ButtonLink href={`/login?next=${encodeURIComponent(loginNext)}`} className="mt-4">Join Pupmeow to contact</ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <ContactSafetySheet
        open={safetyOpen}
        onClose={() => { setSafetyOpen(false); setPending(null); }}
        onAccept={() => {
          setSafetyOpen(false);
          if (pending) void runAfterSafety(pending);
          setPending(null);
        }}
      />
      {sighting && (
        <Button size="lg" variant="danger" className="w-full" onClick={() => setSightOpen(true)}>
          <Eye className="h-5 w-5" aria-hidden /> {sightingLabel}
        </Button>
      )}
      <div className={cn("grid gap-2.5", method === "whatsapp" ? "grid-cols-2" : "grid-cols-1")}>
        <Button size="lg" variant="primary" loading={loading === "call"} onClick={() => withSafety({ kind: "call" })}>
          {loading !== "call" && <Phone className="h-[1.1rem] w-[1.1rem]" aria-hidden />} Call
        </Button>
        {method === "whatsapp" && (
          <Button size="lg" variant="whatsapp" loading={loading === "wa"} onClick={() => withSafety({ kind: "wa" })}>
            {loading !== "wa" && <WhatsAppIcon className="h-5 w-5" />} {label}
          </Button>
        )}
      </div>
      {contact && (
        <p className="text-center text-sm text-muted">
          {contact.method === "whatsapp" ? "WhatsApp" : "Phone"}: <a href={telLink(contact.value)} className="font-bold text-text underline-offset-2 hover:underline">{contact.value}</a>
        </p>
      )}
      {sighting && (
        <SightingDialog
          open={sightOpen}
          onClose={() => setSightOpen(false)}
          petName={sighting.petName}
          defaultArea={sighting.defaultArea}
          viaCall={method === "phone"}
          onSend={(text) => {
            setSightOpen(false);
            withSafety({ kind: "sighting-send", text });
          }}
        />
      )}
    </div>
  );
}

function SightingDialog({ open, onClose, petName, defaultArea, onSend, viaCall }: { open: boolean; onClose: () => void; petName: string; defaultArea: string; onSend: (text: string) => void; viaCall?: boolean }) {
  const [where, setWhere] = useState("");
  const [when, setWhen] = useState("just now");
  const [note, setNote] = useState("");
  const text = `Hi! I think I saw ${petName} near ${where || defaultArea}, ${when}. ${note}`.trim() + "\n(Sent from Pupmeow)";
  return (
    <Modal open={open} onClose={onClose} title={`Where did you see ${petName}?`} description="We'll notify the owner in Pupmeow, then open call or WhatsApp if you continue." variant="sheet">
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSend(text); }}>
        <Input label="Lane, landmark or area" name="where" value={where} onChange={(e) => setWhere(e.target.value)} placeholder={`e.g. ${defaultArea}, near the metro gate`} autoFocus />
        <div className="flex flex-wrap gap-2" role="group" aria-label="When">
          {["just now", "in the last hour", "this morning", "yesterday evening"].map((w) => (
            <button key={w} type="button" onClick={() => setWhen(w)} aria-pressed={when === w} className={cn("h-11 min-h-[44px] rounded-full border-2 px-4 text-sm font-bold", when === w ? "border-strong bg-strong text-on-strong" : "border-border hover:border-text")}>
              {w}
            </button>
          ))}
        </div>
        <Textarea label="Anything else? (optional)" name="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={2} placeholder="Was with a group of dogs, looked scared, went towards the park…" />
        <div className="rounded-[var(--radius-md)] bg-surface-2 p-3 text-sm">
          <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-muted">Message preview</p>
          <p className="whitespace-pre-line">{text}</p>
        </div>
        {viaCall ? (
          <Button type="submit" size="lg" className="w-full"><Phone className="h-5 w-5" aria-hidden /> Notify owner &amp; call</Button>
        ) : (
          <Button type="submit" size="lg" variant="whatsapp" className="w-full"><WhatsAppIcon className="h-5 w-5" /> Notify owner &amp; WhatsApp</Button>
        )}
        <p className="text-center text-xs text-muted">Don&apos;t chase. Note the lane and the time, offer water from a distance and stay nearby if you can.</p>
      </form>
    </Modal>
  );
}
