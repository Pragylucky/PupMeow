/** Calendar helpers: Google Calendar links and .ics files (Apple Calendar, Outlook, any phone). */
export interface CalendarEvent {
  title: string;
  details?: string;
  location?: string;
  /** YYYY-MM-DD for an all-day event, or an ISO date-time. */
  start: string;
  /** Minutes, for timed events. Defaults to 60. */
  durationMinutes?: number;
}

const isDateOnly = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const ymd = (s: string) => s.replace(/-/g, "");
function nextDay(s: string) {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
function utcStamp(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function googleCalendarUrl(e: CalendarEvent) {
  let dates: string;
  if (isDateOnly(e.start)) dates = `${ymd(e.start)}/${ymd(nextDay(e.start))}`;
  else {
    const s = new Date(e.start);
    const end = new Date(s.getTime() + (e.durationMinutes ?? 60) * 60000);
    dates = `${utcStamp(s)}/${utcStamp(end)}`;
  }
  const p = new URLSearchParams({ action: "TEMPLATE", text: e.title, dates, details: e.details ?? "", location: e.location ?? "", ctz: "Asia/Kolkata" });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

export function icsContent(e: CalendarEvent, uid = `${Date.now()}@pupmeow.in`) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Pupmeow//Reminders//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT", `UID:${uid}`, `DTSTAMP:${utcStamp(new Date())}`];
  if (isDateOnly(e.start)) {
    lines.push(`DTSTART;VALUE=DATE:${ymd(e.start)}`, `DTEND;VALUE=DATE:${ymd(nextDay(e.start))}`);
  } else {
    const s = new Date(e.start);
    lines.push(`DTSTART:${utcStamp(s)}`, `DTEND:${utcStamp(new Date(s.getTime() + (e.durationMinutes ?? 60) * 60000))}`);
  }
  lines.push(`SUMMARY:${esc(e.title)}`);
  if (e.details) lines.push(`DESCRIPTION:${esc(e.details)}`);
  if (e.location) lines.push(`LOCATION:${esc(e.location)}`);
  // A reminder the evening before (all-day) or an hour before (timed).
  lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(e.title)}`, `TRIGGER:${isDateOnly(e.start) ? "-PT15H" : "-PT1H"}`, "END:VALARM");
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(e: CalendarEvent, filename = "pupmeow-reminder.ics") {
  const blob = new Blob([icsContent(e)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
