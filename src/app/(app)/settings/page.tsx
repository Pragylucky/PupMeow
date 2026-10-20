import type { Metadata } from "next";
import Link from "next/link";
import { Bell, ChevronLeft, Database, Palette, ShieldBan, User } from "lucide-react";
import { requireProfile, getPrivateProfile } from "@/lib/auth";
import { ProfileSettingsForm, NotificationSettingsForm, DangerZone } from "./settings-forms";
import { Avatar } from "@/components/ui/avatar";
import { UnblockButton } from "@/components/features/social/follow-button";
import { ThemePicker } from "@/components/features/settings/theme-picker";
import { WithRail } from "@/components/layout/page-layout";
import { TipCard } from "@/components/brand/bits";
import { createClient } from "@/lib/supabase/server";
import { displayName } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

function Section({ id, icon: Icon, title, description, children }: { id: string; icon: typeof User; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24 rounded-[var(--radius-xl)] bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2"><Icon className="h-5 w-5" aria-hidden /></span>
        <div>
          <h2 id={`${id}-h`} className="text-[1.4rem] font-semibold leading-tight">{title}</h2>
          {description && <p className="text-sm text-muted">{description}</p>}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const profile = await requireProfile("/settings");
  const priv = await getPrivateProfile();
  const supabase = await createClient();
  const { data: blockedData } = await supabase.rpc("my_blocked_users");
  const blocked = (blockedData ?? []) as { id: string; username: string | null; display_name: string | null; avatar_url: string | null }[];
  return (
    <WithRail
      rail={
        <>
          <nav aria-label="Settings sections" className="hidden rounded-[var(--radius-lg)] bg-surface p-2 shadow-[var(--shadow-card)] xl:block">
            {[["#profile", "Profile"], ["#appearance", "Appearance"], ["#notifications", "Notifications"], ["#blocked", "Blocked people"], ["#data", "Your data"]].map(([h, l]) => (
              <a key={h} href={h} className="block rounded-xl px-3 py-2.5 font-bold text-muted hover:bg-surface-2 hover:text-text">{l}</a>
            ))}
          </nav>
          <TipCard tone="ink" title="Pupmeow is free forever">
            <ul className="space-y-2 text-[0.95rem] font-semibold text-white/90">
              <li>No ads in lost-pet alerts.</li>
              <li>No buying or selling animals.</li>
              <li>Made in Delhi, for NCR pet families.</li>
            </ul>
          </TipCard>
        </>
      }
    >
      {profile.username && <Link href={`/u/${profile.username}`} className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-muted hover:text-text"><ChevronLeft className="h-4 w-4" aria-hidden /> My profile</Link>}
      <h1 className="mb-5 text-[2rem] font-semibold leading-tight sm:text-[2.4rem]">Settings</h1>
      <div className="space-y-4">
        <Section id="profile" icon={User} title="Profile" description="How neighbours see you.">
          <ProfileSettingsForm profile={profile} priv={priv} />
        </Section>
        <Section id="appearance" icon={Palette} title="Appearance" description="Saved on this device.">
          <ThemePicker />
        </Section>
        <Section id="notifications" icon={Bell} title="Notifications" description="In-app alerts. Lost pets near you are on by default.">
          <NotificationSettingsForm priv={priv} />
        </Section>
        <Section id="blocked" icon={ShieldBan} title="Blocked people" description="They can't see your posts or listings, and you won't see theirs.">
          {blocked.length ? (
            <ul className="divide-y divide-border">
              {blocked.map((b) => (
                <li key={b.id} className="flex items-center gap-3 py-2.5">
                  <Avatar src={b.avatar_url} name={displayName(b)} size="sm" />
                  <span className="flex-1 font-semibold">{displayName(b)}</span>
                  <UnblockButton targetId={b.id} />
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">You haven&apos;t blocked anyone.</p>}
        </Section>
        <Section id="data" icon={Database} title="Your data" description="Under India's DPDP Act 2023 you can take your data with you or delete it.">
          <p className="text-sm text-muted">Download everything you&apos;ve shared on Pupmeow as a file, or delete your account. Read the <a href="/privacy" className="font-bold text-primary underline">privacy policy</a>.</p>
          <DangerZone />
        </Section>
      </div>
    </WithRail>
  );
}
