"use client";

import { Cat, Dog, PawPrint } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpecies } from "./species-context";
import type { SpeciesPref } from "@/types/database";

const OPTIONS: { value: SpeciesPref; label: string; Icon: typeof Dog }[] = [
  { value: "dog", label: "Dogs", Icon: Dog },
  { value: "cat", label: "Cats", Icon: Cat },
  { value: "both", label: "Both", Icon: PawPrint },
];

/** The Dog / Cat / Both switch shown at the top of every section. Remembered everywhere. */
export function SpeciesToggle({ className, compact, tone = "default" }: { className?: string; compact?: boolean; tone?: "default" | "onColor" }) {
  const { species, setSpecies, pending } = useSpecies();
  return (
    <div
      role="radiogroup"
      aria-label="Show content for"
      aria-busy={pending || undefined}
      className={cn(
        "inline-flex rounded-full p-1",
        tone === "onColor" ? "bg-black/20" : "bg-surface-2",
        className,
      )}
      onKeyDown={(e) => {
        const idx = OPTIONS.findIndex((o) => o.value === species);
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          const next = OPTIONS[(idx + (e.key === "ArrowRight" ? 1 : OPTIONS.length - 1)) % OPTIONS.length];
          setSpecies(next.value);
        }
      }}
    >
      {OPTIONS.map((o) => {
        const active = species === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => setSpecies(o.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full font-bold transition-colors",
              compact ? "h-8 px-3 text-[0.85rem]" : "h-9 px-4 text-[0.92rem]",
              active
                ? cn("shadow-[0_1px_3px_rgb(26_34_51/0.15)]", tone === "onColor" ? "bg-white text-ink" : "bg-surface text-text")
                : tone === "onColor" ? "text-white/90 hover:text-white" : "text-muted hover:text-text",
            )}
          >
            <o.Icon className={cn("h-4 w-4", active && o.value === "dog" && "text-secondary-strong", active && o.value === "cat" && "text-cat")} aria-hidden />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Page heading with optional actions and the species switch on its own row. */
export function SectionHeader({ title, description, action, toggle = true, className }: { title: string; description?: React.ReactNode; action?: React.ReactNode; toggle?: boolean; className?: string }) {
  return (
    <div className={cn("mb-5 flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[2rem] font-semibold leading-tight sm:text-[2.4rem]">{title}</h1>
          {description && <p className="mt-1 max-w-xl text-[0.98rem] text-muted text-pretty">{description}</p>}
        </div>
        {action && <div className="flex flex-wrap gap-2">{action}</div>}
      </div>
      {toggle && <SpeciesToggle className="self-start" />}
    </div>
  );
}
