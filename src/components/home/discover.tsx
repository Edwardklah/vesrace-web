"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import {
  ArrowRight,
  Ban,
  BriefcaseBusiness,
  Globe,
  Church,
  Drama,
  Laugh,
  MapPin,
  Music,
  PartyPopper,
  Search,
  SearchX,
  Trophy,
  X,
  type LucideIcon,
} from "lucide-react";
import { EventCard } from "@/components/events/event-card";
import { FeaturedEvent } from "@/components/events/featured-event";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { SelectMenu } from "@/components/ui/select-menu";
import { cn } from "@/lib/cn";
import { isInRange, type DateRange } from "@/lib/dates";
import { spring } from "@/lib/motion";
import type { EventCategory, EventSummary } from "@/lib/types";

const categoryIcons: Record<EventCategory, LucideIcon> = {
  Concert: Music,
  Nightlife: PartyPopper,
  Conference: BriefcaseBusiness,
  Faith: Church,
  Comedy: Laugh,
  Sport: Trophy,
  Theatre: Drama,
};

const dateOptions: { value: DateRange; label: string; shortLabel?: string }[] = [
  { value: "any", label: "Any date", shortLabel: "Any" },
  { value: "today", label: "Today" },
  { value: "weekend", label: "This weekend", shortLabel: "Weekend" },
  { value: "month", label: "This month", shortLabel: "Month" },
];

type CategoryFilter = EventCategory | "all";

interface DiscoverProps {
  events: EventSummary[];
  weekend: EventSummary[];
  featured: EventSummary[];
  cities: readonly string[];
  categories: { value: EventCategory; label: string }[];
}

/**
 * Search, filters and the event collections below the hero.
 * With no filters set it shows curated collections; as soon as anything is
 * searched or filtered, the collections give way to a results grid.
 *
 * MOCK: filtering runs in the browser over sample data. With the real API
 * these become query parameters on GET /api/v1/events.
 */
