import Image from "next/image";
import { BLUR_DATA_URL } from "@/lib/image";
import { cn } from "@/lib/utils";
import { PetArt, lookFor, tintFor } from "./pet-art";

/**
 * A pet's photo, or (when there is no photo yet) a friendly mascot on a soft tint.
 * Always fills its parent: give the parent a size or an aspect ratio and `relative`.
 */
export function PetImage({
  src, alt, species, hints = [], seed, sizes = "(max-width: 768px) 50vw, 320px", priority, className, artClassName, tint, dim,
}: {
  src?: string | null;
  alt: string;
  species: "dog" | "cat" | null | undefined;
  hints?: (string | null | undefined)[];
  seed?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  artClassName?: string;
  tint?: string;
  dim?: boolean;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
        className={cn("object-cover", dim && "saturate-[.55]", className)}
      />
    );
  }
  const sp = species ?? "dog";
  return (
    <span
      role="img"
      aria-label={alt}
      className={cn("absolute inset-0 flex items-end justify-center overflow-hidden", className)}
      style={{ background: tint ?? tintFor(seed ?? alt) }}
    >
      <PetArt pet={lookFor(sp, hints)} className={cn("h-[82%] w-auto translate-y-[2%]", artClassName)} />
    </span>
  );
}
