"use client";

import Image from "next/image";
import Link from "next/link";
import { m } from "motion/react";
import { ChevronRight, ExternalLink, Plus } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { EventStatusBadge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { AS_OF, daysBetween, toDay, type DashEvent } from "@/data/sample-dashboard";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";
import { cedis, count, longDay, clock } from "./dash-format";

/* Ticket types get shades of the brand colour, darkest = most expensive. */
const shades = ["bg-teal-700 dark:bg-teal-300", "bg-teal-500", "bg-teal-300 dark:bg-teal-700"];

function countdown(day: string) {
  const d = daysBetween(AS_OF, day);
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  return `In ${d} days`;
}

/**
 * Upcoming events with sales against capacity. The bar is split by ticket
 * type (that's the "sales by ticket type" view): each segment's width is
 * that type's capacity, the solid part is what's sold.
 */
export function UpcomingEvents({ events }: { events: DashEvent[] }) {
  return (
    <section aria-labelledby="upcoming-title" className="rounded-lg border border-line bg-surface shadow-e1">
      <div className="flex items-center justify-between gap-3 p-5 pb-3">
        <div>
          <h2 id="upcoming-title" className="text-h3">
            Upcoming events
          </h2>
          <p className="text-caption text-fg-muted">Sold against capacity, all time</p>
        </div>
        <Link href="/dashboard/events" className="inline-flex h-9 items-center gap-1 text-small font-semibold text-primary-ink">
          All events <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>

      <ul>
        {events.map((ev, i) => {
          const capacity = ev.ticketTypes.reduce((n, t) => n + t.capacity, 0);
          const sold = ev.ticketTypes.reduce((n, t) => n + t.sold, 0);
          const gross = ev.ticketTypes.reduce((n, t) => n + t.sold * t.priceMinor, 0);
          const pct = capacity ? Math.round((sold / capacity) * 100) : 0;
          const day = toDay(ev.startsAt);
          return (
            <li key={ev.id} className="border-t border-line">
              <div className="grid gap-4 p-5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] md:items-center md:gap-6">
                {/* Event */}
                <div className="flex min-w-0 items-center gap-4">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-teal-800">
                    {ev.imageUrl ? (
                      <Image src={ev.imageUrl} alt="" fill sizes="56px" className="object-cover" />
                    ) : (
                      <LogoMark className="absolute -right-2 -bottom-1 h-10 text-teal-600/70" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-body font-semibold">{ev.name}</p>
                      <EventStatusBadge status={ev.status} />
                    </div>
                    <p className="mt-0.5 truncate text-caption text-fg-muted">
                      <span className="font-semibold text-fg">{countdown(day)}</span> · {longDay(day)}, {clock(ev.startsAt)} · {ev.venue}
                    </p>
                  </div>
                </div>

                {/* Capacity by ticket type */}
                {ev.ticketTypes.length > 0 ? (
                  <div className="min-w-0">
                    <div className="flex items-baseline justify-between gap-3 text-caption">
                      <span>
                        <span className="text-small font-semibold tabular text-fg">{count(sold)}</span>
                        <span className="text-fg-muted"> of {count(capacity)} sold</span>
                      </span>
                      <span className="font-semibold tabular text-fg-muted">{pct}%</span>
                    </div>
                    <Tooltip
                      asChild
                      side="top"
                      className="flex w-full"
                      content={
                        <span className="grid gap-1.5">
                          {ev.ticketTypes.map((t, k) => (
                            <span key={t.id} className="flex items-center justify-between gap-4">
                              <span className="flex items-center gap-1.5">
                                <span className={cn("size-2 rounded-[2px]", shades[k])} aria-hidden />
                                {t.name}
                              </span>
                              <span className="tabular">
                                {count(t.sold)}/{count(t.capacity)} · {cedis(t.sold * t.priceMinor)}
                              </span>
                            </span>
                          ))}
                        </span>
                      }
                    >
                      <button
                        type="button"
                        className="mt-2 flex h-3 w-full gap-[3px] rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
                        aria-label={`Sales by ticket type for ${ev.name}: ${ev.ticketTypes.map((t) => `${t.name} ${t.sold} of ${t.capacity}`).join(", ")}`}
                      >
                        {ev.ticketTypes.map((t, k) => (
                          <span
                            key={t.id}
                            className="relative h-full overflow-hidden rounded-[3px] bg-surface-muted"
                            style={{ flexGrow: t.capacity, flexBasis: 0 }}
                          >
                            <m.span
                              className={cn("absolute inset-y-0 left-0 -skew-x-12 origin-bottom-left", shades[k])}
                              initial={{ width: 0 }}
                              animate={{ width: `${(t.sold / t.capacity) * 100}%` }}
                              transition={{ ...spring.smooth, delay: 0.2 + i * 0.08 + k * 0.05 }}
                            />
                          </span>
                        ))}
                      </button>
                    </Tooltip>
                    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-caption text-fg-muted">
                      {ev.ticketTypes.map((t, k) => (
                        <li key={t.id} className="flex items-center gap-1.5">
                          <span className={cn("size-2 rounded-[2px]", shades[k])} aria-hidden />
                          {t.name} <span className="tabular">{t.capacity - t.sold === 0 ? "sold out" : `${count(t.capacity - t.sold)} left`}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-caption text-fg-muted">No tickets yet. Add ticket types to start selling.</p>
                )}

                {/* Money and actions */}
                <div className="flex items-center justify-between gap-4 md:justify-end">
                  {ev.ticketTypes.length > 0 ? (
                    <p className="text-left md:text-right">
                      <span className="block text-small font-semibold tabular">{cedis(gross)}</span>
                      <span className="block text-caption text-fg-muted">gross</span>
                    </p>
                  ) : (
                    <Link
                      href="/dashboard/events"
                      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-strong px-3 text-small font-semibold hover:bg-surface-muted"
                    >
                      <Plus className="size-4" aria-hidden /> Add tickets
                    </Link>
                  )}
                  <div className="flex items-center gap-1">
                    {ev.slug && (
                      <Tooltip content="View public page" side="top" asChild touch={false}>
                        <Link
                          href={`/events/${ev.slug}`}
                          aria-label={`View public page for ${ev.name}`}
                          className="grid size-9 place-items-center rounded-md text-fg-muted hover:bg-surface-muted hover:text-fg"
                        >
                          <ExternalLink className="size-4" aria-hidden />
                        </Link>
                      </Tooltip>
                    )}
                    <Link
                      href="/dashboard/events"
                      className="inline-flex h-9 items-center gap-1 rounded-md px-3 text-small font-semibold hover:bg-surface-muted"
                    >
                      Manage <ChevronRight className="size-4" aria-hidden />
                    </Link>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
