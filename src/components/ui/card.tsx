import { cn } from "@/lib/utils";

export function Card({ className, as: Tag = "div", ...props }: React.HTMLAttributes<HTMLElement> & { as?: "div" | "article" | "section" | "li" | "aside" }) {
  return <Tag className={cn("rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-card)]", className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center justify-between gap-3 p-4 pb-2", className)} {...props} />;
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}
