import type { CalendarEvent } from "@/types";

export function buildGoogleCalendarUrl(event: CalendarEvent): string {
  const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";
  const params = new URLSearchParams();

  params.set("text", event.title);
  params.set("details", "נוצר אוטומטית מסיכום הפגישה");

  if (event.suggested_date) {
    if (event.suggested_time) {
      const start = `${event.suggested_date}T${event.suggested_time}Z`;
      const endTime = addOneHour(event.suggested_date, event.suggested_time);
      params.set("dates", `${start}/${endTime}`);
    } else {
      // All-day event: YYYYMMDD/YYYYMMDD (same day)
      params.set("dates", `${event.suggested_date}/${event.suggested_date}`);
    }
  }

  if (event.participants && event.participants.length > 0) {
    params.set("add", event.participants.join(","));
  }

  return `${base}&${params.toString()}`;
}

function addOneHour(date: string, time: string): string {
  const year = parseInt(date.slice(0, 4), 10);
  const month = parseInt(date.slice(4, 6), 10) - 1;
  const day = parseInt(date.slice(6, 8), 10);
  const hour = parseInt(time.slice(0, 2), 10);
  const minute = parseInt(time.slice(2, 4), 10);
  const second = parseInt(time.slice(4, 6), 10);

  const d = new Date(Date.UTC(year, month, day, hour, minute, second));
  d.setUTCHours(d.getUTCHours() + 1);

  const pad = (n: number) => String(n).padStart(2, "0");
  const y = d.getUTCFullYear();
  const mo = pad(d.getUTCMonth() + 1);
  const dy = pad(d.getUTCDate());
  const h = pad(d.getUTCHours());
  const mi = pad(d.getUTCMinutes());
  const s = pad(d.getUTCSeconds());

  return `${y}${mo}${dy}T${h}${mi}${s}Z`;
}
