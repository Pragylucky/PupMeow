"use client";

import Link from "next/link";
import { useId, useRef } from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  value: string;
  label: React.ReactNode;
  href?: string;
  count?: number;
}

/** Underline tabs. With `href` they act as navigation; otherwise as an ARIA tablist. */
export function Tabs({
  items, value, onChange, className, ariaLabel, variant = "pill",
}: { items: TabItem[]; value: string; onChange?: (v: string) => void; className?: string; ariaLabel: string; variant?: "pill" | "underline" }) {
  const id = useId();
  const refs = useRef<(HTMLElement | null)[]>([]);
  const isNav = items.every((i) => i.href);

  const pill = variant === "pill";
  const wrapCls = pill
    ? "no-scrollbar flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-surface-2 p-1"
    : "no-scrollbar flex overflow-x-auto border-b border-border";
  const tabCls = (active: boolean) =>
    pill
      ? cn(
          "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition-colors",
          active ? "bg-strong text-on-strong shadow-sm" : "text-muted hover:text-text",
        )
      : cn(
          "relative inline-flex h-11 shrink-0 items-center gap-1.5 px-3 text-sm font-bold transition-colors",
          active ? "text-text" : "text-muted hover:text-text",
          active && "after:absolute after:inset-x-2 after:bottom-0 after:h-1 after:rounded-full after:bg-strong",
        );
  const countCls = (active: boolean) => cn("rounded-full px-1.5 text-xs tabular-nums", active ? "bg-white/20" : "bg-surface");

  if (isNav) {
    return (
      <nav aria-label={ariaLabel} className={cn(wrapCls, className)}>
        {items.map((t) => (
          <Link key={t.value} href={t.href!} scroll={false} className={tabCls(t.value === value)} aria-current={t.value === value ? "page" : undefined}>
            {t.label}
            {typeof t.count === "number" && <span className={countCls(t.value === value)}>{t.count}</span>}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(wrapCls, className)}
      onKeyDown={(e) => {
        const idx = items.findIndex((i) => i.value === value);
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          const next = (idx + (e.key === "ArrowRight" ? 1 : items.length - 1)) % items.length;
          onChange?.(items[next].value);
          refs.current[next]?.focus();
        }
      }}
    >
      {items.map((t, i) => (
        <button
          key={t.value}
          ref={(el) => { refs.current[i] = el; }}
          role="tab"
          type="button"
          id={`${id}-${t.value}`}
          aria-selected={t.value === value}
          tabIndex={t.value === value ? 0 : -1}
          onClick={() => onChange?.(t.value)}
          className={tabCls(t.value === value)}
        >
          {t.label}
          {typeof t.count === "number" && <span className={countCls(t.value === value)}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
