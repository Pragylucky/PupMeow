"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";

/** Bell with unread badge, kept live via Supabase Realtime (RLS limits events to the user's own rows). */
export function NotificationBell({ userId, initialUnread }: { userId: string; initialUnread: number }) {
  const [unread, setUnread] = useState(initialUnread);
  const toast = useToast();
  const pathname = usePathname();

  useEffect(() => setUnread(initialUnread), [initialUnread]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload: { new: { message?: string; type?: string } }) => {
          setUnread((n) => n + 1);
          if (!pathname.startsWith("/notifications") && payload.new?.type !== "like") {
            toast(payload.new?.message ? `🔔 ${payload.new.message}` : "New notification", "info");
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload: { new: { is_read?: boolean }; old: { is_read?: boolean } }) => {
          if (payload.new?.is_read && payload.old?.is_read === false) setUnread((n) => Math.max(0, n - 1));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, toast, pathname]);

  return (
    <Link
      href="/notifications"
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-text hover:bg-surface-2"
      aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
    >
      <Bell className="h-[1.35rem] w-[1.35rem]" aria-hidden />
      {unread > 0 && (
        <span className="absolute right-1 top-1 flex h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full bg-danger px-1 text-[0.65rem] font-extrabold text-white ring-2 ring-surface">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