export function Discover({ events, weekend, featured, cities, categories }: DiscoverProps) {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("all");
  const [range, setRange] = useState<DateRange>("any");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [nearCity, setNearCity] = useState<string>(cities[0]);

  const filtering = query.trim() !== "" || city !== "all" || range !== "any" || category !== "all";

  const results = useMemo(() => {
    if (!filtering) return [];
    const now = new Date();
    const q = query.trim().toLowerCase();
    return events
      .filter((e) => (city === "all" ? true : e.city === city))
      .filter((e) => (category === "all" ? true : e.category === category))
      .filter((e) => isInRange(e.startsAt, e.timeZone, range, now))
      .filter((e) =>
        q === ""
          ? true
          : [e.name, e.venueName, e.city, e.organiserName, e.category].some((s) =>
              s.toLowerCase().includes(q),
            ),
      )
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }, [filtering, events, city, category, range, query]);

  const reset = () => {
    setQuery("");
    setCity("all");
    setRange("any");
    setCategory("all");
  };

  const upcomingInCity = events
    .filter((e) => e.city === nearCity)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 4);

  // Events already shown in "This weekend" or "Featured".
  const shownAbove = new Set([...weekend, ...featured.slice(0, 3)].map((e) => e.id));

  const countByCategory = (c: EventCategory) => events.filter((e) => e.category === c).length;

  return (
    <div id="discover" className="relative z-10 scroll-mt-20">
      {/* ---- Search panel, overlapping the hero's slanted edge ---- */}
      <div className="mx-auto -mt-32 max-w-7xl px-4 md:-mt-40 md:px-8">
        {/* CSS entrance, so the search shows before JavaScript has loaded. */}
        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          className="animate-rise rounded-lg border border-line bg-surface-raised p-3 shadow-e3 [--delay:450ms] [--rise:24px] md:p-4"
        >
          <div className="flex flex-col gap-2 md:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">Search events</span>
              <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-fg-muted" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search events or venues"
                className="h-14 w-full rounded-md bg-surface-muted pr-12 pl-12 [&::-webkit-search-cancel-button]:appearance-none text-body text-fg placeholder:text-fg-subtle focus-visible:bg-surface focus-visible:shadow-[0_0_0_2px_var(--primary)] focus-visible:outline-none"
              />
              <AnimatePresence>
                {query && (
                  <m.button
                    type="button"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    transition={spring.pop}
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute top-1/2 right-2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-fg-muted hover:bg-surface-muted hover:text-fg"
                  >
                    <X className="size-4" aria-hidden />
                  </m.button>
                )}
              </AnimatePresence>
            </label>
            <SelectMenu
              className="md:w-64"
              label="City"
              title="Choose a city"
              value={city}
              onChange={setCity}
              leadingIcon={<MapPin className="size-5" aria-hidden />}
              options={[
                {
                  value: "all",
                  label: "All cities",
                  meta: `${events.length} events`,
                  icon: <Globe className="size-4" aria-hidden />,
                },
                ...cities.map((c) => {
                  const n = events.filter((e) => e.city === c).length;
                  return {
                    value: c,
                    label: c,
                    meta: n === 0 ? "None yet" : `${n} ${n === 1 ? "event" : "events"}`,
                    icon: <MapPin className="size-4" aria-hidden />,
                  };
                }),
              ]}
            />
          </div>
          <div className="mt-3 md:max-w-xl">
            <Segmented label="When" options={dateOptions} value={range} onChange={setRange} fill />
          </div>
        </form>

        {/* Category chips: scroll sideways on phones. */}
        <div className="-mx-4 mt-5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
          <Segmented
            label="Category"
            variant="chips"
            value={category}
            onChange={setCategory}
            options={[
              { value: "all", label: "All events" },
              ...categories.map((c) => {
                const Icon = categoryIcons[c.value];
                return { value: c.value, label: c.label, icon: <Icon className="size-4" aria-hidden /> };
              }),
            ]}
          />
        </div>
      </div>

      {/* ---- Results or collections ---- */}
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <AnimatePresence mode="wait" initial={false}>
          {filtering ? (
            <m.section
              key="results"
              aria-label="Search results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={spring.smooth}
              className="py-12"
            >
              <div className="mb-8 flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-h1" aria-live="polite">
                  {results.length} {results.length === 1 ? "event" : "events"}
                </h2>
                <Button variant="ghost" size="sm" icon={<X className="size-4" />} onClick={reset}>
                  Clear filters
                </Button>
              </div>

              {results.length === 0 ? (
                <div className="flex flex-col items-center rounded-lg border border-dashed border-line-strong px-6 py-16 text-center">
                  <SearchX className="size-10 text-fg-subtle" aria-hidden />
                  <p className="mt-4 text-h3">Nothing matches yet</p>
                  <p className="mt-1 max-w-sm text-small text-fg-muted">
                    Try another date or city, or clear the filters to see everything that&apos;s on.
                  </p>
                  <Button className="mt-6" variant="secondary" onClick={reset}>
                    Show all events
                  </Button>
                </div>
              ) : (
                <m.ul layout className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  <AnimatePresence mode="popLayout">
                    {results.map((e, i) => (
                      <m.li
                        key={e.id}
                        layout
                        initial={{ opacity: 0, scale: 0.96, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ ...spring.smooth, delay: Math.min(i, 6) * 0.03 }}
                      >
                        <EventCard event={e} />
                      </m.li>
                    ))}
                  </AnimatePresence>
                </m.ul>
              )}
            </m.section>
          ) : (
            <m.div
              key="collections"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={spring.smooth}
            >
              {/* This weekend */}
              <section className="pt-14 pb-6 md:pt-20" aria-labelledby="weekend-title">
                <SectionHeader
                  id="weekend-title"
                  eyebrow="Sat 24 – Sun 25 Oct"
                  title="This weekend"
                  action={{ label: "See all", onClick: () => setRange("weekend") }}
                />
                <Rail>
                  {weekend.map((e, i) => (
                    <RailItem key={e.id} index={i}>
                      <EventCard event={e} priority={i < 2} />
                    </RailItem>
                  ))}
                </Rail>
              </section>

              {/* Featured */}
              <section className="py-14 md:py-20" aria-labelledby="featured-title">
                <SectionHeader id="featured-title" eyebrow="Hand-picked" title="Featured" />
                <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
                  {featured[0] && <FeaturedEvent event={featured[0]} />}
                  <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-1">
                    {featured.slice(1, 3).map((e) => (
                      <EventCard key={e.id} event={e} />
                    ))}
                  </div>
                </div>
              </section>

              {/* Categories */}
              <section className="py-6" aria-labelledby="cat-title">
                <SectionHeader id="cat-title" eyebrow="Something for every night" title="Browse by category" />
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
                  {/* Categories with no upcoming events are left out. */}
                  {categories.filter((c) => countByCategory(c.value) > 0).map((c, i) => {
                    const Icon = categoryIcons[c.value];
                    const n = countByCategory(c.value);
                    return (
                      <m.li
                        key={c.value}
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-40px" }}
                        transition={{ ...spring.smooth, delay: i * 0.04 }}
                      >
                        <m.button
                          type="button"
                          onClick={() => {
                            setCategory(c.value);
                            document.getElementById("discover")?.scrollIntoView({ behavior: "smooth" });
                          }}
                          whileTap={{ scale: 0.96 }}
                          whileHover="hover"
                          transition={spring.press}
                          className={cn(
                            "group relative flex h-32 w-full flex-col justify-between overflow-hidden rounded-md p-4 text-left",
                            i % 3 === 0 ? "bg-teal-800 text-white" : i % 3 === 1 ? "bg-ink-950 text-white dark:bg-ink-900" : "bg-primary-soft text-primary-soft-fg",
                          )}
                        >
                          <m.span variants={{ hover: { rotate: -8, scale: 1.1 } }} transition={spring.pop} className="inline-flex">
                            <Icon className="size-6" aria-hidden />
                          </m.span>
                          <span>
                            <span className="block font-display text-[1.4rem] leading-none font-[850] italic [font-variation-settings:'wdth'_84]">
                              {c.label}
                            </span>
                            <span className="mt-1 block text-caption opacity-75">
                              {n} {n === 1 ? "event" : "events"}
                            </span>
                          </span>
                          {/* The slant motif: a stripe across the corner. */}
                          <span aria-hidden className="absolute -top-4 -right-6 h-24 w-10 skew-x-[-12deg] bg-current opacity-[0.07]" />
                        </m.button>
                      </m.li>
                    );
                  })}
                </ul>
              </section>

              {/* Upcoming near you */}
              <section className="py-14 md:py-20" aria-labelledby="near-title">
                <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-overline text-primary-ink">Upcoming</p>
                    <h2 id="near-title" className="mt-2 text-h1">
                      Coming up in {nearCity}
                    </h2>
                  </div>
                  <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
                    <Segmented
                      label="City"
                      value={nearCity}
                      onChange={setNearCity}
                      options={cities.map((c) => ({ value: c, label: c }))}
                    />
                  </div>
                </div>
                <AnimatePresence mode="popLayout" initial={false}>
                  <m.ul
                    key={nearCity}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={spring.smooth}
                    className="grid gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-4"
                  >
                    {upcomingInCity.length === 0 ? (
                      <li className="col-span-full rounded-lg border border-dashed border-line-strong p-10 text-center text-fg-muted">
                        <Ban className="mx-auto mb-3 size-8 text-fg-subtle" aria-hidden />
                        No upcoming events in {nearCity} yet.
                      </li>
                    ) : (
                      upcomingInCity.map((e) => (
                        <li key={e.id}>
                          {/* Events already shown above keep the morph there, so names stay unique. */}
                          <EventCard event={e} morph={!shownAbove.has(e.id)} />
                        </li>
                      ))
                    )}
                  </m.ul>
                </AnimatePresence>
              </section>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SectionHeader({
  id,
  eyebrow,
  title,
  action,
}: {
  id: string;
  eyebrow: string;
  title: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <p className="text-overline text-primary-ink">{eyebrow}</p>
        <h2 id={id} className="mt-2 text-h1">
          {title}
        </h2>
      </div>
      {action && (
        <Button
          variant="ghost"
          size="sm"
          onClick={action.onClick}
          className="text-primary-ink"
          icon={null}
        >
          {action.label}
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      )}
    </div>
  );
}

/** Sideways-scrolling row on phones (with snap), a plain grid on desktop. */
function Rail({ children }: { children: React.ReactNode }) {
  return (
    <ul className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-4 px-4 pb-4 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 xl:grid-cols-4">
      {children}
    </ul>
  );
}

// No reveal animation here: this row is near the top of the page and must be
// visible even before JavaScript has loaded.
function RailItem({ children }: { children: React.ReactNode; index: number }) {
  return <li className="w-[80%] shrink-0 snap-start md:w-auto">{children}</li>;
}
