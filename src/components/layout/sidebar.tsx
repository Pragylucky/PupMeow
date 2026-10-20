"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { KaiaAvatar } from "@/components/features/ai/kaia-avatar";
import { ADMIN_NAV, SIDEBAR_NAV, isActive } from "./nav-config";
import { useCreateSheet } from "./create-sheet";
import { Logo } from "./logo";

export function Sidebar({
  username,
  isAdmin,
  unread,
  aiEnabled,
}: {
  username: string | null;
  isAdmin: boolean;
  unread: number;
  aiEnabled: boolean;
}) {
  const pathname = usePathname();
  const { open } = useCreateSheet();
  const nav = SIDEBAR_NAV.filter((item) => aiEnabled || item.href !== "/assistant");
  const items = isAdmin ? [...nav, ADMIN_NAV] : nav;
  return (
    <div className="no-print hidden w-60 shrink-0 border-r border-border bg-surface md:block lg:w-64">
    <aside className="sticky top-0 flex h-dvh flex-col px-3.5 py-5 lg:px-4">
      <Logo href="/home" className="px-2" />
      <nav aria-label="Main" className="no-scrollbar mt-6 flex-1 overflow-y-auto">
        <ul className="space-y-1">
          {items.map((item) => {
            const href = item.href === "/me" ? (username ? `/u/${username}` : "/settings") : item.href;
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[0.98rem] font-bold transition-colors",
                    active ? "bg-cream text-ink" : "text-muted hover:bg-surface-2 hover:text-text",
                  )}
                >
                  {item.icon === "kaia" ? (
                    <KaiaAvatar size={22} className={active ? "" : "opacity-90"} />
                  ) : (
                    <item.icon className={cn("h-[1.3rem] w-[1.3rem]", active && "text-ink")} strokeWidth={active ? 2.4 : 2} aria-hidden />
                  )}
                  <span className="flex-1">{item.label}</span>
                  {item.href === "/notifications" && unread > 0 && (
                    <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-extrabold text-white">{unread > 99 ? "99+" : unread}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="space-y-2.5 pt-4">
        <Link
          href="/lost/new"
          className="flex h-12 items-center justify-center gap-2 rounded-full bg-danger font-bold text-white hover:bg-danger-strong"
        >
          <MapPin className="h-5 w-5" aria-hidden /> Report lost or found
        </Link>
        <button
          type="button"
          onClick={open}
          aria-haspopup="dialog"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-strong font-bold text-on-strong hover:opacity-90"
        >
          <Plus className="h-5 w-5" strokeWidth={2.75} aria-hidden /> Create
        </button>
        <p className="px-2 pt-2 text-[0.8rem] leading-relaxed text-muted">
          Free forever · No buying or selling animals ·{" "}
          <Link href="/guidelines" className="underline-offset-2 hover:underline">Rules</Link> · <Link href="/privacy" className="underline-offset-2 hover:underline">Privacy</Link>
        </p>
      </div>
    </aside>
    </div>
  );
}
