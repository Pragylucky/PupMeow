import Image from "next/image";
import { cn } from "@/lib/utils";

const sizes = { xs: 24, sm: 32, md: 40, lg: 64, xl: 96 } as const;

export function Avatar({
  src, name, size = "md", className, ring,
}: { src?: string | null; name?: string | null; size?: keyof typeof sizes; className?: string; ring?: boolean }) {
  const px = sizes[size];
  const initials = (name ?? "?").replace(/^@/, "").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "🐾";
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-heading font-semibold text-white",
        ring && "ring-2 ring-surface",
        className,
      )}
      style={{ width: px, height: px, fontSize: px * 0.38 }}
    >
      {src ? (
        <Image src={src} alt={name ? `${name}'s avatar` : "Avatar"} fill sizes={`${px}px`} className="object-cover" />
      ) : (
        <span aria-hidden>{initials}</span>
      )}
    </span>
  );
}
