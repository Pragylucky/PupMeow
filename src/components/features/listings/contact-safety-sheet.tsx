"use client";

import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

const STORAGE_KEY = "pupmeow:contact-safety-v1";

export function hasAcceptedContactSafety() {
  if (typeof window === "undefined") return true;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markContactSafetyAccepted() {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function ContactSafetySheet({ open, onClose, onAccept }: { open: boolean; onClose: () => void; onAccept: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Before you call or WhatsApp"
      description="Keep yourself and the pet safe."
      variant="sheet"
    >
      <div className="space-y-4">
        <ul className="space-y-2 text-[0.95rem] font-semibold leading-snug">
          <li>Meet in a public place when handing over a pet.</li>
          <li>Never pay a &quot;rehoming fee&quot; or deposit to strangers.</li>
          <li>Don&apos;t chase a lost pet — note the spot and time instead.</li>
          <li>Report scams or abuse from the listing menu.</li>
        </ul>
        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            markContactSafetyAccepted();
            onAccept();
          }}
        >
          <Shield className="h-5 w-5" aria-hidden /> I understand — show contact options
        </Button>
      </div>
    </Modal>
  );
}
