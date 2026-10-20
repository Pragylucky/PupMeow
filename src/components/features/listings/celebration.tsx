import { Stamp } from "@/components/brand/bits";
import { PetArt } from "@/components/brand/pet-art";

/** Happy-ending banner for reunited / adopted. Pure CSS confetti; respects reduced motion. */
export function Celebration({ title, text, stamp = "Reunited", species = "dog" }: { title: string; text: string; stamp?: string; species?: "dog" | "cat" }) {
  const colors = ["#f6b21b", "#e5486a", "#ffffff", "#7a5af5"];
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-lg)] bg-primary p-5 text-on-primary sm:p-6">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-full">
        {Array.from({ length: 22 }).map((_, i) => (
          <span key={i} className="absolute top-0 block h-2.5 w-1.5 rounded-sm" style={{ left: `${(i * 37) % 100}%`, background: colors[i % 4], animation: `pm-confetti ${1.8 + (i % 5) * 0.3}s ${(i % 6) * 0.2}s ease-in infinite` }} />
        ))}
      </div>
      <div className="relative flex items-center gap-4">
        <PetArt pet={species === "dog" ? { species: "dog", look: "golden" } : { species: "cat", look: "orange" }} className="hidden h-20 w-20 shrink-0 sm:block" />
        <div className="min-w-0 flex-1">
          <Stamp tone="green" className="mb-2">{stamp}</Stamp>
          <p className="font-heading text-[1.7rem] font-semibold leading-tight">{title}</p>
          <p className="mt-1 text-on-primary/90">{text}</p>
        </div>
      </div>
    </div>
  );
}
