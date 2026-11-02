import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { daysUntil, dueLabel, todayIso } from "@/lib/utils";
import type { HealthRecordRow, PetRow } from "@/types/database";

/**
 * "Right now" for Kaia: today's date in India, the Delhi pet season, live weather + air quality for the
 * user's city, festival countdowns and which of their pets' vaccines / treatments are due. Computed here
 * because models can't know the date and are unreliable at date maths. Feeds both the chat system prompt
 * and the Kaia page (Today strip + starter questions).
 */

type City = { name: string; lat: number; lon: number };

const CITIES = {
  delhi: { name: "Delhi", lat: 28.6139, lon: 77.209 },
  noida: { name: "Noida", lat: 28.5355, lon: 77.391 },
  greaterNoida: { name: "Greater Noida", lat: 28.4744, lon: 77.504 },
  gurugram: { name: "Gurugram", lat: 28.4595, lon: 77.0266 },
  ghaziabad: { name: "Ghaziabad", lat: 28.6692, lon: 77.4538 },
  faridabad: { name: "Faridabad", lat: 28.4089, lon: 77.3178 },
} satisfies Record<string, City>;

// Gurugram / Ghaziabad localities in NCR_AREAS that don't carry the city's name.
const GURUGRAM_AREAS = new Set(["sohna road", "golf course road", "golf course extension", "palam vihar", "south city", "sushant lok", "nirvana country"]);
const GHAZIABAD_AREAS = new Set(["indirapuram", "vaishali", "kaushambi", "raj nagar extension", "crossings republik"]);

/** Which NCR city's weather to use for a profile area. Defaults to Delhi. */
export function ncrCityFor(area: string | null | undefined): City {
  const a = (area ?? "").trim().toLowerCase();
  if (a.startsWith("greater noida")) return CITIES.greaterNoida;
  if (a.startsWith("noida")) return CITIES.noida;
  if (a.includes("gurugram") || a.includes("gurgaon") || a.startsWith("dlf") || GURUGRAM_AREAS.has(a)) return CITIES.gurugram;
  if (a.includes("ghaziabad") || GHAZIABAD_AREAS.has(a)) return CITIES.ghaziabad;
  if (a.includes("faridabad")) return CITIES.faridabad;
  return CITIES.delhi;
}

/** What a Delhi NCR pet owner should have in mind this month (month is 1–12). */
export function seasonNote(month: number): string {
  if (month >= 4 && month <= 6) return "Peak summer: extreme heat (often 40–47°C), scorching pavements, heatstroke risk; walk only early morning or after sunset; ticks are rising.";
  if (month >= 7 && month <= 9) return "Monsoon: ticks and fleas at their peak, fungal skin and ear infections, leptospirosis from puddles and floodwater, humid heat.";
  if (month === 10 || month === 11) return "Post-monsoon into early winter: Diwali crackers (fireworks anxiety, pets bolting and getting lost), smog and poor air quality building, ticks still around early on.";
  if (month === 12 || month === 1) return "Winter: cold nights and morning fog, severe smog on many days (shorter walks when AQI is bad), joint stiffness in older pets, keep pets away from heaters and bonfires.";
  return "Spring: pleasant walking weather, ticks come back by March, Holi colours (often in March) are toxic to lick, so wipe paws and coats after Holi.";
}

// Festival dates move every year (lunar calendar). Main day of each; add the next year's dates each autumn.
const FESTIVALS: { name: "Diwali" | "Holi"; date: string }[] = [
  { name: "Diwali", date: "2026-11-08" },
  { name: "Holi", date: "2027-03-22" },
  { name: "Diwali", date: "2027-10-29" },
];

export type Festival = { name: "Diwali" | "Holi"; date: string; days: number };

/** The festival within the next 21 days, or one that was up to 3 days ago (crackers and colours linger). */
export function upcomingFestival(now: Date = new Date()): Festival | null {
  for (const f of FESTIVALS) {
    const days = daysUntil(f.date, now);
    if (days >= -3 && days <= 21) return { ...f, days };
  }
  return null;
}

