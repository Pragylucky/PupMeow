"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  onSelect?: () => void;
  href?: string;
  danger?: boolean;
  hidden?: boolean;
}

/** Keyboard-accessible menu button (Arrow keys, Home/End, Esc). */
export function DropdownMenu({
  trigger, items, label, align = "end", className, triggerClassName,
}: { trigger: React.ReactNode; items: MenuItem[]; label: string; align?: "start" | "end"; className?: string; triggerClassName?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const visible = items.filter((i) => !i.hidden);

  useEffect(() => {
    if (!open) return;
    itemRefs.current[0]?.focus();
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const close = (focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) btnRef.current?.focus();
  };

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName ?? "inline-flex items-center justify-center rounded-full p-2 text-muted hover:bg-surface-2 hover:text-text"}
      >
        {trigger}
      </button>
      {open && (
        <div
          id={id}
          role="menu"
          aria-label={label}
          onKeyDown={(e) => {
            const idx = itemRefs.current.findIndex((el) => el === document.activeElement);
            if (e.key === "Escape") { e.preventDefault(); close(); }
            if (e.key === "ArrowDown") { e.preventDefault(); itemRefs.current[(idx + 1) % visible.length]?.focus(); }
            if (e.key === "ArrowUp") { e.preventDefault(); itemRefs.current[(idx - 1 + visible.length) % visible.length]?.focus(); }
            if (e.key === "Home") { e.preventDefault(); itemRefs.current[0]?.focus(); }
            if (e.key === "End") { e.preventDefault(); itemRefs.current[visible.length - 1]?.focus(); }
            if (e.key === "Tab") close(false);
          }}
          className={cn(
            "absolute z-40 mt-1 min-w-52 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface p-1.5 shadow-[var(--shadow-lift)] animate-[pm-fade_120ms_ease-out]",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {visible.map((item, i) => {
            const cls = cn(
              "flex w-full items-center gap-2.5 rounded-[0.6rem] px-3 py-2.5 text-left text-sm font-bold hover:bg-surface-2 focus:bg-surface-2 focus:outline-none",
              item.danger && "text-danger",
            );
            return item.href ? (
              <Link key={item.label} ref={(el) => { itemRefs.current[i] = el; }} role="menuitem" href={item.href} className={cls} onClick={() => close(false)}>
                {item.icon}{item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                ref={(el) => { itemRefs.current[i] = el; }}
                role="menuitem"
                type="button"
                className={cls}
                onClick={() => { close(false); item.onSelect?.(); }}
              >
                {item.icon}{item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
