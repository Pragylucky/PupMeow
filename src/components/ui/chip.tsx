"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const chipBase =
  "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border-2 px-4 text-sm font-bold transition-colors";

export function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn(chipBase, "border-border bg-surface", className)}>{children}</span>;
}

/** Toggleable chip used for filters. Renders a link when `href` is given (URL-driven filters). */
export function FilterChip({
  active, onClick, href, children, className, ...rest
}: {
  active: boolean;
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLElement>, "onClick">) {
  const cls = cn(
    chipBase,
    active ? "border-strong bg-strong text-on-strong" : "border-border bg-surface text-text hover:border-text",
    className,
  );
  if (href) {
    return (
      <Link href={href} className={cls} aria-current={active ? "true" : undefined} scroll={false} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} aria-pressed={active} onClick={onClick} {...rest}>
      {children}
    </button>
  );
}
