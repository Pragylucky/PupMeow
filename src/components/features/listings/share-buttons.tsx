"use client";

import { Link2, Share2 } from "lucide-react";
import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/** Share to WhatsApp, the phone's share sheet, or copy the link. */
export function ShareButtons({ path, text, className, size = "md" }: { path: string; text: string; className?: string; size?: "sm" | "md" }) {
  const toast = useToast();
  const url = () => `${window.location.origin}${path}`;
  return (
    <div className={cn(size === "sm" ? "grid grid-cols-2 gap-2 [&>*:first-child]:col-span-2" : "flex flex-wrap gap-2", className)}>
      <Button variant="whatsapp" size={size} onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url()}`)}`, "_blank", "noopener,noreferrer")}>
        <WhatsAppIcon className="h-[1.1rem] w-[1.1rem]" /> Share on WhatsApp
      </Button>
      <Button variant="outline" size={size} onClick={async () => {
        try {
          if (navigator.share) await navigator.share({ title: "Pupmeow", text, url: url() });
          else { await navigator.clipboard.writeText(url()); toast("Link copied"); }
        } catch { /* cancelled */ }
      }}>
        <Share2 className="h-4 w-4" aria-hidden /> Share
      </Button>
      <Button variant="ghost" size={size} onClick={async () => {
        try { await navigator.clipboard.writeText(url()); toast("Link copied"); } catch { toast("Couldn't copy. Long-press the address bar instead.", "error"); }
      }}>
        <Link2 className="h-4 w-4" aria-hidden /> Copy link
      </Button>
    </div>
  );
}
