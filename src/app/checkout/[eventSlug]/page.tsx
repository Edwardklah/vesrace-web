import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Checkout } from "@/components/checkout/checkout";
import { getAllEventSlugs, getEventBySlug } from "@/data/sample-event-details";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export function generateStaticParams() {
  return getAllEventSlugs().map((eventSlug) => ({ eventSlug }));
}

/**
 * Checkout has no site header or footer: one focused page. The URL is read
 * inside <Suspense> so arriving here from the event page is instant.
 */
export default function CheckoutPage({ params }: PageProps<"/checkout/[eventSlug]">) {
  return (
    <Suspense fallback={<div className="h-16 border-b border-line" />}>
      <CheckoutContent params={params} />
    </Suspense>
  );
}

async function CheckoutContent({ params }: { params: PageProps<"/checkout/[eventSlug]">["params"] }) {
  const { eventSlug } = await params;
  const event = getEventBySlug(eventSlug);
  if (!event) notFound();
  return <Checkout event={event} seated={event.seating === "assigned"} />;
}
