import { forwardRef, type ButtonHTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

type Variant = "primary" | "teal" | "secondary" | "violet" | "outline" | "ghost" | "danger" | "whatsapp" | "white" | "soft" | "dim" | "danger-ghost";
type Size = "sm" | "md" | "lg" | "icon" | "icon-sm";

const base =
  "inline-flex items-center justify-center gap-2 font-bold whitespace-nowrap select-none [&_svg]:shrink-0 transition-[background-color,box-shadow,transform,color,border-color] active:translate-y-px disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary";

const variants: Record<Variant, string> = {
  primary: "bg-strong text-on-strong hover:opacity-90",
  teal: "bg-primary text-on-primary hover:bg-primary-strong",
  secondary: "bg-secondary text-on-secondary hover:bg-secondary-strong",
  violet: "bg-cat text-white hover:bg-cat-strong",
  outline: "border-2 border-border bg-surface text-text hover:border-text",
  ghost: "bg-transparent text-text hover:bg-surface-2",
  danger: "bg-danger text-white hover:bg-danger-strong",
  whatsapp: "bg-whatsapp text-on-whatsapp hover:bg-whatsapp-strong",
  white: "bg-white text-ink hover:bg-cream",
  soft: "bg-surface-2 text-text hover:bg-border",
  dim: "bg-black/25 text-white hover:bg-black/35",
  "danger-ghost": "bg-transparent text-danger hover:bg-danger-soft",
};

const sizes: Record<Size, string> = {
  sm: "h-11 min-h-[44px] px-3.5 text-sm rounded-full",
  md: "h-11 px-5 text-[0.95rem] rounded-full",
  lg: "h-12 px-6 text-base rounded-full",
  icon: "h-11 w-11 rounded-full",
  "icon-sm": "h-11 min-h-[44px] w-11 min-w-[44px] rounded-full",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, className, children, disabled, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
});

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function ButtonLink({
  href, variant = "primary", size = "md", className, children, ...rest
}: { href: string; variant?: Variant; size?: Size; className?: string; children: React.ReactNode } & Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"
>) {
  const external = /^https?:|^tel:|^mailto:/.test(href);
  if (external) {
    return (
      <a href={href} className={buttonClasses(variant, size, className)} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={buttonClasses(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
