"use client";

import Image from "next/image";
import { m } from "motion/react";
import { CalendarClock, Flame, MapPin, Timer, Zap } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatEventDate, formatPriceFrom } from "@/lib/format";
import { pressScale, spring } from "@/lib/motion";
import type { EventSummary, UrgencyLabel } from "@/lib/types";
import { DateBadge } from "./date-badge";
import { FallbackCover } from "./fallback-cover";

function Urgency({ urgency }: { urgency: UrgencyLabel }) {
  const map = {
    "few-left": { icon: Flame, text: "Few left" },
    today: { icon: Zap, text: "Happening today" },
    "starts-soon": { icon: Timer, text: "" },
    "sales-end": { icon: CalendarClock, text: "" },
  } as const;
  const { icon: Icon } = map[urgency.kind];
  const text =
    urgency.kind === "starts-soon"
      ? `Starts in ${urgency.hours} hr${urgency.hours === 1 ? "" : "s"}`
      : urgency.kind === "sales-end"
        ? urgency.text
        : map[urgency.kind].text;
  return (
    <span className="inline-flex items-center gap-1 rounded-sm bg-warning-soft px-1.5 py-0.5 text-caption font-semibold text-warning-fg">
      <Icon className="size-3.5" aria-hidden strokeWidth={2.25} />
      {text}
    </span>
  );
}

export interface EventCardProps {
  event: EventSummary;
  href?: string;
  className?: string;
  /** Pass true for the first few cards on a page so they load immediately. */
  priority?: boolean;
}

/**
 * Event card: image-led, slanted bottom crop, date badge sitting on the
 * slant. (The card-to-hero shared-element transition is added with the
 * event detail page.)
 */
export function EventCard({ event, href = `/events/${event.slug}`, className, priority }: EventCardProps) {
  const soldOut = event.status === "Sold out";
  const price = soldOut ? "Sold out" : formatPriceFrom(event.prices);

  return (
    <m.article
      whileTap={{ scale: pressScale.card }}
      whileHover="hover"
      transition={spring.press}
      className={cn("group relative flex flex-col", className)}
    >
      <div className="relative">
        <div
          className="crop-slant relative aspect-[4/3] overflow-hidden rounded-t-md bg-surface-muted dark:after:pointer-events-none dark:after:absolute dark:after:inset-0 dark:after:rounded-t-md dark:after:ring-1 dark:after:ring-white/8 dark:after:ring-inset"
        >
          <m.div
            className="absolute inset-0"
            variants={{ hover: { scale: 1.045 } }}
            transition={spring.smooth}
          >
            {event.imageUrl ? (
              <Image
                src={event.imageUrl}
                alt=""
                fill
                sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 90vw"
                priority={priority}
                className="object-cover"
              />
            ) : (
              <FallbackCover
                name={event.name}
                category={event.category}
                iso={event.startsAt}
                timeZone={event.timeZone}
                className="h-full w-full"
              />
            )}
          </m.div>
          {soldOut && <div className="absolute inset-0 bg-ink-1000/45" aria-hidden />}
        </div>

        <DateBadge
          iso={event.startsAt}
          timeZone={event.timeZone}
          className="absolute right-4 -bottom-3"
        />
      </div>

      <div className="flex flex-1 flex-col gap-2 pt-3 pr-20">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-overline text-primary-ink">{event.category}</span>
          {event.urgency && !soldOut && <Urgency urgency={event.urgency} />}
        </div>

        <h3 className="text-h3 text-balance">
          {/* The whole card is clickable via this stretched link. */}
          <a href={href} className="after:absolute after:inset-0 focus-visible:outline-none">
            {event.name}
          </a>
        </h3>

        <p className="text-small text-fg-muted tabular">
          {formatEventDate(event.startsAt, event.timeZone)}
        </p>
        <p className="flex items-center gap-1 text-small text-fg-muted">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          {event.venueName}, {event.city}
        </p>
      </div>

      <p
        className={cn(
          "mt-3 text-body font-semibold tabular",
          soldOut ? "text-fg-muted" : "text-fg",
        )}
      >
        {price}
      </p>

      {/* Keyboard focus ring for the stretched link, drawn around the card. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-2 rounded-lg ring-2 ring-transparent group-has-[a:focus-visible]:ring-focus"
      />
    </m.article>
  );
}
