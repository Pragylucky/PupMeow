import { afterEach, describe, expect, it, vi } from "vitest";
import { dueLines, indiaNowLine, kaiaStarters, liveContextText, ncrCityFor, seasonNote, todayChips, upcomingFestival, weatherLine, type LiveSnapshot } from "@/lib/ai/live-context";
import { assistantSystemPrompt } from "@/lib/ai/prompts";

// 2 Nov 2026, 10:15 India time.
const NOW = new Date("2026-11-02T04:45:00Z");

describe("ncrCityFor", () => {
  it("maps NCR areas to the right city", () => {
    expect(ncrCityFor("Noida Sec 62").name).toBe("Noida");
    expect(ncrCityFor("Greater Noida West").name).toBe("Greater Noida");
    expect(ncrCityFor("DLF Phase 3").name).toBe("Gurugram");
    expect(ncrCityFor("Golf Course Road").name).toBe("Gurugram");
    expect(ncrCityFor("Indirapuram").name).toBe("Ghaziabad");
    expect(ncrCityFor("Greater Faridabad").name).toBe("Faridabad");
  });

  it("keeps Delhi's Palam apart from Gurugram's Palam Vihar", () => {
    expect(ncrCityFor("Palam").name).toBe("Delhi");
    expect(ncrCityFor("Palam Vihar").name).toBe("Gurugram");
  });

  it("falls back to Delhi", () => {
    expect(ncrCityFor(null).name).toBe("Delhi");
    expect(ncrCityFor("Dwarka").name).toBe("Delhi");
  });
});

describe("seasonNote", () => {
  it("covers every month", () => {
    for (let m = 1; m <= 12; m++) expect(seasonNote(m).length).toBeGreaterThan(20);
  });

  it("flags the big Delhi risks in the right months", () => {
    expect(seasonNote(5)).toMatch(/heat/i);
    expect(seasonNote(8)).toMatch(/tick/i);
    expect(seasonNote(11)).toMatch(/Diwali/);
    expect(seasonNote(1)).toMatch(/smog/i);
  });
});

describe("indiaNowLine", () => {
  it("states the India date and time", () => {
    const line = indiaNowLine(NOW);
    expect(line).toMatch(/Monday/);
    expect(line).toMatch(/2 November 2026/);
    expect(line).toMatch(/10:15/);
  });

  it("uses India's date, not UTC's, just after midnight IST", () => {
    expect(indiaNowLine(new Date("2026-11-01T19:00:00Z"))).toMatch(/2 November 2026/);
  });
});

describe("dueLines", () => {
  const pets = [{ id: "p1", name: "Bruno", species: "dog" as const }];

  it("works out overdue and upcoming items", () => {
    const lines = dueLines(
      [
        { pet_id: "p1", type: "vaccine", title: "Anti-Rabies", next_due_date: "2026-10-30" },
        { pet_id: "p1", type: "deworming", title: "Deworming", next_due_date: "2026-11-07" },
      ] as never,
      pets as never,
      NOW,
    );
    expect(lines[0]).toMatch(/Bruno \(dog\): Anti-Rabies .*3 days overdue/);
    expect(lines[1]).toMatch(/Deworming .*due in 5 days/);
  });

  it("skips records without a due date", () => {
    expect(dueLines([{ pet_id: "p1", type: "vet", title: "Checkup", next_due_date: null }] as never, pets as never, NOW)).toEqual([]);
  });
});

describe("weatherLine", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("formats weather and air quality", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        Response.json(
          url.includes("air-quality")
            ? { current: { us_aqi: 245, pm2_5: 160.4 } }
            : {
                current: { temperature_2m: 24.6, apparent_temperature: 25.2, relative_humidity_2m: 61, weather_code: 45 },
                daily: { temperature_2m_min: [15.2], temperature_2m_max: [28.9], precipitation_probability_max: [0] },
              },
        ),
      ),
    );
    const line = await weatherLine(ncrCityFor("Noida Sec 18"));
    expect(line).toBe(
      "Live weather in Noida: 25°C (feels like 25°C), humidity 61%, fog; today 15–29°C, 0% chance of rain; air quality US AQI 245 (very unhealthy), PM2.5 160 µg/m³.",
    );
  });

  it("returns null when the API is down", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    expect(await weatherLine(ncrCityFor("Delhi"))).toBeNull();
  });
});

