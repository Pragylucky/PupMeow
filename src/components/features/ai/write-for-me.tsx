"use client";

import { useState } from "react";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export type WriteKind = "post_caption" | "adoption_description" | "lost_description" | "found_description" | "match_about";

/** "Write it for me": drafts text from a few details. The user always edits before posting. */
export function WriteForMe({ kind, getDetails, onDraft, className }: { kind: WriteKind; getDetails: () => string; onDraft: (text: string) => void; className?: string }) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={className}
      loading={loading}
      onClick={async () => {
        const details = getDetails().trim();
        if (details.length < 3) { toast("Add a few details first (name, breed, what happened…)", "info"); return; }
        setLoading(true);
        try {
          const res = await fetch("/api/ai/write", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, details }) });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "AI couldn't write this right now");
          onDraft(json.text as string);
          toast("Draft added — edit it to make it yours.", "info");
        } catch (e) {
          toast(e instanceof Error ? e.message : "AI is unavailable", "error");
        } finally {
          setLoading(false);
        }
      }}
    >
      <Wand2 className="h-4 w-4 text-primary" aria-hidden /> Write it for me
    </Button>
  );
}
