"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { PetVisionResult } from "@/lib/validations/ai";

/** "Fill with AI": reads the first uploaded photo and suggests species, breed, colour and age. */
export function FillWithAI({ imageUrl, onResult, className }: { imageUrl: string | undefined; onResult: (r: PetVisionResult) => void; className?: string }) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      disabled={!imageUrl}
      loading={loading}
      title={imageUrl ? undefined : "Upload a photo first"}
      onClick={async () => {
        if (!imageUrl) return;
        setLoading(true);
        try {
          const res = await fetch("/api/ai/vision", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl }) });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "AI couldn't read this photo");
          const r = json.result as PetVisionResult;
          if (!r.is_pet) { toast("We couldn't spot a dog or cat in that photo.", "info"); return; }
          onResult(r);
          toast("Filled from the photo — please check and edit.", "info");
        } catch (e) {
          toast(e instanceof Error ? e.message : "AI is unavailable", "error");
        } finally {
          setLoading(false);
        }
      }}
    >
      <Sparkles className="h-4 w-4 text-secondary" aria-hidden /> Fill with AI
    </Button>
  );
}
