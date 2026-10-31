import type { Metadata } from "next";
import Link from "next/link";
import { Smartphone, Download, ExternalLink } from "lucide-react";
import { MarketingHeader, SiteFooter } from "@/components/marketing/site-footer";
import { buttonClasses } from "@/components/ui/button";
import { LIVE_SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Get the Pupmeow app",
  description: "Install Pupmeow on Android — same free pet community at pupmeow.in.",
};

export default function GetAppPage() {
  return (
    <>
      <MarketingHeader />
      <main id="main" className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="text-[2.2rem] font-semibold leading-tight sm:text-[2.6rem]">Get Pupmeow on your phone</h1>
        <p className="mt-3 text-[1.05rem] text-muted">
          The app is the same site as{" "}
          <a href={LIVE_SITE_URL} className="font-bold text-primary underline">
            pupmeow.in
          </a>
          , full-screen. Updates when we deploy the website — no separate app store code.
        </p>

        <section className="mt-10 rounded-[var(--radius-xl)] bg-surface p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-start gap-3">
            <Smartphone className="mt-1 h-8 w-8 shrink-0 text-primary" aria-hidden />
            <div>
              <h2 className="text-xl font-semibold">Install in 30 seconds (Android Chrome)</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-[0.98rem] font-semibold text-muted">
                <li>
                  Open{" "}
                  <Link href="/home" className="text-primary underline">
                    pupmeow.in/home
                  </Link>{" "}
                  and sign in with Google.
                </li>
                <li>Tap the menu (⋮) → <strong className="text-text">Install app</strong> or <strong className="text-text">Add to Home screen</strong>.</li>
                <li>Open Pupmeow from your home screen like any app.</li>
              </ol>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[var(--radius-xl)] bg-cream p-6 text-ink">
          <div className="flex items-start gap-3">
            <Download className="mt-1 h-8 w-8 shrink-0" aria-hidden />
            <div>
              <h2 className="text-xl font-semibold">Build an APK (for testers)</h2>
              <p className="mt-2 text-[0.98rem] font-semibold text-ink/85">
                Use Microsoft&apos;s free{" "}
                <a href="https://www.pwabuilder.com/" className="underline" target="_blank" rel="noopener noreferrer">
                  PWABuilder
                </a>{" "}
                with URL <code className="rounded bg-white/80 px-1.5 py-0.5 text-sm">https://pupmeow.in</code>, then package for Android. Step-by-step for Play Store later is in our repo doc{" "}
                <code className="rounded bg-white/80 px-1.5 py-0.5 text-sm">docs/ANDROID_APP.md</code>.
              </p>
              <a
                href="https://www.pwabuilder.com/"
                target="_blank"
                rel="noopener noreferrer"
                className={`${buttonClasses("primary", "md")} mt-4 inline-flex`}
              >
                Open PWABuilder <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            </div>
          </div>
        </section>

        <p className="mt-8 text-sm text-muted">
          iPhone: Safari → Share → <strong>Add to Home Screen</strong>. Native iOS app may come later; Android + PWA first.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
