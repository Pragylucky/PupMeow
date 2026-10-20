import { cn } from "@/lib/utils";

/** Rubber-stamp label: REUNITED, ADOPTED, FREE ADOPTION… */
export function Stamp({ children, tone = "violet", className, rotate = -6 }: { children: React.ReactNode; tone?: "violet" | "green" | "red" | "ink" | "teal"; className?: string; rotate?: number }) {
  const tones = {
    violet: "border-cat text-cat",
    green: "border-success text-success",
    red: "border-danger text-danger",
    ink: "border-ink text-ink",
    teal: "border-primary text-primary",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[0.6rem] border-[3px] bg-paper px-2.5 py-0.5 font-heading text-[0.95rem] font-bold uppercase tracking-[0.08em] shadow-[inset_0_0_0_2px_var(--pm-paper),inset_0_0_0_3.5px_currentColor]",
        tones[tone],
        className,
      )}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {children}
    </span>
  );
}

/** Calendar tile: OCT / 25 */
export function DateTile({ date, className, tone = "red" }: { date: string; className?: string; tone?: "red" | "ink" | "teal" }) {
  const d = new Date(`${date.slice(0, 10)}T00:00:00`);
  const month = d.toLocaleString("en-IN", { month: "short" }).toUpperCase();
  const top = tone === "red" ? "bg-danger" : tone === "teal" ? "bg-primary" : "bg-ink";
  return (
    <span className={cn("inline-flex w-14 shrink-0 -rotate-3 flex-col overflow-hidden rounded-xl bg-white text-center shadow-[0_2px_0_rgb(26_34_51/0.25)] ring-2 ring-ink", className)} aria-hidden>
      <span className={cn("py-0.5 text-[0.7rem] font-extrabold tracking-wider text-white", top)}>{month}</span>
      <span className="pb-1 font-heading text-[1.6rem] font-bold leading-tight text-ink">{d.getDate()}</span>
    </span>
  );
}

/** Numbered steps used in tip cards ("1 Don't chase…"). */
export function Steps({ items, className, tone = "light" }: { items: React.ReactNode[]; className?: string; tone?: "light" | "dark" }) {
  return (
    <ol className={cn("space-y-3", className)}>
      {items.map((it, i) => (
        <li key={i} className="flex gap-3">
          <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.8rem] font-extrabold", tone === "light" ? "bg-white text-ink" : "bg-ink text-white")}>{i + 1}</span>
          <span className="font-semibold leading-snug">{it}</span>
        </li>
      ))}
    </ol>
  );
}

export const SECTION_TONES = {
  lost: "bg-danger text-white",
  adopt: "bg-secondary text-ink",
  play: "bg-cat text-white",
  care: "bg-primary text-white",
  kaia: "bg-cream text-ink",
  ink: "bg-ink text-white",
} as const;
export type SectionTone = keyof typeof SECTION_TONES;

/** Coloured tip card for the right-hand column: short, useful, no empty space. */
export function TipCard({ tone, title, children, footer, className }: { tone: SectionTone; title: string; children: React.ReactNode; footer?: React.ReactNode; className?: string }) {
  return (
    <section className={cn("relative overflow-hidden rounded-[var(--radius-lg)] p-5", SECTION_TONES[tone], tone === "lost" && "halftone", className)}>
      <h2 className="text-[1.45rem] font-semibold leading-tight">{title}</h2>
      <div className="mt-3">{children}</div>
      {footer && <div className="mt-4">{footer}</div>}
    </section>
  );
}

/** Small heading row used inside pages and rails. */
export function SectionTitle({ children, action, className, as: Tag = "h2" }: { children: React.ReactNode; action?: React.ReactNode; className?: string; as?: "h2" | "h3" }) {
  return (
    <div className={cn("mb-3 flex items-end justify-between gap-3", className)}>
      <Tag className="text-[1.4rem] font-semibold leading-tight sm:text-2xl">{children}</Tag>
      {action}
    </div>
  );
}
