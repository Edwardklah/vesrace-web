import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SeatSelector } from "@/components/seating/seat-selector";
import { getAllEventSlugs, getEventBySlug } from "@/data/sample-event-details";
import { getSeatMap } from "@/data/sample-seat-maps";

export function generateStaticParams() {
  // Only seated events have a seat map; general admission pages redirect.
  return getAllEventSlugs()
    .map((slug) => getEventBySlug(slug))
    .filter((e) => e?.seating === "assigned")
    .map((e) => ({ slug: e!.slug }));
}

export async function generateMetadata({ params }: PageProps<"/events/[slug]/seats">): Promise<Metadata> {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  return { title: event ? `Choose seats · ${event.name}` : "Choose seats" };
}

/** Instant shell with a skeleton; the seat map streams in (see event page). */
export default function SeatsPage({ params }: PageProps<"/events/[slug]/seats">) {
  return (
    <Suspense fallback={<SeatsSkeleton />}>
      <SeatsContent params={params} />
    </Suspense>
  );
}

function SeatsSkeleton() {
  return (
    <div className="flex h-svh flex-col" aria-busy="true" aria-label="Loading seat map">
      <div className="flex h-16 items-center gap-3 border-b border-line px-3 md:px-6">
        <div className="size-11 animate-pulse rounded-full bg-surface-muted" />
        <div className="grid flex-1 gap-1.5">
          <div className="h-4 w-48 animate-pulse rounded bg-surface-muted" />
          <div className="h-3 w-64 animate-pulse rounded bg-surface-muted" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="grid flex-1 place-items-center bg-surface-muted/60">
          <div className="grid w-3/4 max-w-2xl gap-3">
            <div className="mx-auto h-12 w-1/2 animate-pulse rounded bg-surface-muted" />
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-4 animate-pulse rounded-full bg-surface-muted" />
            ))}
          </div>
        </div>
        <div className="hidden w-[24rem] border-l border-line lg:block" />
      </div>
    </div>
  );
}

async function SeatsContent({ params }: { params: PageProps<"/events/[slug]/seats">["params"] }) {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event) notFound();
  // No seat map for general admission, or when nothing can be bought (cancelled,
  // not on sale yet, sales ended, sold out): the event page explains why.
  const closedForSale =
    event.status === "Cancelled" ||
    event.status === "Sold out" ||
    (event.salesState !== undefined && event.salesState !== "open");
  if (event.seating !== "assigned" || closedForSale) redirect(`/events/${slug}`);
  const map = getSeatMap(event.id);
  if (!map) notFound();

  return <SeatSelector event={event} map={map} />;
}
