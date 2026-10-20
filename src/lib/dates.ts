/**
 * Date-range helpers for the discovery filters.
 *
 * Everything compares *calendar days in the event's own timezone*, so an
 * event at 11:30 PM on Saturday still counts as Saturday wherever the
 * visitor's phone clock is set.
 */

export type DateRange = "any" | "today" | "weekend" | "month";

/** "2026-10-24" for a moment, as seen in `timeZone`. */
function dayKey(date: Date, timeZone: string) {
  // en-CA formats as YYYY-MM-DD, which sorts and compares as plain text.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function weekdayIndex(date: Date, timeZone: string) {
  const name = new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short" }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Is the event inside the range, measured from `now`? Past events never match. */
export function isInRange(iso: string, timeZone: string, range: DateRange, now: Date) {
  const event = new Date(iso);
  if (event.getTime() < now.getTime() - 6 * 60 * 60 * 1000) return false; // ended
  if (range === "any") return true;

  const eventDay = dayKey(event, timeZone);
  const today = dayKey(now, timeZone);

  if (range === "today") return eventDay === today;

  if (range === "month") return eventDay.slice(0, 7) === today.slice(0, 7);

  // Weekend: Friday evening is still "the week" here; we use Saturday and
  // Sunday. If today is Sat or Sun, that's the current weekend.
  const dow = weekdayIndex(now, timeZone);
  const daysToSaturday = dow === 0 ? -1 : 6 - dow;
  const saturday = dayKey(new Date(now.getTime() + daysToSaturday * DAY_MS), timeZone);
  const sunday = dayKey(new Date(now.getTime() + (daysToSaturday + 1) * DAY_MS), timeZone);
  return eventDay === saturday || eventDay === sunday;
}
