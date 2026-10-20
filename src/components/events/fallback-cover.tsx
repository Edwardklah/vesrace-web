import { LogoMark } from "@/components/brand/logo";
import { cn } from "@/lib/cn";
import { eventDateParts } from "@/lib/format";
import type { EventCategory } from "@/lib/types";

/**
 * Branded cover for events with no artwork. It should look designed, not
 * missing: the event name set large in the display face, on a brand tint,
 * with the Vesrace swoosh cropped off the edge.
 *
 * Colourways are picked from the category so a page of fallback covers
 * still has some variety.
 */
const colourways: Record<EventCategory, { bg: string; mark: string; accent: string }> = {
  Concert: { bg: "bg-teal-800", mark: "text-teal-600/60", accent: "text-teal-200" },
  Nightlife: { bg: "bg-ink-950", mark: "text-teal-700/50", accent: "text-teal-300" },
  Conference: { bg: "bg-ink-900", mark: "text-ink-700", accent: "text-teal-300" },
  Faith: { bg: "bg-teal-950", mark: "text-teal-800", accent: "text-teal-200" },
  Comedy: { bg: "bg-teal-700", mark: "text-teal-500/50", accent: "text-teal-100" },
  Sport: { bg: "bg-ink-950", mark: "text-ink-800", accent: "text-teal-300" },
  Theatre: { bg: "bg-teal-900", mark: "text-teal-700", accent: "text-teal-200" },
};

export function FallbackCover({
  name,
  category,
  iso,
  timeZone,
  className,
  size = "card",
}: {
  name: string;
  category: EventCategory;
  iso: string;
  timeZone: string;
  className?: string;
  size?: "card" | "hero";
}) {
  const c = colourways[category];
  const { weekday, day, month } = eventDateParts(iso, timeZone);
  return (
    <div
      className={cn("@container relative isolate overflow-hidden text-white", c.bg, className)}
      role="img"
      aria-label={`${name} cover`}
    >
      {/* Oversized swoosh, cropped off the right edge. */}
      <LogoMark
        title=""
        className={cn(
          "absolute -right-[18%] -bottom-[22%] -z-10 h-[120%] rotate-[-4deg]",
          c.mark,
        )}
      />
      <div
        className={cn(
          "flex h-full flex-col justify-between",
          // On cards, keep clear of the slanted crop and the date badge.
          size === "hero" ? "p-8" : "p-4 pr-16 pb-[calc(var(--slant-crop)+1rem)]",
        )}
      >
        <span className={cn("text-overline", c.accent)}>{category}</span>
        <div>
          <p
            className={cn(
              "font-display font-[850] italic [font-variation-settings:'wdth'_82] leading-[0.95] tracking-[-0.02em] text-balance",
              size === "hero" ? "text-5xl md:text-7xl" : "line-clamp-3 text-[clamp(1.4rem,10.5cqi,2.75rem)]",
            )}
          >
            {name}
          </p>
          {/* Cards already show a date badge, so only the hero repeats the date. */}
          {size === "hero" && (
            <p className={cn("mt-3 text-small font-semibold tracking-[0.1em]", c.accent)}>
              {weekday} {day} {month}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
