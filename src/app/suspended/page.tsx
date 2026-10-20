import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { CONTACT_EMAIL, contactMailto } from "@/lib/constants";
import { Logo } from "@/components/layout/logo";

export const metadata: Metadata = { title: "Account suspended", robots: { index: false } };

export default async function SuspendedPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.is_banned) redirect("/home");
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center px-4">
      <div className="max-w-md rounded-[var(--radius-xl)] bg-surface p-8 text-center shadow-[var(--shadow-card)]">
        <Logo className="mb-6 justify-center" />
        <h1 className="text-3xl font-semibold">Your account is suspended</h1>
        <p className="mt-3 text-muted">
          Our moderators suspended this account because it broke the community guidelines. While suspended you can&apos;t post, comment or contact anyone.
          If you think this is a mistake, write to <a className="font-bold text-primary underline" href={contactMailto("Account appeal — Pupmeow")}>{CONTACT_EMAIL}</a> with your username.
        </p>
        <form action="/auth/signout" method="post" className="mt-6">
          <button className="h-11 rounded-full bg-strong px-6 font-bold text-on-strong hover:opacity-90">Log out</button>
        </form>
      </div>
    </main>
  );
}