describe("upcomingFestival", () => {
  it("counts down to Diwali", () => {
    expect(upcomingFestival(NOW)).toEqual({ name: "Diwali", date: "2026-11-08", days: 6 });
  });

  it("still flags it just after, then lets go", () => {
    expect(upcomingFestival(new Date("2026-11-10T06:00:00Z"))?.days).toBe(-2);
    expect(upcomingFestival(new Date("2026-11-20T06:00:00Z"))).toBeNull();
  });
});

const snapshot = (over: Partial<LiveSnapshot> = {}): LiveSnapshot => ({
  now: NOW,
  month: 11,
  weather: { city: "Noida", now: { temp: 27, feels: 29, humidity: 52, sky: "clear sky" }, today: { min: 19, max: 28, rain: 0 }, air: { aqi: 190, band: "unhealthy", pm25: 101 } },
  festival: { name: "Diwali", date: "2026-11-08", days: 6 },
  due: [{ pet: "Bruno", species: "dog", title: "Anti-Rabies booster", type: "vaccine", date: "2026-10-28", days: -5, label: "5 days overdue" }],
  pets: [{ id: "p1", name: "Bruno", species: "dog" }] as LiveSnapshot["pets"],
  ...over,
});

describe("liveContextText", () => {
  it("puts date, season, festival, weather and due items in the prompt", () => {
    const t = liveContextText(snapshot());
    expect(t).toMatch(/Today is Monday, 2 November 2026/);
    expect(t).toMatch(/Diwali is in 6 days \(8 November\)/);
    expect(t).toMatch(/US AQI 190 \(unhealthy\)/);
    expect(t).toMatch(/Bruno \(dog\): Anti-Rabies booster \(vaccine\), 5 days overdue/);
  });

  it("tells Kaia not to guess when weather is missing", () => {
    expect(liveContextText(snapshot({ weather: null }))).toMatch(/don't guess temperatures/);
  });
});

describe("kaiaStarters", () => {
  it("leads with the user's own situation", () => {
    const s = kaiaStarters(snapshot());
    expect(s[0]).toBe("Bruno's Anti-Rabies booster is 5 days overdue. What should I do?");
    expect(s).toContain("Diwali is in 6 days. How do I keep Bruno calm?");
    expect(s).toContain("AQI is 190 in Noida today. Is it safe to walk Bruno?");
    expect(s).toHaveLength(6);
  });

  it("falls back to seasonal questions with no pets or weather", () => {
    const s = kaiaStarters(snapshot({ pets: [], due: [], weather: null, festival: null }));
    expect(s[0]).toMatch(/smog/i);
    expect(new Set(s).size).toBe(s.length);
  });
});

describe("todayChips", () => {
  it("summarises today with tones", () => {
    expect(todayChips(snapshot())).toEqual([
      { icon: "place", text: "Noida · 27°C, clear sky", tone: "neutral" },
      { icon: "air", text: "AQI 190 · unhealthy", tone: "bad" },
      { icon: "festival", text: "Diwali in 6 days", tone: "neutral" },
      { icon: "due", text: "1 overdue for your pets", tone: "bad" },
    ]);
  });
});

describe("assistantSystemPrompt", () => {
  it("includes the live context and the date rules", () => {
    const p = assistantSystemPrompt({ liveContext: "Today is Monday, 2 November 2026." });
    expect(p).toMatch(/Right now:\nToday is Monday, 2 November 2026\./);
    expect(p).toMatch(/Never say you can't know the date/);
  });
});
