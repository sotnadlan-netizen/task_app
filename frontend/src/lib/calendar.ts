import type { Session, Task } from "@/types";

/**
 * Shared calendar helpers used by the dashboard calendar, the unscheduled-task
 * rail, the day-detail panel and the schedule picker. Kept framework-free so the
 * components stay thin and there is a single source of truth for date math.
 */

/** Working hours shown as rows in the week view: 08:00 – 21:00. */
export const WEEK_HOURS = Array.from({ length: 14 }, (_, i) => i + 8);

/** Tailwind background for a task's priority dot. */
export const priorityDot: Record<string, string> = {
  critical: "bg-[#ba0517]",
  high: "bg-[#ea001e]",
  medium: "bg-[#fe9339]",
  low: "bg-[#0070d2]",
};

/** Local YYYY-MM-DD for an ISO timestamp (the calendar groups by local day). */
export const isoToDay = (iso: string) => new Date(iso).toLocaleDateString("sv-SE");

/** Local hour (0–23) for an ISO timestamp. */
export const isoToHour = (iso: string) => new Date(iso).getHours();

/** Today as local YYYY-MM-DD. */
export const todayLocal = () => new Date().toLocaleDateString("sv-SE");

/** A Date's local YYYY-MM-DD. */
export const dateToYMD = (d: Date) => d.toLocaleDateString("sv-SE");

/** Sunday 00:00 of the week containing `anchor`. */
export function startOfWeek(anchor: Date): Date {
  const d = new Date(anchor);
  d.setDate(anchor.getDate() - anchor.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Format a Date as a `datetime-local` value (`YYYY-MM-DDTHH:mm`). */
function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Parse the compact calendar-event format the AI emits (date `YYYYMMDD`,
 * optional time `HHMMSS` / `HHMM`) into a local Date, or null if unparseable.
 * Mirrors the slicing used by `buildGoogleCalendarUrl` in `lib/calendar-url.ts`.
 */
function parseCompactEvent(date: string, time: string | null): Date | null {
  const compact = date.replace(/\D/g, "");
  if (compact.length < 8) return null;
  const year = Number(compact.slice(0, 4));
  const month = Number(compact.slice(4, 6)) - 1;
  const day = Number(compact.slice(6, 8));
  let hour = 9;
  let minute = 0;
  if (time) {
    const tc = time.replace(/\D/g, "");
    if (tc.length >= 2) hour = Number(tc.slice(0, 2));
    if (tc.length >= 4) minute = Number(tc.slice(2, 4));
  }
  const d = new Date(year, month, day, hour, minute, 0, 0);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Suggest a default schedule for a task as a `datetime-local` string, or null
 * when nothing sensible is available (the picker then keeps its own default).
 *
 * Priority: the owning meeting's AI-detected event time → the task deadline (only
 * if it parses as a real date) → none.
 */
export function suggestScheduleForTask(
  task: Task,
  session: Session | null | undefined
): string | null {
  const ev = session?.calendar_event;
  if (ev?.is_detected && ev.suggested_date) {
    const d = parseCompactEvent(ev.suggested_date, ev.suggested_time);
    if (d) return toDatetimeLocal(d);
  }
  if (task.deadline) {
    const d = new Date(task.deadline);
    if (!isNaN(d.getTime())) return toDatetimeLocal(d);
  }
  return null;
}
