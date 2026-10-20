import Link from "next/link";
import { ArrowRight, Smartphone, Ticket, Users } from "lucide-react";
import { Discover } from "@/components/home/discover";
import { Hero } from "@/components/home/hero";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import {
  categories,
  cities,
  collections,
  eventsById,
  heroImage,
  sampleEvents,
} from "@/data/sample-events";

export default function HomePage() {
  const credits = Array.from(
    new Set([heroImage.credit, ...sampleEvents.map((e) => e.imageCredit).filter(Boolean)]),
  ) as string[];

  return (
    <>
      <SiteHeader overHero />
      <main>
        <Hero imageUrl={heroImage.url} />
        <Discover
          events={sampleEvents}
          weekend={eventsById(collections.thisWeekend)}
          featured={eventsById(collections.featured)}
          cities={cities}
          categories={categories}
        />

        {/* Organiser call-out: one quiet band, not a marketing page. */}
        <section className="mx-auto max-w-7xl px-4 pb-20 md:px-8">
          <div className="relative isolate overflow-hidden rounded-lg bg-ink-950 px-6 py-10 text-white md:px-12 md:py-14 dark:ring-1 dark:ring-white/10">
            <span aria-hidden className="absolute -top-10 right-24 -z-10 h-[140%] w-24 skew-x-[-12deg] bg-teal-700/40" />
            <span aria-hidden className="absolute -top-10 right-6 -z-10 h-[140%] w-10 skew-x-[-12deg] bg-teal-700/25" />
            <div className="grid gap-8 md:grid-cols-[1.3fr_1fr] md:items-center">
              <div>
                <p className="text-overline text-teal-300">For organisers</p>
                <h2 className="mt-3 text-display text-balance">Selling tickets? Start tonight.</h2>
                <p className="mt-4 max-w-lg text-body-lg text-white/75">
                  Publish your event, sell online and at the door, and scan guests in. You only pay a
                  small flat fee per ticket sold.
                </p>
                <Link
                  href="/style-guide"
                  className="mt-7 inline-flex h-12 items-center gap-2 rounded-md bg-white px-5 font-semibold text-ink-950 transition-colors hover:bg-teal-50"
                >
                  Create an event
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
              <ul className="grid gap-4 text-small text-white/80">
                {[
                  [Smartphone, "Customers pay with MoMo or card"],
                  [Ticket, "Seat maps and general admission"],
                  [Users, "Box office and door staff accounts"],
                ].map(([Icon, text], i) => {
                  const I = Icon as typeof Ticket;
                  return (
                    <li key={i} className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-md bg-white/10">
                        <I className="size-5 text-teal-300" aria-hidden />
                      </span>
                      {text as string}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter photoCredits={credits} />
    </>
  );
}
