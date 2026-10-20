"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Field, controlClasses, describedBy } from "./field";

/** Searchable select (ARIA combobox) used for NCR areas and breeds. Free text allowed when `allowCustom`. */
export function Combobox({
  name, label, options, value, defaultValue, onChange, placeholder, error, hint, required, allowCustom = false, wrapperClassName,
}: {
  name: string;
  label: string;
  options: string[];
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  error?: string;
  hint?: React.ReactNode;
  required?: boolean;
  allowCustom?: boolean;
  wrapperClassName?: string;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const [internal, setInternal] = useState(defaultValue ?? "");
  const current = value ?? internal;
  const [query, setQuery] = useState(current);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q && q !== current.toLowerCase() ? options.filter((o) => o.toLowerCase().includes(q)) : options;
    return list.slice(0, 60);
  }, [options, query, current]);

  const commit = (v: string) => {
    if (value === undefined) setInternal(v);
    onChange?.(v);
    setQuery(v);
    setOpen(false);
  };

  return (
    <Field id={id} label={label} error={error} hint={hint} required={required} className={cn("relative", wrapperClassName)}>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && filtered[active] ? `${id}-opt-${active}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          autoComplete="off"
          placeholder={placeholder}
          value={query}
          required={required}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
            if (allowCustom) {
              if (value === undefined) setInternal(e.target.value);
              onChange?.(e.target.value);
            }
          }}
          onBlur={() => {
            setTimeout(() => setOpen(false), 120);
            if (!allowCustom && !options.includes(query)) setQuery(current);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            if (e.key === "Enter" && open && filtered[active]) { e.preventDefault(); commit(filtered[active]); }
            if (e.key === "Escape") setOpen(false);
          }}
          className={cn(controlClasses, "pr-10")}
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <input type="hidden" name={name} value={current} />
      </div>
      {open && filtered.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute top-full z-40 mt-1 max-h-64 w-full overflow-y-auto rounded-[var(--radius-md)] border border-border bg-surface py-1 shadow-[var(--shadow-lift)]"
        >
          {filtered.map((o, i) => (
            <li
              key={o}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={o === current}
              onMouseDown={(e) => { e.preventDefault(); commit(o); }}
              onMouseEnter={() => setActive(i)}
              className={cn("flex cursor-pointer items-center justify-between px-3.5 py-2 text-sm", i === active && "bg-surface-2", o === current && "font-bold text-primary")}
            >
              {o}
              {o === current && <Check className="h-4 w-4" aria-hidden />}
            </li>
          ))}
        </ul>
      )}
    </Field>
  );
}
