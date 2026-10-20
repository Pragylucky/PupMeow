import { cn } from "@/lib/utils";

/** CSS-only tooltip shown on hover and keyboard focus. The trigger keeps its own accessible name. */
export function Tooltip({ content, children, side = "top", className }: { content: string; children: React.ReactNode; side?: "top" | "bottom"; className?: string }) {
  return (
    <span className={cn("group/tt relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-lg bg-text px-2 py-1 text-xs font-semibold text-background opacity-0 transition-opacity group-hover/tt:opacity-100 group-focus-within/tt:opacity-100",
          side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
        )}
      >
        {content}
      </span>
    </span>
  );
}