function festivalLine(f: Festival): string {
  const when = new Date(`${f.date}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", timeZone: "UTC" });
  const risk = f.name === "Diwali" ? "fireworks anxiety and pets bolting" : "toxic colours and water balloons";
  if (f.days > 1) return `${f.name} is in ${f.days} days (${when}): expect ${risk} around it.`;
  if (f.days === 1) return `${f.name} is tomorrow (${when}): expect ${risk}.`;
  if (f.days === 0) return `Today is ${f.name}: expect ${risk}.`;
  return `${f.name} was ${-f.days} day${f.days === -1 ? "" : "s"} ago (${when}); ${f.name === "Diwali" ? "crackers often continue for a few days" : "leftover colour can still be on streets and coats"}.`;
}

/** Today's date and time in India, in words. */
export function indiaNowLine(now: Date = new Date()): string {
  const fmt = (o: Intl.DateTimeFormatOptions) => now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", ...o });
  return `Today is ${fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" })}, ${fmt({ hour: "numeric", minute: "2-digit", hour12: true })} India time.`;
}

function indiaMonth(now: Date): number {
  return Number(now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", month: "numeric" }));
}

const WEATHER_WORDS: [number, string][] = [
  [0, "clear sky"], [3, "partly cloudy"], [48, "fog"], [57, "drizzle"], [67, "rain"], [77, "snow"], [82, "rain showers"], [99, "thunderstorm"],
];
function weatherWords(code: number): string {
  return WEATHER_WORDS.find(([max]) => code <= max)?.[1] ?? "unsettled";
}

export function aqiBand(aqi: number): string {
  if (aqi <= 50) return "good";
  if (aqi <= 100) return "moderate";
  if (aqi <= 150) return "unhealthy for sensitive groups";
  if (aqi <= 200) return "unhealthy";
  if (aqi <= 300) return "very unhealthy";
  return "hazardous";
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    // Cached per URL (so per city) for 30 minutes; a slow API never holds anything up for long.
    const res = await fetch(url, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(2500) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

type Forecast = {
  current?: { temperature_2m: number; apparent_temperature: number; relative_humidity_2m: number; weather_code: number };
  daily?: { temperature_2m_min: number[]; temperature_2m_max: number[]; precipitation_probability_max: (number | null)[] };
};
type AirQuality = { current?: { us_aqi: number | null; pm2_5: number | null } };

export type Weather = {
  city: string;
  now?: { temp: number; feels: number; humidity: number; sky: string };
  today?: { min: number; max: number; rain: number | null };
  air?: { aqi: number; band: string; pm25: number | null };
};

/** Live weather + air quality from Open-Meteo (no API key). Null if both calls fail. */
export async function fetchWeather(city: City): Promise<Weather | null> {
  const q = `latitude=${city.lat}&longitude=${city.lon}&timezone=Asia%2FKolkata`;
  const [wx, air] = await Promise.all([
    getJson<Forecast>(
      `https://api.open-meteo.com/v1/forecast?${q}&forecast_days=1&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code&daily=temperature_2m_min,temperature_2m_max,precipitation_probability_max`,
    ),
    getJson<AirQuality>(`https://air-quality-api.open-meteo.com/v1/air-quality?${q}&current=us_aqi,pm2_5`),
  ]);
  const w: Weather = { city: city.name };
  const c = wx?.current;
  if (c) w.now = { temp: Math.round(c.temperature_2m), feels: Math.round(c.apparent_temperature), humidity: Math.round(c.relative_humidity_2m), sky: weatherWords(c.weather_code) };
  const d = wx?.daily;
  if (d?.temperature_2m_max?.length) w.today = { min: Math.round(d.temperature_2m_min[0]), max: Math.round(d.temperature_2m_max[0]), rain: d.precipitation_probability_max[0] ?? null };
  const a = air?.current;
  if (a?.us_aqi != null) w.air = { aqi: Math.round(a.us_aqi), band: aqiBand(a.us_aqi), pm25: a.pm2_5 != null ? Math.round(a.pm2_5) : null };
  return w.now || w.today || w.air ? w : null;
}

function formatWeather(w: Weather): string {
  const parts: string[] = [];
  if (w.now) parts.push(`${w.now.temp}°C (feels like ${w.now.feels}°C), humidity ${w.now.humidity}%, ${w.now.sky}`);
  if (w.today) parts.push(`today ${w.today.min}–${w.today.max}°C${w.today.rain != null ? `, ${w.today.rain}% chance of rain` : ""}`);
  if (w.air) parts.push(`air quality US AQI ${w.air.aqi} (${w.air.band})${w.air.pm25 != null ? `, PM2.5 ${w.air.pm25} µg/m³` : ""}`);
  return `Live weather in ${w.city}: ${parts.join("; ")}.`;
}

/** One-line live weather summary, or null if the API is unavailable. */
export async function weatherLine(city: City): Promise<string | null> {
  const w = await fetchWeather(city);
  return w ? formatWeather(w) : null;
}

type DueRecord = Pick<HealthRecordRow, "pet_id" | "type" | "title" | "next_due_date">;
type MiniPet = Pick<PetRow, "id" | "name" | "species">;

export type DueItem = { pet: string; species: string | null; title: string; type: string; date: string; days: number; label: string };

/** Overdue / upcoming items with the due status already worked out. */
export function dueItems(records: DueRecord[], pets: MiniPet[], now: Date = new Date()): DueItem[] {
  return records
    .filter((r): r is DueRecord & { next_due_date: string } => Boolean(r.next_due_date))
    .map((r) => {
      const pet = pets.find((p) => p.id === r.pet_id);
      return { pet: pet?.name ?? "Your pet", species: pet?.species ?? null, title: r.title, type: r.type, date: r.next_due_date, days: daysUntil(r.next_due_date, now), label: dueLabel(r.next_due_date, now) };
    });
}

function dueLine(d: DueItem): string {
  return `- ${d.species ? `${d.pet} (${d.species})` : d.pet}: ${d.title} (${d.type}), ${d.label} (date ${d.date})`;
}

/** Due items as prompt lines. */
export function dueLines(records: DueRecord[], pets: MiniPet[], now: Date = new Date()): string[] {
  return dueItems(records, pets, now).map(dueLine);
}

export type LiveSnapshot = {
  now: Date;
  month: number;
  weather: Weather | null;
  festival: Festival | null;
  due: DueItem[];
  pets: MiniPet[];
};

/** Loads everything "right now" in parallel. Never throws; missing pieces are left empty. */
export async function loadLiveSnapshot(supabase: SupabaseClient, userId: string, area: string | null | undefined, now: Date = new Date()): Promise<LiveSnapshot> {
  const in30 = new Date(now.getTime() + 30 * 86_400_000).toISOString().slice(0, 10);
  const since = new Date(now.getTime() - 90 * 86_400_000).toISOString().slice(0, 10);
  // People who hide their area keep it in profile_private; it's only used for their own weather here.
  const homeArea = area || ((await supabase.from("profile_private").select("home_area").eq("id", userId).maybeSingle()).data?.home_area as string | null);
  const [weather, petsRes, dueRes] = await Promise.all([
    fetchWeather(ncrCityFor(homeArea)),
    supabase.from("pets").select("id, name, species").eq("owner_id", userId).order("created_at").limit(10),
    supabase
      .from("pet_health_records")
      .select("pet_id, type, title, next_due_date")
      .eq("owner_id", userId)
      .gte("next_due_date", since)
      .lte("next_due_date", in30)
      .order("next_due_date")
      .limit(8),
  ]);
  const pets = (petsRes.data ?? []) as MiniPet[];
  return { now, month: indiaMonth(now), weather, festival: upcomingFestival(now), due: dueItems((dueRes.data ?? []) as DueRecord[], pets, now), pets };
}

/** The "Right now" block for Kaia's system prompt. */
export function liveContextText(s: LiveSnapshot): string {
  const lines = [indiaNowLine(s.now), `Season: ${seasonNote(s.month)}`];
  if (s.festival) lines.push(festivalLine(s.festival));
  lines.push(s.weather ? formatWeather(s.weather) : "Live weather is unavailable right now; go by the season and don't guess temperatures or AQI.");
  if (s.due.length) {
    lines.push(`Overdue or due within 30 days (as of ${todayIso(s.now)}):`, ...s.due.map(dueLine));
  } else if (s.pets.length) {
    lines.push("No vaccines or treatments logged as due in the next 30 days.");
  }
  return lines.join("\n");
}

/** Convenience for the chat route. */
export async function kaiaLiveContext(supabase: SupabaseClient, userId: string, area: string | null | undefined, now: Date = new Date()): Promise<string> {
  return liveContextText(await loadLiveSnapshot(supabase, userId, area, now));
}

const SEASON_STARTERS: Record<"summer" | "monsoon" | "autumn" | "winter" | "spring", string[]> = {
  summer: ["How do I spot heatstroke in my dog?", "Paw-safe walking tips for hot pavements"],
  monsoon: ["How do I protect my pet from ticks this monsoon?", "My dog's paws stay wet after walks. What should I do?"],
  autumn: ["How do I protect my pet's lungs during smog season?", "Are ticks still a problem after the monsoon?"],
  winter: ["Does my dog need a sweater in Delhi winter?", "Smog is bad today. Indoor games for my dog?"],
  spring: ["Ticks are back. Which prevention should I use?", "Best time for long walks this spring?"],
};
const EVERGREEN_STARTERS = ["What should I feed my Indie puppy?", "Vaccination schedule for a kitten in India", "How do I report a lost dog on Pupmeow?"];

function seasonKey(month: number): keyof typeof SEASON_STARTERS {
  if (month >= 4 && month <= 6) return "summer";
  if (month >= 7 && month <= 9) return "monsoon";
  if (month === 10 || month === 11) return "autumn";
  if (month === 12 || month === 1) return "winter";
  return "spring";
}

/** Starter questions for an empty chat: the user's due items, festivals and today's weather first, then the season. */
export function kaiaStarters(s: LiveSnapshot): string[] {
  const out: string[] = [];
  const onlyPet = s.pets.length === 1 ? s.pets[0] : null;
  const dog = s.pets.find((p) => p.species === "dog");
  const overdue = s.due.find((d) => d.days < 0);
  const soon = s.due.find((d) => d.days >= 0 && d.days <= 14);
  if (overdue) out.push(`${overdue.pet}'s ${overdue.title} is ${overdue.label}. What should I do?`);
  if (soon) out.push(`${soon.pet}'s ${soon.title} is ${soon.label}. How do I prepare?`);
  if (s.festival && s.festival.days >= -1) {
    const who = onlyPet?.name ?? "my pet";
    out.push(
      s.festival.name === "Diwali"
        ? s.festival.days > 0 ? `Diwali is in ${s.festival.days} day${s.festival.days === 1 ? "" : "s"}. How do I keep ${who} calm?` : `Crackers are going off. How do I calm ${who} down?`
        : `Holi is coming. Are the colours safe for ${who}?`,
    );
  }
  const w = s.weather;
  const walker = dog?.name ?? "my dog";
  if (w?.air && w.air.aqi > 150) out.push(`AQI is ${w.air.aqi} in ${w.city} today. Is it safe to walk ${walker}?`);
  else if (w?.today && w.today.max >= 38) out.push(`It's going to be ${w.today.max}°C today. When should I walk ${walker}?`);
  if (w?.today?.rain != null && w.today.rain >= 60) out.push("It's likely to rain today. How do I keep paws clean and tick-free?");
  if (w?.today && w.today.min <= 10) out.push(`It drops to ${w.today.min}°C tonight. Does ${onlyPet?.name ?? "my pet"} need to be kept warm?`);
  out.push(...SEASON_STARTERS[seasonKey(s.month)], ...EVERGREEN_STARTERS);
  return [...new Set(out)].slice(0, 6);
}

export type TodayChip = { icon: "place" | "air" | "festival" | "due"; text: string; tone: "neutral" | "ok" | "warn" | "bad" };

/** Small "Today" strip for the Kaia page. */
export function todayChips(s: LiveSnapshot): TodayChip[] {
  const chips: TodayChip[] = [];
  const w = s.weather;
  if (w?.now) chips.push({ icon: "place", text: `${w.city} · ${w.now.temp}°C, ${w.now.sky}`, tone: "neutral" });
  if (w?.air) chips.push({ icon: "air", text: `AQI ${w.air.aqi} · ${w.air.band}`, tone: w.air.aqi <= 100 ? "ok" : w.air.aqi <= 150 ? "warn" : "bad" });
  if (s.festival) {
    const f = s.festival;
    chips.push({ icon: "festival", text: f.days > 1 ? `${f.name} in ${f.days} days` : f.days === 1 ? `${f.name} tomorrow` : f.days === 0 ? `${f.name} today` : `Just after ${f.name}`, tone: "neutral" });
  }
  const overdue = s.due.filter((d) => d.days < 0).length;
  const soon = s.due.filter((d) => d.days >= 0 && d.days <= 14).length;
  if (overdue) chips.push({ icon: "due", text: `${overdue} overdue for your pets`, tone: "bad" });
  else if (soon) chips.push({ icon: "due", text: `${soon} due in the next 2 weeks`, tone: "warn" });
  return chips;
}
