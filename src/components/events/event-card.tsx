"use client";

import { ViewTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { m } from "motion/react";
import { CalendarClock, Flame, MapPin, Timer, Zap } from "lucide-react";
import { cn } from "@/lib/cn";
import { eventDateParts, formatEventDate, formatPriceFrom } from "@/lib/format";
import { pressScale, spring } from "@/lib/motion";
import { eventMediaName } from "@/lib/transitions";
import type { EventSummary, UrgencyLabel } from "@/lib/types";
import { DateBadge } from "./date-badge";
import { FallbackCover } from "./fallback-cover";

const shortMonth = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone, month: "short" }).format(new Date(iso));

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
  /**
   * Whether this card's photo morphs into the event page hero when opened.
   * Only one card per event may have it on a page (names must be unique),
   * so pass false for repeats of the same event further down.
   */
  morph?: boolean;
}

/**
 * Event card: image-led, slanted bottom crop, date badge sitting on the
 * slant. Opening it morphs the photo into the event page hero, using
 * React's <ViewTransition> (browsers without support just switch pages).
 */
export function EventCard({
  event,
  href = `/events/${event.slug}`,
  className,
  priority,
  morph = true,
}: EventCardProps) {
  const soldOut = event.status === "Sold out";
  const cancelled = event.status === "Cancelled" || event.notice?.kind === "cancelled";
  const upcoming = event.salesState === "upcoming";
  const unavailable = soldOut || cancelled;
  // What the price line says, in order of importance.
  const price = cancelled
    ? "Cancelled"
    : soldOut
      ? "Sold out"
      : upcoming && event.salesStartsAt
        ? `On sale ${eventDateParts(event.salesStartsAt, event.timeZone).day} ${shortMonth(event.salesStartsAt, event.timeZone)} · ${formatPriceFrom(event.prices)}`
        : event.salesState === "closed"
          ? "Sales ended"
          : formatPriceFrom(event.prices);

  return (
    <m.article
      whileTap={{ scale: pressScale.card }}
      whileHover="hover"
      transition={spring.press}
      className={cn("group relative flex flex-col", className)}
    >
      <div className="relative">
        <ViewTransition name={morph ? eventMediaName(event.id) : undefined} share="morph" default="none">
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
          {unavailable && <div className="absolute inset-0 bg-ink-1000/45" aria-hidden />}
        </div>
        </ViewTransition>

        <DateBadge
          iso={event.startsAt}
          timeZone={event.timeZone}
          className="absolute right-4 -bottom-3"
        />
      </div>

      <div className="flex flex-1 flex-col gap-2 pt-3 pr-20">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-overline text-primary-ink">{event.category}</span>
          {event.urgency && !unavailable && <Urgency urgency={event.urgency} />}
          {event.notice?.kind === "rescheduled" && (
            <span className="inline-flex items-center gap-1 rounded-sm bg-info-soft px-1.5 py-0.5 text-caption font-semibold text-info-fg">
              <CalendarClock className="size-3.5" aria-hidden strokeWidth={2.25} />
              Rescheduled
            </span>
          )}
        </div>

        <h3 className="text-h3 text-balance">
          {/* The whole card is clickable via this stretched link. */}
          <Link
            href={href}
            transitionTypes={["nav-forward"]}
            // Load the event page ahead of the tap, so it opens instantly
            // and the photo can morph into the hero.
            prefetch
            className="after:absolute after:inset-0 focus-visible:outline-none"
          >
            {event.name}
          </Link>
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
          cancelled ? "text-danger" : soldOut || event.salesState === "closed" ? "text-fg-muted" : upcoming ? "text-primary-ink" : "text-fg",
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
