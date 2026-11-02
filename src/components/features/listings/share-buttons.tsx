"use client";

import { useEffect, useRef } from "react";
import { Link2, Share2 } from "lucide-react";
import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Poster = { path: string; filename: string };

/**
 * Share to WhatsApp, the phone's share sheet, or copy the link.
 * With a `poster`, the main button sends the poster image itself (plus caption and link) through the
 * phone's share sheet, so it lands in a WhatsApp group in one step. Desktop falls back to a download + WhatsApp Web.
 */
export function ShareButtons({ path, text, className, size = "md", poster }: { path: string; text: string; className?: string; size?: "sm" | "md"; poster?: Poster }) {
  const toast = useToast();
  const url = () => `${window.location.origin}${path}`;
  const fileRef = useRef<Promise<File | null> | null>(null);

  const loadPoster = () => {
    if (!poster) return Promise.resolve(null);
    fileRef.current ??= fetch(poster.path, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => (b ? new File([b], poster.filename, { type: b.type || "image/png" }) : null))
      .catch(() => null);
    return fileRef.current;
  };

  // Phones only: fetch the image ahead of the tap so the share sheet opens inside the tap gesture (iOS needs that).
  useEffect(() => {
    if (!poster || typeof navigator === "undefined" || typeof navigator.canShare !== "function") return;
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const id = idle ? idle(() => void loadPoster()) : window.setTimeout(() => void loadPoster(), 800);
    return () => {
      if (!idle) window.clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per poster URL
  }, [poster?.path]);

  const sharePoster = async () => {
    const message = `${text}\n${url()}`;
    const file = await loadPoster();
    try {
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: message });
        return;
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return; // closed the share sheet
    }
    // Desktop / unsupported: save the image, then open WhatsApp with the caption to attach it.
    if (file) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(file);
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
      toast("Poster saved. Attach it in WhatsApp.", "info");
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className={cn(size === "sm" ? "grid grid-cols-2 gap-2 [&>*:first-child]:col-span-2" : "flex flex-wrap gap-2", className)}>
      <Button variant="whatsapp" size={size} onClick={poster ? sharePoster : () => window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url()}`)}`, "_blank", "noopener,noreferrer")}>
        <WhatsAppIcon className="h-[1.1rem] w-[1.1rem]" /> {poster ? "Send poster on WhatsApp" : "Share on WhatsApp"}
      </Button>
      <Button variant="outline" size={size} onClick={async () => {
        try {
          if (navigator.share) await navigator.share({ title: "Pupmeow", text, url: url() });
          else { await navigator.clipboard.writeText(url()); toast("Link copied"); }
        } catch { /* cancelled */ }
      }}>
        <Share2 className="h-4 w-4" aria-hidden /> {poster ? "Share link" : "Share"}
      </Button>
      <Button variant="ghost" size={size} onClick={async () => {
        try { await navigator.clipboard.writeText(url()); toast("Link copied"); } catch { toast("Couldn't copy. Long-press the address bar instead.", "error"); }
      }}>
        <Link2 className="h-4 w-4" aria-hidden /> Copy link
      </Button>
    </div>
  );
}
