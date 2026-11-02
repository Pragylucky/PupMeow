/** How often common treatments repeat, and shortcuts for picking the next due date. */

/** Rough repeat interval in months, or null when it doesn't usually repeat. */
export function repeatMonthsFor(title: string, type: string): number | null {
  const t = title.toLowerCase();
  if (type === "weight" || type === "vet_visit") return null;
  if (/tick|flea/.test(t)) return 1;
  if (/deworm/.test(t)) return 3;
  if (/rabies|dhpp|lepto|fvrcp|annual|booster|vaccin/.test(t) || type === "vaccination") return 12;
  return null;
}

/** Adds months to a YYYY-MM-DD date (UTC, so the result doesn't shift with the viewer's timezone). */
export function addMonthsIso(iso: string, months: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type DuePreset = { label: string; months?: number; days?: number };
export const DUE_PRESETS: DuePreset[] = [
  { label: "3 weeks", days: 21 },
  { label: "1 month", months: 1 },
  { label: "3 months", months: 3 },
  { label: "6 months", months: 6 },
  { label: "1 year", months: 12 },
];

export function dueFromPreset(fromIso: string, p: DuePreset): string {
  return p.months ? addMonthsIso(fromIso, p.months) : addDaysIso(fromIso, p.days ?? 0);
}

/** The preset that matches a treatment's usual repeat interval, if any. */
export function suggestedPreset(title: string, type: string): DuePreset | null {
  const m = repeatMonthsFor(title, type);
  return m ? (DUE_PRESETS.find((p) => p.months === m) ?? null) : null;
}
