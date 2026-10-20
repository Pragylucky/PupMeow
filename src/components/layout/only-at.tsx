"use client";

import { useSyncExternalStore } from "react";

const WIDE = "(min-width: 80rem)"; // Tailwind `xl`

function subscribe(cb: () => void) {
  const m = window.matchMedia(WIDE);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}

/**
 * Renders its children only on wide screens (`wide`) or only below `xl`.
 * The server renders both copies (CSS hides one); after hydration the unused copy is removed,
 * so forms and buttons never exist twice in the page.
 */
export function OnlyAt({ wide, children }: { wide: boolean; children: React.ReactNode }) {
  const isWide = useSyncExternalStore(subscribe, () => window.matchMedia(WIDE).matches, () => null);
  if (isWide !== null && isWide !== wide) return null;
  return <div className={wide ? "hidden xl:block" : "xl:hidden"}>{children}</div>;
}
