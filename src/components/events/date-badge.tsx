import { cn } from "@/lib/cn";
import { eventDateParts } from "@/lib/format";

/**
 * Compact slanted date badge, borrowing the logo's angle.
 * The box is skewed; the text inside is un-skewed so it stays upright.
 */
export function DateBadge({
  iso,
  timeZone,
  className,
}: {
  iso: string;
  timeZone: string;
  className?: string;
}) {
  const { weekday, day, month } = eventDateParts(iso, timeZone);
  return (
    <div
      className={cn(
        "slant-box inline-flex flex-col items-center rounded-[4px] bg-ink-950 px-3 pt-1.5 pb-1 text-white shadow-e2 dark:ring-1 dark:ring-white/12",
        className,
      )}
    >
      <span className="unslant flex flex-col items-center">
        <span className="text-[0.625rem] leading-none font-semibold tracking-[0.14em] text-teal-300">
          {weekday}
        </span>
        <span className="font-display text-[1.75rem] leading-[1] font-[850] italic tabular [font-variation-settings:'wdth'_86]">
          {day}
        </span>
        <span className="text-[0.625rem] leading-none font-semibold tracking-[0.14em]">{month}</span>
      </span>
    </div>
  );
}
