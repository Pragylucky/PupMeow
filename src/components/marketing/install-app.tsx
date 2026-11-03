"use client";

import { useEffect, useState } from "react";
import { Download, Check } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type Mode = "loading" | "ready" | "installed" | "other";

/** One-tap install on Chrome / Edge / Android. Elsewhere it points to the manual steps below. */
export function InstallApp() {
  const [mode, setMode] = useState<Mode>("loading");
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    setMode(standalone ? "installed" : "other");
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      setMode("ready");
    };
    const onInstalled = () => setMode("installed");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (mode === "installed") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 font-bold"><Check className="h-4 w-4" aria-hidden /> You&apos;re using the app</span>
        <ButtonLink href="/home" variant="white" size="lg">Go to Home</ButtonLink>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      {mode === "ready" && evt ? (
        <Button
          size="lg"
          variant="white"
          onClick={async () => {
            await evt.prompt();
            const choice = await evt.userChoice;
            if (choice.outcome === "accepted") setMode("installed");
            setEvt(null);
          }}
        >
          <Download className="h-5 w-5" aria-hidden /> Install the app
        </Button>
      ) : (
        <ButtonLink href="#how" variant="white" size="lg"><Download className="h-5 w-5" aria-hidden /> How to install</ButtonLink>
      )}
      <ButtonLink href="/home" variant="dim" size="lg">Just open the site</ButtonLink>
    </div>
  );
}
