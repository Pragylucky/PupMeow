import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: React.ReactNode;
  description?: React.ReactNode;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { id, name, label, description, error, className, ...props },
  ref,
) {
  const inputId = id ?? `${name}-cb`;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={inputId} className="flex cursor-pointer items-start gap-3">
        <input
          ref={ref}
          id={inputId}
          name={name}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded-md border-2 border-border accent-[var(--pm-primary)]"
          {...props}
        />
        <span className="flex flex-col">
          <span className="text-sm font-semibold">{label}</span>
          {description && <span className="text-xs text-muted">{description}</span>}
        </span>
      </label>
      {error && <p role="alert" className="pl-8 text-xs font-semibold text-danger">{error}</p>}
    </div>
  );
});
