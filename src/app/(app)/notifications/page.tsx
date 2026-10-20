import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MINI_PROFILE } from "@/lib/columns";
import { WithRail } from "@/components/layout/page-layout";
import { Steps, TipCard } from "@/components/brand/bits";
import { ButtonLink } from "@/components/ui/button";
import { NotificationsList } from "./notifications-list";
import type { NotificationWithActor } from "@/types/models";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };

export default async function NotificationsPage() {
  const profile = await requireProfile("/notifications");
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select(`*, actor:profiles!notifications_actor_id_fkey(${MINI_PROFILE})`)
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <WithRail
      rail={
        <TipCard tone="ink" title="Stay in the loop">
          <Steps items={["Lost-pet alerts for your area always show first.", "Everything else waits in this list.", "Choose what you hear about in Settings."]} />
          <ButtonLink href="/settings#notifications" variant="white" size="sm" className="mt-4"><Settings className="h-4 w-4" aria-hidden /> Notification settings</ButtonLink>
        </TipCard>
      }
    >
      <NotificationsList initial={(data ?? []) as NotificationWithActor[]} />
    </WithRail>
  );
}
