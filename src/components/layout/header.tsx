"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Search, Settings, LogOut, PawPrint, Shield, Moon, Sun, User, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { ButtonLink } from "@/components/ui/button";
import { signOut } from "@/lib/actions/profile";
import { toggleTheme } from "@/lib/theme";
import { Logo } from "./logo";
import { NotificationBell } from "./notification-bell";
import { titleFor } from "./nav-config";
import type { ProfileRow } from "@/types/database";

export function Header({ profile, unread }: { profile: ProfileRow | null; unread: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");

  return (
    <header className="no-print sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6 lg:px-8">
        <Logo href={profile ? "/home" : "/"} className={profile ? "md:hidden" : ""} />
        {profile && <p className="hidden font-heading text-[1.35rem] font-semibold md:block">{titleFor(pathname)}</p>}
        <div className="ml-auto flex items-center gap-1.5">
          {profile ? (
            <>
              <form
                role="search"
                className="mr-1 hidden w-72 sm:block lg:w-80"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
                }}
              >
                <label htmlFor="global-search" className="sr-only">Search Pupmeow</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[1.1rem] w-[1.1rem] -translate-y-1/2 text-muted" aria-hidden />
                  <input
                    id="global-search"
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search pets, posts, areas"
                    className="h-11 w-full rounded-full border-2 border-transparent bg-surface-2 pl-10 pr-4 text-[0.95rem] placeholder:text-muted focus:border-primary focus:bg-surface focus:outline-none"
                  />
                </div>
              </form>
              <Link href="/search" className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-2 sm:hidden" aria-label="Search">
                <Search className="h-[1.35rem] w-[1.35rem]" aria-hidden />
              </Link>
              <NotificationBell userId={profile.id} initialUnread={unread} />
              <DropdownMenu
                label="Account menu"
                trigger={<Avatar src={profile.avatar_url} name={profile.display_name ?? profile.username} size="sm" />}
                items={[
                  { label: "My profile", href: profile.username ? `/u/${profile.username}` : "/settings", icon: <User className="h-4 w-4" /> },
                  { label: "My pets", href: "/pets", icon: <PawPrint className="h-4 w-4" /> },
                  { label: "Playdate requests", href: "/match/requests", icon: <Users className="h-4 w-4" /> },
                  { label: "Settings", href: "/settings", icon: <Settings className="h-4 w-4" /> },
                  { label: "Moderation", href: "/admin", icon: <Shield className="h-4 w-4" />, hidden: profile.role !== "admin" },
                  { label: "Light / dark mode", onSelect: toggleTheme, icon: <span className="relative h-4 w-4"><Sun className="absolute h-4 w-4 dark:hidden" /><Moon className="absolute hidden h-4 w-4 dark:block" /></span> },
                  { label: "Log out", onSelect: () => { void signOut(); }, icon: <LogOut className="h-4 w-4" />, danger: true },
                ]}
              />
            </>
          ) : (
            <>
              <ButtonLink href={`/login?next=${encodeURIComponent(pathname)}`} variant="ghost" size="sm">Log in</ButtonLink>
              <ButtonLink href={`/login?next=${encodeURIComponent(pathname)}`} size="sm">Join free</ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
