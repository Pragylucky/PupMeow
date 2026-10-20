import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Field, controlClasses, describedBy } from "./field";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  hint?: React.ReactNode;
  error?: string;
  labelHidden?: boolean;
  wrapperClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { id, name, label, options, placeholder, hint, error, labelHidden, className, wrapperClassName, required, ...props },
  ref,
) {
  const inputId = id ?? name ?? label.toLowerCase().replace(/\W+/g, "-");
  return (
    <Field id={inputId} label={label} hint={hint} error={error} required={required} labelHidden={labelHidden} className={wrapperClassName}>
      <div className="relative">
        <select
          ref={ref}
          id={inputId}
          name={name}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, hint, error)}
          className={cn(controlClasses, "appearance-none pr-10", className)}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
      </div>
    </Field>
  );
});
