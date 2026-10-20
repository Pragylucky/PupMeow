"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { getTheme, setTheme, type ThemeChoice } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

/** Light / Dark / System. Saved in this browser. */
export function ThemePicker() {
  const [value, setValue] = useState<ThemeChoice>("system");
  useEffect(() => setValue(getTheme()), []);
  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-full bg-surface-2 p-1">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => { setTheme(o.value); setValue(o.value); }}
          className={cn("inline-flex h-10 items-center justify-center gap-2 rounded-full text-sm font-bold transition-colors", value === o.value ? "bg-surface text-text shadow-[0_1px_3px_rgb(26_34_51/0.15)]" : "text-muted hover:text-text")}
        >
          <o.Icon className="h-4 w-4" aria-hidden /> {o.label}
        </button>
      ))}
    </div>
  );
}
