/**
 * Display formatting for money and dates.
 *
 * Money arrives from the API as integer minor units (pesewas for GH₵) plus a
 * currency code. We only ever *format* it here; we never add up prices on the
 * client to decide what someone pays. The backend's totals are authoritative.
 */

export type CurrencyCode = "GHS";

export interface Money {
  /** Integer minor units, e.g. 15000 = GH₵ 150.00 */
  amountMinor: number;
  currency: CurrencyCode;
}

const SYMBOLS: Record<CurrencyCode, string> = { GHS: "GH₵" };
const MINOR_UNITS: Record<CurrencyCode, number> = { GHS: 2 };

interface FormatMoneyOptions {
  /** Drop ".00" on whole amounts (used on event cards: "From GH₵ 80"). */
  compact?: boolean;
  /** Write "Free" instead of "GH₵ 0.00". Default true. */
  freeLabel?: boolean;
}

export function formatMoney(money: Money, options: FormatMoneyOptions = {}) {
  const { compact = false, freeLabel = true } = options;
  if (!Number.isInteger(money.amountMinor)) {
    throw new Error("Money amounts must be integer minor units.");
  }
  if (money.amountMinor === 0 && freeLabel) return "Free";

  const digits = MINOR_UNITS[money.currency];
  const divisor = 10 ** digits;
  const whole = Math.trunc(money.amountMinor / divisor);
  const fraction = Math.abs(money.amountMinor % divisor);

  // Integer maths only: no floating-point rounding surprises.
  const wholeText = Math.abs(whole).toLocaleString("en-GH");
  const fractionText = fraction.toString().padStart(digits, "0");
  const sign = money.amountMinor < 0 ? "−" : "";
  const showFraction = !(compact && fraction === 0);

  return `${sign}${SYMBOLS[money.currency]} ${wholeText}${showFraction ? `.${fractionText}` : ""}`;
}

/** "From GH₵ 80" when ticket prices vary, the single price otherwise. */
export function formatPriceFrom(prices: Money[]) {
  if (prices.length === 0) return "";
  const lowest = prices.reduce((a, b) => (b.amountMinor < a.amountMinor ? b : a));
  const varies = prices.some((p) => p.amountMinor !== lowest.amountMinor);
  if (lowest.amountMinor === 0 && !varies) return "Free";
  const text = formatMoney(lowest, { compact: true });
  return varies ? `From ${text}` : text;
}

/**
 * Event dates are always shown in the *event's* IANA timezone (not the
 * viewer's), in day-month order with 12-hour time:
 *   "Sat 12 Dec 2026, 7:00 PM"
 * Passing locale and timeZone explicitly keeps server and browser output
 * identical, so there's no hydration mismatch.
 */
export function formatEventDate(iso: string, timeZone: string) {
  const date = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const period = get("dayPeriod").toUpperCase();
  return `${get("weekday")} ${get("day")} ${get("month")} ${get("year")}, ${get("hour")}:${get("minute")} ${period}`;
}

/** Pieces for the slanted date badge: { weekday: "SAT", day: "12", month: "DEC" } */
export function eventDateParts(iso: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return {
    weekday: get("weekday").toUpperCase(),
    day: get("day"),
    month: get("month").toUpperCase(),
  };
}

/** Ghana phone formatting for display: "024 123 4567". */
export function formatGhanaPhone(digits: string) {
  const d = digits.replace(/\D/g, "").replace(/^233/, "0").slice(0, 10);
  if (d.length === 0) return "";
  const local = d.startsWith("0") ? d : `0${d}`;
  return [local.slice(0, 3), local.slice(3, 6), local.slice(6, 10)]
    .filter(Boolean)
    .join(" ");
}
