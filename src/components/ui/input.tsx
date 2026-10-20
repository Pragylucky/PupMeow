import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Field, controlClasses, describedBy } from "./field";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: React.ReactNode;
  error?: string;
  labelHidden?: boolean;
  wrapperClassName?: string;
  leading?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { id, name, label, hint, error, labelHidden, wrapperClassName, className, required, leading, ...props },
  ref,
) {
  const inputId = id ?? name ?? label.toLowerCase().replace(/\W+/g, "-");
  return (
    <Field id={inputId} label={label} hint={hint} error={error} required={required} labelHidden={labelHidden} className={wrapperClassName}>
      <div className="relative">
        {leading && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">{leading}</span>}
        <input
          ref={ref}
          id={inputId}
          name={name}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, hint, error)}
          className={cn(controlClasses, leading ? "pl-10" : undefined, className)}
          {...props}
        />
      </div>
    </Field>
  );
});
