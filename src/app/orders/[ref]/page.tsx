import { Suspense } from "react";
import type { Metadata } from "next";
import { OrderTickets } from "@/components/tickets/order-tickets";

export const metadata: Metadata = { title: "Your tickets", robots: { index: false } };

/** Order confirmation and tickets. `?new=1` marks the moment right after paying. */
export default function OrderPage({ params, searchParams }: PageProps<"/orders/[ref]">) {
  return (
    <Suspense fallback={<div className="h-16" />}>
      <OrderContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function OrderContent({
  params,
  searchParams,
}: {
  params: PageProps<"/orders/[ref]">["params"];
  searchParams: PageProps<"/orders/[ref]">["searchParams"];
}) {
  const { ref } = await params;
  const sp = await searchParams;
  return <OrderTickets orderRef={ref} isNew={sp.new === "1"} />;
}
