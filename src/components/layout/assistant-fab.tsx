"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KaiaAvatar } from "@/components/features/ai/kaia-avatar";

/** Floating "Ask Kaia" button on phones (the sidebar has Kaia on bigger screens). */
export function AssistantFab() {
  const pathname = usePathname();
  // Only on browsing pages, so it never covers a form or a contact button.
  if (!/^\/(home|feed|pets|tag)(\/|$)/.test(pathname) || /\/(new|edit|health)$/.test(pathname)) return null;
  return (
    <Link
      href="/assistant"
      className="no-print fixed bottom-24 right-4 z-20 inline-flex h-12 items-center gap-2 rounded-full bg-cream pl-1 pr-4 font-extrabold text-ink shadow-[var(--shadow-lift)] ring-2 ring-ink/10 md:hidden"
      aria-label="Ask Kaia, the Pupmeow AI helper"
    >
      <KaiaAvatar size={40} className="bg-white" />
      <span>Ask Kaia</span>
    </Link>
  );
}
