"use client";

import { forwardRef, useState, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Field, controlClasses, describedBy } from "./field";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: React.ReactNode;
  error?: string;
  labelHidden?: boolean;
  showCount?: boolean;
  wrapperClassName?: string;
  action?: React.ReactNode;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { id, name, label, hint, error, labelHidden, showCount = true, maxLength, className, wrapperClassName, onChange, value, defaultValue, required, action, ...props },
  ref,
) {
  const inputId = id ?? name ?? label.toLowerCase().replace(/\W+/g, "-");
  const [internal, setInternal] = useState(String(defaultValue ?? ""));
  const length = value !== undefined ? String(value).length : internal.length;
  return (
    <Field id={inputId} label={label} hint={hint} error={error} required={required} labelHidden={labelHidden} className={wrapperClassName}>
      <textarea
        ref={ref}
        id={inputId}
        name={name}
        maxLength={maxLength}
        value={value}
        defaultValue={defaultValue}
        required={required}
        onChange={(e) => {
          if (value === undefined) setInternal(e.target.value);
          onChange?.(e);
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(inputId, hint, error)}
        className={cn(controlClasses, "min-h-28 resize-y leading-relaxed", className)}
        {...props}
      />
      {(showCount && maxLength) || action ? (
        <div className="flex items-center justify-between gap-2">
          <div>{action}</div>
          {showCount && maxLength ? (
            <span className={cn("text-xs tabular-nums", length > maxLength * 0.9 ? "text-warning font-bold" : "text-muted")} aria-live="polite">
              {length}/{maxLength}
            </span>
          ) : null}
        </div>
      ) : null}
    </Field>
  );
});
