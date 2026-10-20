import { Bell, MessageCircle, Search, Heart } from "lucide-react";
import { PetArt } from "@/components/brand/pet-art";
import { cn } from "@/lib/utils";

type Art = "paw" | "dog" | "cat" | "search" | "bell" | "heart" | "home" | "chat";

/** Friendly, on-brand empty state: our mascot pets with a short message and one clear action. */
export function EmptyState({
  art = "paw", title, description, action, className, tone = "plain",
}: { art?: Art; title: string; description?: React.ReactNode; action?: React.ReactNode; className?: string; tone?: "plain" | "card" }) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", tone === "card" && "rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-card)]", className)}>
      <EmptyArt art={art} />
      <h2 className="mt-4 text-2xl font-semibold text-balance">{title}</h2>
      {description && <p className="mt-1.5 max-w-sm text-[0.95rem] text-muted text-pretty">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

function EmptyArt({ art }: { art: Art }) {
  const Icon = art === "search" ? Search : art === "bell" ? Bell : art === "chat" ? MessageCircle : art === "heart" ? Heart : null;
  const showDog = art !== "cat";
  const showCat = art === "cat" || art === "paw" || art === "home" || art === "heart" || art === "chat";
  return (
    <div className="relative flex h-28 items-end justify-center gap-1" aria-hidden>
      <span className="absolute bottom-0 left-1/2 h-24 w-40 -translate-x-1/2 rounded-full bg-secondary-soft" />
      {showDog && <PetArt pet={{ species: "dog", look: art === "search" ? "beagle" : "golden" }} className="relative h-24 w-24" />}
      {showCat && <PetArt pet={{ species: "cat", look: art === "cat" ? "orange" : "violet" }} className="relative -ml-6 h-20 w-20" />}
      {Icon && (
        <span className="absolute -right-2 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-strong text-on-strong shadow-[var(--shadow-soft)]">
          <Icon className="h-5 w-5" />
        </span>
      )}
    </div>
  );
}
