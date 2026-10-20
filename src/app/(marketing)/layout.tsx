import { MarketingHeader, SiteFooter } from "@/components/marketing/site-footer";
import { PetArt } from "@/components/brand/pet-art";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketingHeader />
      <div className="relative overflow-hidden bg-primary">
        <div className="mx-auto flex h-24 max-w-3xl items-end justify-end px-5" aria-hidden>
          <PetArt pet={{ species: "dog", look: "golden" }} className="h-20 w-20 translate-y-1" />
          <PetArt pet={{ species: "cat", look: "violet" }} className="-ml-5 h-16 w-16 translate-y-1" />
        </div>
      </div>
      <main id="main" className="mx-auto -mt-1 max-w-3xl px-4 pb-16">
        <div className="prose-pm rounded-b-[var(--radius-xl)] bg-surface p-6 shadow-[var(--shadow-card)] sm:p-10">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}
