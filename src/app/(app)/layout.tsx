import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { isKaiaListedInApp } from "@/lib/ai/config";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (profile?.is_banned) redirect("/suspended");
  if (profile && !profile.onboarded) redirect("/onboarding");

  let unread = 0;
  if (profile) {
    const supabase = await createClient();
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .eq("is_read", false);
    unread = count ?? 0;
  }

  return (
    <AppShell profile={profile} unread={unread} aiEnabled={isKaiaListedInApp()}>
      {children}
    </AppShell>
  );
}
