import { cn } from "@/lib/utils";

export function Spinner({ size = "md", className, label }: { size?: "sm" | "md" | "lg"; className?: string; label?: string }) {
  const s = size === "sm" ? "h-4 w-4 border-2" : size === "lg" ? "h-9 w-9 border-[3px]" : "h-6 w-6 border-2";
  return (
    <span role={label ? "status" : undefined} aria-label={label} className={cn("inline-flex", className)}>
      <span className={cn("animate-spin rounded-full border-current border-r-transparent", s)} aria-hidden />
    </span>
  );
}
