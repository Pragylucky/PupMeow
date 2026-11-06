import { cn } from "@/lib/utils";

/** A small cartoon paw that grips the edge of the sign. */
function Paw({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={cn("absolute h-8 w-8 drop-shadow-sm", className)} aria-hidden>
      <ellipse cx="14" cy="16.5" rx="11" ry="9.5" fill="#f6b21b" />
      <circle cx="7.5" cy="9.5" r="2.6" fill="#d99a0f" />
      <circle cx="14" cy="6.8" r="2.6" fill="#d99a0f" />
      <circle cx="20.5" cy="9.5" r="2.6" fill="#d99a0f" />
    </svg>
  );
}

/**
 * A taped paper note a pet "holds" by the edge: "Starting in West Delhi".
 * `paw` picks which edge the paw grips (the side the pet is on), or none for a plain taped note.
 * The outer span floats gently; the inner one carries the tilt so the two animations don't fight.
 */
export function PetSign({ paw = "none", className }: { paw?: "left" | "right" | "none"; className?: string }) {
  return (
    <span className={cn("relative block w-[9.5rem] animate-[pm-float_5s_ease-in-out_infinite]", className)}>
      <span className="relative block -rotate-3">
        <span className="absolute -top-2.5 left-1/2 z-10 h-4 w-14 -translate-x-1/2 rotate-2 rounded-[3px] bg-secondary/80 shadow-sm" aria-hidden />
        <span className="block rounded-lg bg-white px-3 pb-2.5 pt-3.5 text-ink shadow-[0_8px_20px_rgb(26_34_51/0.18)] ring-1 ring-black/5">
          <span className="block text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-primary">Starting in</span>
          <span className="block font-heading text-[1.45rem] font-bold leading-none">West Delhi</span>
          <span className="mt-1 block text-[0.74rem] font-bold leading-tight text-muted">Everyone in NCR welcome 🐾</span>
        </span>
        {paw === "right" && <Paw className="-right-3.5 top-[48%] rotate-12" />}
        {paw === "left" && <Paw className="-left-3.5 top-[48%] -rotate-12 -scale-x-100" />}
      </span>
    </span>
  );
}
