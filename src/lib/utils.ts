import type { Species } from "@/types/database";

/** Join class names, skipping falsy values. */
const TEXT_SIZE = /^text-(xs|sm|base|lg|[2-9]?xl|\[(clamp\(|calc\(|[\d.]+(rem|px|em|vw)\]))/;
const TEXT_OTHER = /^text-(left|center|right|justify|start|end|balance|pretty|wrap|nowrap|ellipsis|clip)$/;
const BG_OTHER = /^bg-(clip|origin|blend|fixed|local|scroll|repeat|no-repeat|cover|contain|auto|center|top|bottom|left|right|none|gradient|linear|radial|conic|\[(url|linear|radial|conic|repeating|size:|length:|position:|image:))/;
const WEIGHT = /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/;

/** Which "slot" a utility fills, so a later class can replace an earlier one (e.g. a className prop). */
function slot(utility: string): string | null {
  if (utility.startsWith("bg-")) return BG_OTHER.test(utility) ? null : "bg";
  if (utility.startsWith("text-")) return TEXT_OTHER.test(utility) ? null : TEXT_SIZE.test(utility) ? "text-size" : "text-color";
  if (WEIGHT.test(utility)) return "font-weight";
  if (/^(block|inline-block|inline|flex|inline-flex|grid|inline-grid|hidden|contents|table)$/.test(utility)) return "display";
  if (/^gap-[xy]-/.test(utility)) return utility.slice(0, 5);
  const m = /^(w|h|size|p|px|py|rounded|shadow|leading|tracking|gap|max-w)(-|$)/.exec(utility);
  if (m) {
    if (m[1] === "rounded" && /^rounded-(t|b|l|r|s|e|tl|tr|bl|br|ss|se|es|ee)(-|$)/.test(utility)) return null;
    if (m[1] === "shadow" && !/^shadow(-(none|2xs|xs|sm|md|lg|xl|2xl|inner)|-\[.*(px|rem|var).*\])?$/.test(utility)) return null;
    return m[1];
  }
  return null;
}

/** Joins class names; when two utilities fill the same slot (same variant), the last one wins. */
export function cn(...classes: Array<string | false | null | undefined>) {
  const tokens = classes.filter(Boolean).join(" ").split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return tokens.join(" ");
  const seen = new Set<string>();
  const out: string[] = [];
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i];
    const cut = t.lastIndexOf(":", t.indexOf("[") === -1 ? undefined : t.indexOf("["));
    const variant = cut >= 0 ? t.slice(0, cut + 1) : "";
    const s = slot(t.slice(cut + 1).replace(/^!/, "").replace(/^-/, ""));
    if (s) {
      const key = variant + s;
      if (seen.has(key)) continue;
      seen.add(key);
    }
    out.push(t);
  }
  return out.reverse().join(" ");
}

export function timeAgo(iso: string, now: Date = new Date()): string {
  const diff = Math.max(0, now.getTime() - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${Math.max(1, m)}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  if (d < 365) return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

export function formatDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
    timeZone: "Asia/Kolkata",
  });
}

/** Whole months between birthday and now. */
export function ageInMonths(birthday: string | null | undefined, now: Date = new Date()): number | null {
  if (!birthday) return null;
  const b = new Date(birthday);
  if (Number.isNaN(b.getTime())) return null;
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  return Math.max(0, months);
}

export function formatAge(birthday: string | null | undefined, now: Date = new Date()): string | null {
  const months = ageInMonths(birthday, now);
  if (months === null) return null;
  if (months < 1) return "under a month";
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m ? `${y} yr ${m} mo` : `${y} year${y === 1 ? "" : "s"}`;
}

/** True if the next birthday is within `days` days (including today). */
export function birthdaySoon(birthday: string | null | undefined, days = 14, now: Date = new Date()): boolean {
  if (!birthday) return false;
  const b = new Date(birthday);
  if (Number.isNaN(b.getTime())) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(today.getFullYear(), b.getMonth(), b.getDate());
  if (next < today) next = new Date(today.getFullYear() + 1, b.getMonth(), b.getDate());
  const diffDays = Math.round((next.getTime() - today.getTime()) / 86_400_000);
  return diffDays <= days;
}

