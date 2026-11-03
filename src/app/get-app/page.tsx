import type { Metadata } from "next";
import { Bell, MapPin, Share, Smartphone, Syringe, Monitor, MoreVertical, PlusSquare } from "lucide-react";
import { MarketingHeader, SiteFooter } from "@/components/marketing/site-footer";
import { InstallApp } from "@/components/marketing/install-app";
import { PetArt } from "@/components/brand/pet-art";

export const metadata: Metadata = {
  title: "Get the Pupmeow app",
  description: "Add Pupmeow to your phone's home screen in 30 seconds. Lost-pet alerts, vaccine reminders and Kaia, always one tap away. Free.",
};

const WHY = [
  { icon: MapPin, title: "Lost-pet alerts", text: "Hear about missing pets near you the moment they're posted, even when Pupmeow is closed.", tone: "bg-danger text-white" },
  { icon: Syringe, title: "Vaccine reminders", text: "A nudge before each vaccine or treatment is due, so nothing slips.", tone: "bg-secondary text-ink" },
  { icon: Bell, title: "One tap away", text: "Opens full-screen from your home screen, like any other app. No app store, no downloads.", tone: "bg-cat text-white" },
];

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-on-primary">{n}</span>
      <span className="pt-0.5 text-[0.98rem] font-semibold text-text/90">{children}</span>
    </li>
  );
}

export default function GetAppPage() {
  return (
    <>
      <MarketingHeader />
      <main id="main" className="mx-auto max-w-4xl px-4 pb-16 pt-6 sm:px-6">
        <section className="relative overflow-hidden rounded-[var(--radius-xl)] bg-primary px-6 py-10 text-on-primary sm:px-10 sm:py-14">
          <div className="relative max-w-lg">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-extrabold"><Smartphone className="h-4 w-4" aria-hidden /> Free · Android, iPhone &amp; desktop</p>
            <h1 className="mt-4 text-[2.6rem] font-semibold leading-[1.02] text-balance sm:text-[3.4rem]">Pupmeow in your pocket</h1>
            <p className="mt-3 text-[1.1rem] font-semibold text-on-primary/90">Add it to your home screen in 30 seconds. It works like an app and updates by itself.</p>
            <div className="mt-6"><InstallApp /></div>
          </div>
          <div className="pointer-events-none absolute -bottom-3 right-4 hidden items-end sm:flex" aria-hidden>
            <PetArt pet={{ species: "dog", look: "golden" }} className="h-44 w-44" animated />
            <PetArt pet={{ species: "cat", look: "violet" }} className="-ml-12 h-32 w-32" animated />
          </div>
        </section>

        <section aria-labelledby="why-h" className="mt-10">
          <h2 id="why-h" className="text-[1.7rem] font-semibold">Why add it to your phone</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {WHY.map((w) => (
              <li key={w.title} className={`rounded-[var(--radius-lg)] p-5 ${w.tone}`}>
                <w.icon className="h-7 w-7" aria-hidden />
                <h3 className="mt-3 text-[1.2rem] font-semibold leading-tight">{w.title}</h3>
                <p className="mt-1 text-[0.95rem] font-semibold opacity-90">{w.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="how" aria-labelledby="how-h" className="mt-10 scroll-mt-24">
          <h2 id="how-h" className="text-[1.7rem] font-semibold">How to install</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <article className="rounded-[var(--radius-xl)] bg-surface p-5 shadow-[var(--shadow-card)]">
              <h3 className="flex items-center gap-2 text-xl font-semibold"><Smartphone className="h-5 w-5 text-primary" aria-hidden /> Android</h3>
              <p className="text-sm text-muted">Chrome</p>
              <ol className="mt-4 space-y-3">
                <Step n={1}>Open <strong>pupmeow.in</strong> in Chrome and sign in.</Step>
                <Step n={2}>Tap the menu <MoreVertical className="inline h-4 w-4 align-text-bottom" aria-label="three dots" />, then <strong>Install app</strong> (or <em>Add to Home screen</em>).</Step>
                <Step n={3}>Open Pupmeow from your home screen.</Step>
              </ol>
            </article>
            <article className="rounded-[var(--radius-xl)] bg-surface p-5 shadow-[var(--shadow-card)]">
              <h3 className="flex items-center gap-2 text-xl font-semibold"><Smartphone className="h-5 w-5 text-primary" aria-hidden /> iPhone</h3>
              <p className="text-sm text-muted">Safari</p>
              <ol className="mt-4 space-y-3">
                <Step n={1}>Open <strong>pupmeow.in</strong> in Safari and sign in.</Step>
                <Step n={2}>Tap <Share className="inline h-4 w-4 align-text-bottom" aria-label="Share" /> <strong>Share</strong>, then <PlusSquare className="inline h-4 w-4 align-text-bottom" aria-hidden /> <strong>Add to Home Screen</strong>.</Step>
                <Step n={3}>Open Pupmeow from there to turn on alerts. iPhone only sends alerts to the installed app.</Step>
              </ol>
            </article>
            <article className="rounded-[var(--radius-xl)] bg-surface p-5 shadow-[var(--shadow-card)]">
              <h3 className="flex items-center gap-2 text-xl font-semibold"><Monitor className="h-5 w-5 text-primary" aria-hidden /> Laptop</h3>
              <p className="text-sm text-muted">Chrome or Edge</p>
              <ol className="mt-4 space-y-3">
                <Step n={1}>Open <strong>pupmeow.in</strong>.</Step>
                <Step n={2}>Click the <strong>install</strong> icon at the right end of the address bar.</Step>
                <Step n={3}>Pupmeow opens in its own window.</Step>
              </ol>
            </article>
          </div>
        </section>

        <section aria-labelledby="faq-h" className="mt-10 rounded-[var(--radius-xl)] bg-cream p-6 text-ink sm:p-8">
          <h2 id="faq-h" className="text-[1.5rem] font-semibold">Quick answers</h2>
          <dl className="mt-3 space-y-4">
            <div><dt className="font-extrabold">Is it free?</dt><dd className="font-semibold text-ink/80">Yes. Pupmeow is free for families and always will be.</dd></div>
            <div><dt className="font-extrabold">Is it the same as the website?</dt><dd className="font-semibold text-ink/80">Yes. It&apos;s the same Pupmeow, opened full-screen, so you never need to update it by hand.</dd></div>
            <div><dt className="font-extrabold">How do I get alerts?</dt><dd className="font-semibold text-ink/80">After installing, open Settings in Pupmeow and tap <strong>Turn on notifications</strong>.</dd></div>
            <div><dt className="font-extrabold">Is it on the Play Store?</dt><dd className="font-semibold text-ink/80">Not yet. Installing from your browser takes the same 30 seconds and works the same way.</dd></div>
          </dl>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
