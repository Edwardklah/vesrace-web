import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, CalendarDays, Clock, ExternalLink, MapPin } from "lucide-react";
import { EventHero } from "@/components/event/event-hero";
import { ShareButton } from "@/components/event/share-button";
import { TicketPurchase } from "@/components/event/ticket-purchase";
import { EventCard } from "@/components/events/event-card";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getAllEventSlugs, getEventBySlug, getRelatedEvents } from "@/data/sample-event-details";
import { eventDateParts } from "@/lib/format";

// Every sample event is prerendered at build time.
export function generateStaticParams() {
  return getAllEventSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/events/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event) return { title: "Event not found" };
  return {
    title: event.name,
    description: `${event.name} at ${event.venueName}, ${event.city}. Get tickets on Vesrace.`,
  };
}

/** "7:00 PM" in the event's own timezone. */
function time(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "numeric", minute: "2-digit", hour12: true })
    .format(new Date(iso))
    .toUpperCase();
}

function longDate(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

export default async function EventPage({ params }: PageProps<"/events/[slug]">) {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event) notFound();

  const related = getRelatedEvents(event);
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venueName}, ${event.address}, Ghana`)}`;
  const { day, month } = eventDateParts(event.startsAt, event.timeZone);

  /* Key facts: date, venue, organiser. Rendered on the server. */
  const facts = (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex gap-4 rounded-lg border border-line bg-surface p-4">
          <div className="slant-box grid h-14 w-12 shrink-0 place-items-center rounded-[4px] bg-ink-950 text-white dark:ring-1 dark:ring-white/12">
            <span className="unslant flex flex-col items-center leading-none">
              <span className="font-display text-[1.5rem] font-[850] italic tabular">{day}</span>
              <span className="mt-0.5 text-[0.625rem] font-semibold tracking-[0.14em]">{month}</span>
            </span>
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-overline text-fg-muted">
              <CalendarDays className="size-3.5" aria-hidden /> Date and time
            </p>
            <p className="mt-1 font-semibold">{longDate(event.startsAt, event.timeZone)}</p>
            <p className="flex items-center gap-1.5 text-small text-fg-muted tabular">
              <Clock className="size-3.5" aria-hidden />
              {time(event.startsAt, event.timeZone)} – {time(event.endsAt, event.timeZone)}
            </p>
          </div>
        </div>

        <div className="flex gap-4 rounded-lg border border-line bg-surface p-4">
          <div className="grid h-14 w-12 shrink-0 place-items-center rounded-md bg-primary-soft text-primary-soft-fg">
            <MapPin className="size-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-overline text-fg-muted">Venue</p>
            <p className="mt-1 font-semibold">{event.venueName}</p>
            <p className="text-small text-fg-muted">{event.address}</p>
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-small font-semibold text-primary-ink hover:underline"
            >
              Open in Maps <ExternalLink className="size-3.5" aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-small text-fg-muted">
          <BadgeCheck className="size-4 text-primary-ink" aria-hidden />
          Hosted by <span className="font-semibold text-fg">{event.organiser.name}</span>
        </p>
        <ShareButton title={event.name} />
      </div>
    </div>
  );

  const info = (
    <>
      <section aria-labelledby="about-title" className="max-w-2xl">
        <h2 id="about-title" className="text-h1">
          About this event
        </h2>
        <div className="mt-4 grid gap-4 text-body-lg text-fg-muted">
          {event.description.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>

      <section aria-labelledby="know-title">
        <h2 id="know-title" className="text-h1">
          Good to know
        </h2>
        {/* Hairline grid; an odd last item spans both columns so no empty cell shows. */}
        <dl className="mt-5 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 sm:[&>div:last-child:nth-child(odd)]:col-span-2">
          {event.goodToKnow.map((g) => (
            <div key={g.label} className="bg-surface p-4">
              <dt className="text-overline text-fg-muted">{g.label}</dt>
              <dd className="mt-1 text-body">{g.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="org-title" className="rounded-lg bg-surface-muted p-6">
        <p className="text-overline text-fg-muted">Organiser</p>
        <h2 id="org-title" className="mt-2 text-h3">
          {event.organiser.name}
        </h2>
        <p className="mt-1 max-w-xl text-small text-fg-muted">{event.organiser.about}</p>
        <p className="mt-3 text-caption text-fg-muted">{event.organiser.eventsHosted} events hosted on Vesrace</p>
      </section>
    </>
  );

  return (
    <>
      <SiteHeader overHero />
      <main>
        <EventHero event={event} />
        <TicketPurchase event={event} before={facts} after={info} />

        {related.length > 0 && (
          <section id="more" aria-labelledby="more-title" className="scroll-mt-24 border-t border-line">
            <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20">
              <p className="text-overline text-primary-ink">You might also like</p>
              <h2 id="more-title" className="mt-2 mb-8 text-h1">
                More events
              </h2>
              <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-4">
                {related.map((e) => (
                  <li key={e.id}>
                    <EventCard event={e} />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
