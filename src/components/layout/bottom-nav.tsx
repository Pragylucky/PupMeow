"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { MOBILE_NAV, isActive } from "./nav-config";
import { useCreateSheet } from "./create-sheet";

export function BottomNav({
  username,
  avatarUrl,
  displayName,
}: {
  username: string | null;
  avatarUrl?: string | null;
  displayName?: string | null;
}) {
  const pathname = usePathname();
  const { open } = useCreateSheet();
  const [createSpin, setCreateSpin] = useState(0);
  return (
    <nav aria-label="Main" className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-safe backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-5 px-1 pt-1.5">
        {MOBILE_NAV.map((item) => {
          if (item.href === "#create") {
            return (
              <li key="create" className="flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setCreateSpin((n) => n + 1);
                    open();
                  }}
                  aria-label="Create"
                  aria-haspopup="dialog"
                  className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-strong text-on-strong shadow-[var(--shadow-lift)] ring-4 ring-background active:scale-95"
                >
                  <Plus
                    key={createSpin}
                    className="h-7 w-7 animate-[pm-create-spin_420ms_ease-out]"
                    strokeWidth={2.75}
                  />
                </button>
              </li>
            );
          }
          const href = item.href === "/me" ? (username ? `/u/${username}` : "/settings") : item.href;
          const active = isActive(pathname, item.href);
          const isProfileTab = item.href === "/me";
          return (
            <li key={item.href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("flex flex-col items-center gap-0.5 py-1 text-[0.72rem] font-extrabold", active ? "text-text" : "text-muted")}
              >
                <span
                  className={cn(
                    "flex h-9 w-12 items-center justify-center rounded-full transition-colors",
                    active && !isProfileTab && "bg-cream text-ink",
                    isProfileTab && active && "ring-2 ring-cream",
                  )}
                >
                  {isProfileTab ? (
                    <Avatar
                      src={avatarUrl}
                      name={displayName}
                      size="sm"
                      ring={active}
                      className={cn(!active && "opacity-90")}
                    />
                  ) : (
                    <item.icon
                      key={active ? "on" : "off"}
                      className={cn(
                        "h-[1.3rem] w-[1.3rem]",
                        active && "animate-[pm-tab-pop_340ms_ease-out]",
                      )}
                      strokeWidth={active ? 2.5 : 2}
                      aria-hidden
                    />
                  )}
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
