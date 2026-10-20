import Link from "next/link";
import { PetImage } from "@/components/brand/pet-image";
import { birthdaySoon, cn, formatAge } from "@/lib/utils";
import type { PetRow } from "@/types/database";

export function PetCard({ pet, href }: { pet: Pick<PetRow, "id" | "name" | "species" | "breed" | "photo_url" | "birthday">; href?: string }) {
  const age = formatAge(pet.birthday);
  return (
    <Link href={href ?? `/pet/${pet.id}`} className="group block overflow-hidden rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5">
      <div className="relative aspect-square overflow-hidden">
        <PetImage src={pet.photo_url} alt={pet.name} species={pet.species} hints={[pet.breed]} seed={pet.id} sizes="(max-width:768px) 50vw, 220px" className="transition-transform duration-300 group-hover:scale-[1.03]" />
        {birthdaySoon(pet.birthday) && <span className="absolute left-2 top-2 rounded-full bg-secondary px-2.5 py-1 text-[0.75rem] font-extrabold text-ink">Birthday soon 🎂</span>}
      </div>
      <div className={cn("p-3", pet.species === "cat" ? "border-t-4 border-cat" : "border-t-4 border-secondary")}>
        <p className="truncate font-heading text-lg font-semibold">{pet.name}</p>
        <p className="truncate text-sm text-muted">{[pet.breed?.replace(/ \/ .*$/, ""), age].filter(Boolean).join(" · ") || (pet.species === "dog" ? "Dog" : "Cat")}</p>
      </div>
    </Link>
  );
}
