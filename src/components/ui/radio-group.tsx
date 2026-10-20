"use client";

import { cn } from "@/lib/utils";

export interface RadioOption {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
}

/** Segmented, pill-style radio group (keyboard: arrow keys via native radios). */
export function RadioGroup({
  name, legend, options, value, defaultValue, onChange, error, className, legendHidden, columns,
}: {
  name: string;
  legend: string;
  options: RadioOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  error?: string;
  className?: string;
  legendHidden?: boolean;
  columns?: number;
}) {
  return (
    <fieldset className={cn("flex flex-col gap-1.5", className)}>
      <legend className={cn("mb-1.5 text-sm font-bold", legendHidden && "sr-only")}>{legend}</legend>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => {
          const id = `${name}-${o.value}`;
          return (
            <label
              key={o.value}
              htmlFor={id}
              className="relative flex cursor-pointer flex-col rounded-[var(--radius-md)] border-2 border-border bg-surface px-3 py-2.5 text-sm transition-colors hover:border-muted/50 has-[:checked]:border-strong has-[:checked]:bg-strong has-[:checked]:text-on-strong has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-primary"
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={o.value}
                className="sr-only"
                {...(value !== undefined ? { checked: value === o.value } : { defaultChecked: defaultValue === o.value })}
                onChange={() => onChange?.(o.value)}
              />
              <span className="font-bold">{o.label}</span>
              {o.description && <span className="text-xs opacity-75">{o.description}</span>}
            </label>
          );
        })}
      </div>
      {error && <p role="alert" className="text-xs font-semibold text-danger">{error}</p>}
    </fieldset>
  );
}
