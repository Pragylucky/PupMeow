import { cn } from "@/lib/utils";

/** Label + hint + error wrapper used by every form control. */
export function Field({
  id, label, hint, error, required, children, className, labelHidden,
}: {
  id: string;
  label: string;
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  labelHidden?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className={cn("text-sm font-bold text-text", labelHidden && "sr-only")}>
        {label}
        {required && <span className="text-danger" aria-hidden> *</span>}
      </label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="text-xs text-muted">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export const controlClasses =
  "w-full rounded-[var(--radius-md)] border-2 border-border bg-surface px-4 py-3 text-[0.95rem] text-text placeholder:text-muted/80 transition-colors hover:border-muted/50 focus:border-primary focus:outline-none focus-visible:outline-none aria-[invalid=true]:border-danger disabled:opacity-60";

export function describedBy(id: string, hint?: unknown, error?: unknown) {
  return [error ? `${id}-error` : null, hint && !error ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
}
