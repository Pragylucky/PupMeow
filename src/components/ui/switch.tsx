"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function Switch({
  name, label, description, defaultChecked, checked, onCheckedChange, disabled, className,
}: {
  name?: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onCheckedChange?: (v: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [internal, setInternal] = useState(Boolean(defaultChecked));
  const on = checked ?? internal;
  const id = `${name ?? label.replace(/\W+/g, "-").toLowerCase()}-switch`;
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <span className="flex flex-col">
        <label htmlFor={id} className="text-sm font-bold">{label}</label>
        {description && <span className="text-xs text-muted">{description}</span>}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={() => {
          const next = !on;
          if (checked === undefined) setInternal(next);
          onCheckedChange?.(next);
        }}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50",
          on ? "bg-primary" : "bg-muted/35",
        )}
      >
        <span className={cn("absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform", on && "translate-x-5")} />
      </button>
      {name && <input type="hidden" name={name} value={on ? "true" : "false"} />}
    </div>
  );
}
