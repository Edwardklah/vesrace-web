"use client";

import { ViewTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { m } from "motion/react";
import { ArrowRight, MapPin, Ticket } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatEventDate, formatPriceFrom } from "@/lib/format";
import { pressScale, spring } from "@/lib/motion";
import type { EventSummary } from "@/lib/types";
import { DateBadge } from "./date-badge";
import { eventMediaName } from "@/lib/transitions";
import { FallbackCover } from "./fallback-cover";

/**
 * Large editorial card for the lead featured event: photo fills the card,
 * details sit on a scrim at the bottom, name set in the display face.
 */
export function FeaturedEvent({ event, className }: { event: EventSummary; className?: string }) {
  return (
    <m.article
      whileTap={{ scale: pressScale.card }}
      whileHover="hover"
      transition={spring.press}
      className={cn(
        "group relative isolate flex min-h-[26rem] flex-col justify-end overflow-hidden rounded-lg bg-ink-950 text-white md:min-h-[34rem]",
        className,
      )}
    >
      <ViewTransition name={eventMediaName(event.id)} share="morph" default="none">
      <div className="absolute inset-0 -z-20">
        <m.div className="absolute inset-0" variants={{ hover: { scale: 1.04 } }} transition={spring.smooth}>
          {event.imageUrl ? (
            <Image
              src={event.imageUrl}
              alt=""
              fill
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="object-cover"
            />
          ) : (
            <FallbackCover
              name={event.name}
              category={event.category}
              iso={event.startsAt}
              timeZone={event.timeZone}
              size="hero"
              className="h-full w-full"
            />
          )}
        </m.div>
      </div>
      </ViewTransition>
      <div className="absolute inset-0 -z-10 bg-linear-to-t from-ink-1000/90 via-ink-1000/40 to-transparent" aria-hidden />

      <DateBadge iso={event.startsAt} timeZone={event.timeZone} className="absolute top-5 right-5 scale-110" />

      <div className="p-6 md:p-8">
        <p className="text-overline text-teal-300">Featured · {event.category}</p>
        <h3 className="mt-3 max-w-xl text-display text-balance">
          <Link
            href={`/events/${event.slug}`}
            transitionTypes={["nav-forward"]}
            // Load the event page ahead of the tap, so it opens instantly
            // and the photo can morph into the hero.
            prefetch
            className="after:absolute after:inset-0 focus-visible:outline-none"
          >
            {event.name}
          </Link>
        </h3>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-small text-white/80">
          <span className="tabular">{formatEventDate(event.startsAt, event.timeZone)}</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-4" aria-hidden />
            {event.venueName}, {event.city}
          </span>
        </div>
        <div className="mt-6 flex items-center gap-4">
          <span className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-5 font-semibold text-ink-950">
            <Ticket className="size-5" aria-hidden />
            {formatPriceFrom(event.prices)}
            <m.span variants={{ hover: { x: 4 } }} transition={spring.snappy} className="inline-flex">
              <ArrowRight className="size-4" aria-hidden />
            </m.span>
          </span>
          {event.seating === "assigned" && (
            <span className="text-small text-white/75">Choose your seats</span>
          )}
        </div>
      </div>

      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-transparent ring-inset group-has-[a:focus-visible]:ring-focus"
      />
    </m.article>
  );
}
