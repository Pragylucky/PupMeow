import { cn } from "@/lib/utils";

type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "dog" | "cat" | "accent" | "ink" | "white" | "cream";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-text",
  primary: "bg-primary-soft text-primary-strong",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  dog: "bg-dog text-dog-ink",
  cat: "bg-cat text-cat-ink",
  accent: "bg-accent-soft text-accent",
  ink: "bg-ink text-white",
  white: "bg-white text-ink",
  cream: "bg-cream text-ink",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[0.8rem] font-bold leading-none", tones[tone], className)}>
      {children}
    </span>
  );
}
