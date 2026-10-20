import Link from "next/link";
import { Building2, MapPin } from "lucide-react";
import { PetImage } from "@/components/brand/pet-image";
import { Stamp } from "@/components/brand/bits";
import { cn, sameNeighbourhood, shortArea, sinceLabel } from "@/lib/utils";
import type { AdoptionRow, LostFoundRow } from "@/types/database";

type LostItem = Pick<LostFoundRow, "id" | "type" | "status" | "pet_name" | "species" | "breed" | "color" | "photo_urls" | "last_seen_area" | "landmark" | "last_seen_date" | "reward_text" | "created_at"> & { reunited_at?: string | null };

export function lostTitle(item: Pick<LostFoundRow, "type" | "pet_name" | "species" | "breed">) {
  const kind = item.species === "dog" ? "dog" : "cat";
  const name = item.pet_name || (item.type === "found" ? `Found ${kind}` : `Lost ${kind}`);
  const breed = item.breed?.replace(/ \/ .*$/, "");
  return breed ? `${name} · ${breed}` : name;
}

/** The signature Lost & Found card: a photocopied street poster. */
export function LostFoundCard({ item, viewerArea, className, size = "md" }: { item: LostItem; viewerArea?: string | null; className?: string; size?: "md" | "sm" }) {
  const reunited = item.status === "reunited";
  const found = item.type === "found";
  const label = reunited ? "HOME" : found ? "FOUND" : "LOST";
  const near = sameNeighbourhood(viewerArea, item.last_seen_area);
  const tone = reunited ? "bg-primary text-on-primary" : found ? "bg-secondary text-ink" : "bg-danger text-white";
  const extra = item.reward_text || item.color || item.landmark;
  return (
    <Link
      href={`/lost/${item.id}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] p-3 shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5 focus-visible:-translate-y-0.5",
        tone,
        !found && "halftone",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2 px-0.5">
        <span className={cn("font-heading font-bold leading-none tracking-[0.04em]", size === "sm" ? "text-[1.6rem]" : "text-[2.1rem]")}>{label}</span>
        <span className={cn("mt-1 max-w-[55%] truncate rounded-full px-2.5 py-1 text-[0.75rem] font-extrabold leading-none", found ? "bg-ink text-white" : "bg-white text-ink")}>
          {near ? "Nearby" : shortArea(item.last_seen_area)}
        </span>
      </div>
      <div className={cn("tape relative mt-2 overflow-hidden rounded-[0.6rem] bg-cream", size === "sm" ? "aspect-[16/10]" : "aspect-[4/3]")}>
        <PetImage
          src={item.photo_urls[0]}
          alt={`${label === "HOME" ? "Reunited" : label} ${item.species}${item.pet_name ? `, ${item.pet_name}` : ""}`}
          species={item.species}
          hints={[item.breed, item.color]}
          seed={item.id}
          tint="#fff1cc"
          sizes="(max-width: 768px) 50vw, 300px"
          className="transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {reunited && <Stamp tone="green" className="absolute bottom-2 right-2 text-[0.8rem]">Reunited</Stamp>}
      </div>
      <div className="mt-2.5 min-w-0 px-0.5">
        <p className={cn("truncate font-heading font-semibold leading-tight", size === "sm" ? "text-[1.05rem]" : "text-[1.2rem]")}>{lostTitle(item)}</p>
        <p className={cn("mt-0.5 truncate text-[0.85rem] font-semibold", found ? "text-ink/80" : "text-white/85")}>
          {item.last_seen_area} · {sinceLabel(reunited ? item.created_at : item.last_seen_date)}
        </p>
        {extra && size === "md" && <p className="mt-0.5 truncate text-[0.85rem] font-extrabold">{extra}</p>}
      </div>
    </Link>
  );
}

function foundIn(from: string, to: string | null | undefined) {
  if (!to) return "a few days";
  const h = Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 3_600_000));
  if (h < 24) return `${h} ${h === 1 ? "hour" : "hours"}`;
  const d = Math.round(h / 24);
  return `${d} ${d === 1 ? "day" : "days"}`;
}

/** One-line reunited / lost row for side columns. */
export function LostRow({ item }: { item: LostItem }) {
  const reunited = item.status === "reunited";
  return (
    <Link href={`/lost/${item.id}`} className="flex items-center gap-3 rounded-[var(--radius-md)] bg-surface p-2.5 shadow-[var(--shadow-card)] hover:ring-2 hover:ring-border">
      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[0.7rem]">
        <PetImage src={item.photo_urls[0]} alt={item.pet_name ?? item.species} species={item.species} hints={[item.breed, item.color]} seed={item.id} sizes="48px" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">{lostTitle(item)}</span>
        <span className="block truncate text-[0.82rem] text-muted">
          {item.last_seen_area} · {reunited ? `found in ${foundIn(item.last_seen_date, item.reunited_at)}` : sinceLabel(item.last_seen_date)}
        </span>
      </span>
    </Link>
  );
}

type AdoptItem = Pick<AdoptionRow, "id" | "pet_name" | "species" | "breed" | "age_text" | "gender" | "vaccinated" | "neutered" | "photo_urls" | "area" | "is_ngo" | "org_name" | "status" | "description">;

export function AdoptionCard({ item, viewerArea, className }: { item: AdoptItem; viewerArea?: string | null; className?: string }) {
  const adopted = item.status === "adopted";
  const near = sameNeighbourhood(viewerArea, item.area);
  const gender = item.gender === "male" ? "M" : item.gender === "female" ? "F" : null;
  const tags = [item.vaccinated && "Owner says vaccinated", item.neutered && "Sterilised"].filter(Boolean) as string[];
  return (
    <Link
      href={`/adopt/${item.id}`}
      className={cn("group flex flex-col overflow-hidden rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5 focus-visible:-translate-y-0.5", className)}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <PetImage src={item.photo_urls[0]} alt={`${item.pet_name}, ${item.species} for adoption`} species={item.species} hints={[item.breed, item.description]} seed={item.id} sizes="(max-width: 768px) 50vw, 300px" className="transition-transform duration-300 group-hover:scale-[1.03]" />
        {near && !adopted && <span className="absolute right-2.5 top-2.5 rounded-full bg-ink px-2.5 py-1 text-[0.75rem] font-extrabold text-white">Nearby</span>}
        {item.is_ngo && !adopted && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[0.75rem] font-extrabold text-ink">
            <Building2 className="h-3.5 w-3.5" aria-hidden /> NGO
          </span>
        )}
        {adopted && <Stamp tone="green" className="absolute bottom-3 right-3">Adopted</Stamp>}
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <p className="truncate font-heading text-[1.25rem] font-semibold leading-tight">{item.pet_name}</p>
        <p className="truncate text-[0.9rem] text-muted">{[item.breed?.replace(/ \/ .*$/, ""), item.age_text, gender].filter(Boolean).join(" · ")}</p>
        <p className="mt-1 flex items-center gap-1 truncate text-[0.85rem] font-bold"><MapPin className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />{item.area}</p>
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((t) => <span key={t} className="rounded-full bg-cream px-2.5 py-1 text-[0.75rem] font-bold text-ink">{t}</span>)}
          </div>
        )}
      </div>
    </Link>
  );
}
