import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { InstagramIconLink } from "@/components/marketing/social-links";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-[0.95rem] text-muted">A friendly community for dog and cat families in Delhi NCR. Free to join. No buying or selling animals, ever.</p>
          <div className="mt-3">
            <InstagramIconLink className="h-11 w-11" iconClassName="h-[1.35rem] w-[1.35rem]" />
          </div>
        </div>
        <nav aria-label="Explore">
          <h2 className="font-heading text-base font-semibold">Explore</h2>
          <ul className="mt-2 space-y-1.5 text-[0.95rem]">
            <li><Link className="hover:underline" href="/lost">Lost &amp; Found</Link></li>
            <li><Link className="hover:underline" href="/adopt">Adopt a pet</Link></li>
            <li><Link className="hover:underline" href="/login?next=/match">Playdates</Link></li>
            <li><Link className="hover:underline" href="/login?next=/assistant">Kaia</Link></li>
          </ul>
        </nav>
        <nav aria-label="Pupmeow">
          <h2 className="font-heading text-base font-semibold">Pupmeow</h2>
          <ul className="mt-2 space-y-1.5 text-[0.95rem]">
            <li><Link className="hover:underline" href="/get-app">Get the app</Link></li>
            <li><Link className="hover:underline" href="/about">About</Link></li>
            <li><Link className="hover:underline" href="/contact">Contact</Link></li>
            <li><Link className="hover:underline" href="/#ngos">For NGOs</Link></li>
          </ul>
        </nav>
        <nav aria-label="Policies">
          <h2 className="font-heading text-base font-semibold">Policies</h2>
          <ul className="mt-2 space-y-1.5 text-[0.95rem]">
            <li><Link className="hover:underline" href="/guidelines">Community rules</Link></li>
            <li><Link className="hover:underline" href="/privacy">Privacy</Link></li>
            <li><Link className="hover:underline" href="/terms">Terms</Link></li>
          </ul>
        </nav>
      </div>
      <p className="border-t border-border py-4 text-center text-sm text-muted">© {new Date().getFullYear()} Pupmeow · Made in Delhi · No buying or selling animals, ever</p>
    </footer>
  );
}

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Logo />
        <nav aria-label="Sections" className="hidden items-center gap-1 text-[0.95rem] font-bold md:flex">
          <Link href="/lost" className="rounded-full px-3 py-2 hover:bg-surface-2">Lost &amp; found</Link>
          <Link href="/adopt" className="rounded-full px-3 py-2 hover:bg-surface-2">Adopt</Link>
          <Link href="/login?next=/match" className="rounded-full px-3 py-2 hover:bg-surface-2">Playdates</Link>
          <Link href="/login?next=/assistant" className="rounded-full px-3 py-2 hover:bg-surface-2">Kaia</Link>
          <Link href="/#ngos" className="rounded-full px-3 py-2 hover:bg-surface-2">For NGOs</Link>
        </nav>
        <nav aria-label="Account" className="flex items-center gap-1 sm:gap-2">
          <InstagramIconLink className="h-10 w-10" />
          <Link href="/login" className="rounded-full px-4 py-2 text-sm font-bold hover:bg-surface-2">Log in</Link>
          <Link href="/login" className="rounded-full bg-strong px-4 py-2.5 text-sm font-bold text-on-strong hover:opacity-90">Join free</Link>
        </nav>
      </div>
    </header>
  );
}