export function speciesEmoji(species: Species | null | undefined) {
  return species === "dog" ? "🐶" : species === "cat" ? "🐱" : "🐾";
}

export function displayName(p: { display_name?: string | null; username?: string | null } | null | undefined) {
  return p?.display_name || (p?.username ? `@${p.username}` : "Pupmeow member");
}

/** Normalise an Indian phone number to 91XXXXXXXXXX for wa.me links. */
export function toWhatsAppNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
}

export function whatsappLink(raw: string, message: string) {
  return `https://wa.me/${toWhatsAppNumber(raw)}?text=${encodeURIComponent(message)}`;
}

export function telLink(raw: string) {
  const n = toWhatsAppNumber(raw);
  return `tel:+${n}`;
}

export function pluralize(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

export function compactNumber(n: number) {
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
}

/** Turn a Postgres / Supabase error into a friendly sentence. */
export function friendlyError(err: { message?: string; code?: string } | null | undefined, fallback = "Something went wrong. Please try again."): string {
  if (!err?.message) return fallback;
  const msg = err.message;
  if (msg.includes("RATE_LIMIT:")) return msg.split("RATE_LIMIT:")[1].trim();
  if (msg.includes("BREEDING_AGE:")) return msg.split("BREEDING_AGE:")[1].trim();
  if (err.code === "23505") return "That already exists.";
  if (err.code === "42501" || msg.includes("row-level security")) return "You don't have permission to do that.";
  if (msg.includes("permission denied")) return "You don't have permission to do that.";
  if (/^[A-Z][^]*\.$/.test(msg) && msg.length < 200 && !msg.includes("violates")) return msg;
  return fallback;
}

/** "just now", "40 mins", "5 hrs", "1 day", "3 days", "2 wks" — friendlier than "5h" on cards. */
export function sinceLabel(iso: string, now: Date = new Date()): string {
  const m = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60000));
  if (m < 2) return "just now";
  if (m < 60) return `${m} mins`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ${h === 1 ? "hr" : "hrs"}`;
  const d = Math.floor(h / 24);
  if (d < 14) return `${d} ${d === 1 ? "day" : "days"}`;
  const w = Math.floor(d / 7);
  if (w < 9) return `${w} wks`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}

/** "Dwarka Sec 10" -> "Dwarka". Used on small chips. */
export function shortArea(area: string | null | undefined): string {
  if (!area) return "Delhi NCR";
  return area.replace(/\s+(Sec(tor)?|Phase|Block)\b.*$/i, "").replace(/\s+[A-Z]\s*Block$/i, "").trim() || area;
}

/** True when two areas are the same neighbourhood (same first word, e.g. Dwarka Sec 7 vs Dwarka Sec 10). */
export function sameNeighbourhood(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return shortArea(a).toLowerCase() === shortArea(b).toLowerCase();
}

/** Time-of-day greeting in India time. */
export function greeting(now: Date = new Date()): string {
  const h = Number(now.toLocaleString("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }));
  if (h < 5) return "Up late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** Days from today (India time) to a YYYY-MM-DD date. Negative when in the past. */
export function daysUntil(date: string, now: Date = new Date()): number {
  const today = new Date(now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) + "T00:00:00Z");
  const d = new Date(date.slice(0, 10) + "T00:00:00Z");
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

export function dueLabel(date: string, now: Date = new Date()): string {
  const n = daysUntil(date, now);
  if (n < -1) return `${-n} days overdue`;
  if (n === -1) return "1 day overdue";
  if (n === 0) return "due today";
  if (n === 1) return "due tomorrow";
  return `due in ${n} days`;
}

/** Today's date (YYYY-MM-DD) in India, identical on server and browser. */
export function todayIso(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}
