import { AS_OF } from "@/data/sample-dashboard";
import { formatMoney } from "@/lib/format";

/** Organiser timezone. The sample organiser is in Ghana. */
export const ORG_TZ = "Africa/Accra";

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: ORG_TZ, ...opts });
const dayMonth = fmt({ day: "numeric", month: "short" });
const weekdayDay = fmt({ weekday: "short", day: "numeric" });
const weekdayDayMonth = fmt({ weekday: "short", day: "numeric", month: "short" });
const time = fmt({ hour: "numeric", minute: "2-digit", hour12: true });

// en-GB writes September as "Sept"; use three letters like every other month.
const tidy = (s: string) => s.replace("Sept", "Sep");
const noComma = (s: string) => tidy(s.replace(",", ""));

/** "21 Sep" */
export const shortDay = (day: string) => tidy(dayMonth.format(new Date(day)));
/** "Wed 14" */
export const weekdayShort = (day: string) => noComma(weekdayDay.format(new Date(day)));
/** "Wed 14 Oct" */
export const longDay = (day: string) => noComma(weekdayDayMonth.format(new Date(day)));
/** "1:05 PM" */
export const clock = (iso: string) => time.format(new Date(iso)).toUpperCase();

/** "Today, 12:58 PM", "Yesterday, 3:10 PM" or "Thu 15 Oct, 9:12 AM", relative to the sample's day. */
export function whenPlaced(iso: string) {
  const day = iso.slice(0, 10);
  const yesterday = new Date(Date.parse(AS_OF) - 86_400_000).toISOString().slice(0, 10);
  const label = day === AS_OF ? "Today" : day === yesterday ? "Yesterday" : longDay(day);
  return `${label}, ${clock(iso)}`;
}

/** Whole cedis for cards and axes: "GH₵ 141,300". Pesewas are shown in tables. */
export const cedis = (amountMinor: number) => formatMoney({ amountMinor, currency: "GHS" }, { compact: true, freeLabel: false });
export const money = (amountMinor: number) => formatMoney({ amountMinor, currency: "GHS" }, { freeLabel: false });

/** Axis labels: "GH₵ 12k". */
export function cedisShort(amountMinor: number) {
  const c = amountMinor / 100;
  if (c >= 1000) return `GH₵ ${Number.isInteger(c / 1000) ? c / 1000 : (c / 1000).toFixed(1)}k`;
  return `GH₵ ${c}`;
}

export const count = (n: number) => n.toLocaleString("en-GH");

/** Change against the previous period, as a whole percentage. */
export function trend(now: number, before: number | undefined) {
  if (before === undefined || before === 0) return null;
  return Math.round(((now - before) / before) * 100);
}
