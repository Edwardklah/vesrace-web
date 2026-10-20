import { ViewTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { eventMediaName } from "@/lib/transitions";
import { FallbackCover } from "@/components/events/fallback-cover";
import type { EventDetail } from "@/lib/types";

/**
 * Event page hero: the artwork full-width with the logo's slant on its lower
 * edge, and the event name set over it. The media box carries the same
 * view-transition name as the event's card, so opening a card morphs its
 * photo into this hero.
 */
export function EventHero({ event }: { event: EventDetail }) {
  return (
    <section className="relative isolate text-white">
      <ViewTransition name={eventMediaName(event.id)} share="morph" default="none">
        <div className="crop-slant relative h-[26rem] overflow-hidden bg-ink-950 [--slant-crop:2.5rem] md:h-[34rem] md:[--slant-crop:5rem]">
          {event.imageUrl ? (
            <Image
              src={event.imageUrl}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-[50%_30%]"
            />
          ) : (
            <FallbackCover
              name={event.name}
              category={event.category}
              iso={event.startsAt}
              timeZone={event.timeZone}
              size="hero"
              className="h-full w-full [&_p]:invisible"
            />
          )}
          {/* Top scrim for the header, bottom scrim for the title. */}
          <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-ink-1000/70 to-transparent" aria-hidden />
          <div className="absolute inset-x-0 bottom-0 h-3/4 bg-linear-to-t from-ink-1000/85 via-ink-1000/40 to-transparent" aria-hidden />
        </div>
      </ViewTransition>

      <div className="absolute inset-x-0 bottom-0 pb-14 md:pb-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <Link
            href="/#discover"
            transitionTypes={["nav-back"]}
            className="animate-rise mb-5 inline-flex h-10 items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 text-small font-semibold text-white hover:bg-white/20"
          >
            <ArrowLeft className="size-4" aria-hidden />
            All events
          </Link>
          <p className="animate-rise text-overline text-teal-300 [--delay:60ms]">
            {event.category} · {event.city}
          </p>
          <h1 className="animate-rise mt-3 max-w-4xl text-display text-balance [--delay:120ms]">
            {event.name}
          </h1>
        </div>
      </div>
    </section>
  );
}
