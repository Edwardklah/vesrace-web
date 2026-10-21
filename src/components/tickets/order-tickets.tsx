"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { m } from "motion/react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Mail,
  MessageSquare,
  Search,
  Sun,
  Wallet,
} from "lucide-react";
import { LogoLockup } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { api, type OrderView } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { spring } from "@/lib/motion";
import { SummaryLines } from "@/components/checkout/order-summary";
import { TicketCard } from "./ticket-card";

const ghs = (amountMinor: number) => formatMoney({ amountMinor, currency: "GHS" });

/**
 * Confirmation and ticket view. Shows the tickets straight away, says where
 * copies were sent, and gives the gate tips.
 *
 * MOCK: reads the order from the mock checkout. The real page asks the
 * server, which only shows tickets to the buyer (signed in, or verified by
 * a code sent to their phone).
 */
export function OrderTickets({ orderRef, isNew }: { orderRef: string; isNew: boolean }) {
  const [order, setOrder] = useState<OrderView | null | undefined>(undefined);
  const [index, setIndex] = useState(0);
  const [walletNote, setWalletNote] = useState(false);
  const rail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.checkout.getOrder(orderRef).then(setOrder).catch(() => setOrder(null));
  }, [orderRef]);

  // Keep "Ticket 2 of 3" in step with swiping.
  const onScroll = () => {
    const el = rail.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    if (!card) return;
    setIndex(Math.round(el.scrollLeft / (card.offsetWidth + 16)));
  };
  const go = (i: number) => {
    const el = rail.current;
    const card = el?.children[i] as HTMLElement | undefined;
    if (el && card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: "smooth" });
  };

  const top = (
    <header className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 print:hidden">
      <Link href="/" className="text-fg" aria-label="Vesrace home">
        <LogoLockup className="h-6" />
      </Link>
      <ThemeToggle />
    </header>
  );

  if (order === undefined)
    return (
      <>
        {top}
        <div className="mx-auto grid max-w-md gap-4 px-4 pt-6" aria-busy="true" aria-label="Loading your tickets">
          <div className="h-24 animate-pulse rounded-lg bg-surface-muted" />
          <div className="h-[34rem] animate-pulse rounded-[1.25rem] bg-surface-muted" />
        </div>
      </>
    );

  if (order === null)
    return (
      <>
        {top}
        <main className="mx-auto grid max-w-md justify-items-center px-6 py-16 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-surface-muted">
            <Search className="size-7" aria-hidden />
          </span>
          <h1 className="mt-5 text-h2">We couldn&apos;t find that order</h1>
          <p className="mt-2 text-body text-fg-muted">
            Check the order number in your SMS, or find your tickets with the phone number you used.
          </p>
          <Link
            href="/tickets/find"
            className="mt-7 inline-flex h-13 w-full items-center justify-center rounded-md bg-primary px-6 font-semibold text-primary-fg"
          >
            Find my tickets
          </Link>
        </main>
      </>
    );

  const n = order.tickets.length;
  return (
    <>
      {top}
      <main className="mx-auto max-w-3xl px-4 pb-16">
        {/* Confirmation */}
        <section className="grid justify-items-center pt-4 text-center" aria-labelledby="confirm-title">
          {isNew && (
            <m.span
              initial={{ scale: 0.3, rotate: -30, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={spring.pop}
              className="grid size-14 place-items-center rounded-full bg-success text-white shadow-e2"
            >
              <Check className="size-7" strokeWidth={3} aria-hidden />
            </m.span>
          )}
          <h1 id="confirm-title" className="mt-4 text-h1 italic animate-rise [--rise:12px]">
            {isNew ? "You're going!" : "Your tickets"}
          </h1>
          <p className="mt-2 max-w-md text-body text-fg-muted animate-rise [--delay:80ms] [--rise:12px]">
            {n} {n === 1 ? "ticket" : "tickets"} for {order.eventName}. Order{" "}
            <span className="whitespace-nowrap">{order.ref}</span>
            {order.totalMinor > 0 ? `, ${ghs(order.totalMinor)} paid with ${order.paidWith}.` : "."}
          </p>

          {/* Where copies went */}
          <ul className="mt-5 flex flex-wrap justify-center gap-2 text-caption animate-rise [--delay:140ms] [--rise:12px]">
            <li className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5">
              <MessageSquare className="size-3.5 text-primary-ink" aria-hidden />
              SMS sent to {order.customer.phoneMasked}
              <Check className="size-3.5 text-success" aria-label="sent" strokeWidth={3} />
            </li>
            <li className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5">
              <Mail className="size-3.5 text-primary-ink" aria-hidden />
              {order.customer.emailMasked ? (
                <>
                  Email sent to {order.customer.emailMasked}
                  <Check className="size-3.5 text-success" aria-label="sent" strokeWidth={3} />
                </>
              ) : (
                "No email added"
              )}
            </li>
          </ul>
        </section>

        {/* Tickets: swipe between them */}
        <section aria-label="Tickets" className="mt-8">
          <div
            ref={rail}
            onScroll={onScroll}
            className={cn(
              "-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] print:flex-col print:items-center print:overflow-visible",
              n === 1 && "justify-center",
            )}
          >
            {order.tickets.map((t, i) => (
              <m.div
                key={t.id}
                initial={{ opacity: 0, y: 40, rotate: i === 0 ? 0 : 2 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ ...spring.hero, delay: 0.15 + i * 0.08 }}
                className="w-[min(22rem,calc(100vw-3rem))] shrink-0 snap-center print:break-inside-avoid"
              >
                <TicketCard order={order} ticket={t} index={i} total={n} />
              </m.div>
            ))}
          </div>
          {n > 1 && (
            <div className="mt-1 flex items-center justify-center gap-3 print:hidden">
              <button
                type="button"
                onClick={() => go(Math.max(0, index - 1))}
                disabled={index === 0}
                aria-label="Previous ticket"
                className="grid size-10 place-items-center rounded-full border border-line disabled:opacity-40"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <div className="flex gap-1.5" aria-hidden>
                {order.tickets.map((t, i) => (
                  <m.span
                    key={t.id}
                    animate={{ width: i === index ? 20 : 6 }}
                    transition={spring.snappy}
                    className={cn("h-1.5 rounded-full", i === index ? "bg-primary" : "bg-line-strong")}
                  />
                ))}
              </div>
              <span className="sr-only" aria-live="polite">
                Ticket {index + 1} of {n}
              </span>
              <button
                type="button"
                onClick={() => go(Math.min(n - 1, index + 1))}
                disabled={index >= n - 1}
                aria-label="Next ticket"
                className="grid size-10 place-items-center rounded-full border border-line disabled:opacity-40"
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </div>
          )}
        </section>

        <div className="mx-auto mt-6 grid max-w-md gap-3 print:hidden">
          <p className="flex items-start gap-3 rounded-lg bg-warning-soft p-4 text-small text-warning-fg">
            <Sun className="mt-0.5 size-5 shrink-0" aria-hidden />
            <span>
              <span className="font-semibold">At the gate, turn your screen brightness up</span> and hold the code
              steady. Each code works once, so keep it to yourself.
            </span>
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setWalletNote(true)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-ink-950 px-4 text-small font-semibold text-white dark:bg-white dark:text-ink-950"
            >
              <Wallet className="size-4" aria-hidden /> Add to wallet
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-line-strong px-4 text-small font-semibold hover:bg-surface-muted"
            >
              <Download className="size-4" aria-hidden /> Save as PDF
            </button>
          </div>
          {walletNote && (
            <p role="status" className="rounded-sm bg-info-soft p-2.5 text-caption text-info-fg">
              {/* MOCK: wallet passes are signed by the server (Apple Wallet / Google Wallet). */}
              Design preview: wallet passes need the server to sign them, so they come with the backend.
            </p>
          )}

          <details className="group rounded-lg border border-line bg-surface">
            <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-small font-semibold marker:content-none">
              Order summary
              <ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden />
            </summary>
            <div className="border-t border-line p-4">
              <SummaryLines
                quote={{
                  holdId: "",
                  eventId: order.eventId,
                  lines: order.lines,
                  ticketCount: n,
                  subtotalMinor: order.totalMinor - order.feeMinor,
                  feePerTicketMinor: n ? Math.round(order.feeMinor / n) : 0,
                  feeMinor: order.feeMinor,
                  totalMinor: order.totalMinor,
                  currency: "GHS",
                  expiresAt: 0,
                  serverTime: 0,
                }}
              />
              <p className="mt-3 text-caption text-fg-muted">Paid with {order.paidWith}</p>
            </div>
          </details>

          <p className="text-center text-small text-fg-muted">
            Lost this page? Use{" "}
            <Link href="/tickets/find" className="font-semibold text-primary-ink">
              Find my tickets
            </Link>{" "}
            with{" "}
            {order.customer.phoneMasked} any time.
          </p>
          <Link href={`/events/${order.eventSlug}`} className="mx-auto inline-flex h-11 items-center text-small font-semibold text-primary-ink">
            Back to the event
          </Link>
        </div>
      </main>
    </>
  );
}
