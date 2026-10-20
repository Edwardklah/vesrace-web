"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, m, useAnimationControls } from "motion/react";
import {
  Armchair,
  ArrowRight,
  Ban,
  CalendarClock,
  Check,
  CircleCheck,
  Flame,
  Info,
  Lock,
  Smartphone,
} from "lucide-react";
import { Seat } from "@/components/seating/seat";
import { Button } from "@/components/ui/button";
import { RollingNumber } from "@/components/ui/rolling-number";
import { Stepper } from "@/components/ui/stepper";
import { cn } from "@/lib/cn";
import { formatEventDate, formatMoney, formatPriceFrom, type Money } from "@/lib/format";
import { spring } from "@/lib/motion";
import type { EventDetail, TicketType } from "@/lib/types";

const FEW_LEFT = 20;

/** Availability shown on each ticket row: always text + icon, never colour alone. */
function availability(t: TicketType) {
  if (t.remaining === 0) return { tone: "danger", icon: Ban, text: "Sold out" } as const;
  if (t.remaining !== null && t.remaining <= FEW_LEFT)
    return { tone: "warning", icon: Flame, text: `Few left · ${t.remaining} remaining` } as const;
  if (t.salesEndText) return { tone: "warning", icon: CalendarClock, text: t.salesEndText } as const;
  return { tone: "success", icon: CircleCheck, text: "Available" } as const;
}

const toneClass = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
} as const;

/**
 * Ticket selection for an event page: the ticket list (left column), the
 * sticky purchase panel (right column, desktop) and the sticky bottom bar
 * (phones). Info sections from the server are passed in as `before`/`after`
 * so they render in the left column around the tickets.
 *
 * MOCK: totals here are a preview from the prices the API sent. Checkout
 * asks the server to price the order; that figure is the one that's charged.
 */
export function TicketPurchase({
  event,
  before,
  after,
}: {
  event: EventDetail;
  before: React.ReactNode;
  after: React.ReactNode;
}) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [nudge, setNudge] = useState(false);
  const [mockNote, setMockNote] = useState(false);
  const shake = useAnimationControls();

  const seated = event.seating === "assigned";
  const soldOut = event.status === "Sold out" || event.ticketTypes.every((t) => t.remaining === 0);
  const free = event.ticketTypes.every((t) => t.price.amountMinor === 0);

  // Integer minor units throughout: no floating-point money.
  const lines = event.ticketTypes
    .map((t) => ({ t, n: qty[t.id] ?? 0 }))
    .filter((l) => l.n > 0);
  const count = lines.reduce((s, l) => s + l.n, 0);
  const paidCount = lines.filter((l) => l.t.price.amountMinor > 0).reduce((s, l) => s + l.n, 0);
  const subtotal = lines.reduce((s, l) => s + l.n * l.t.price.amountMinor, 0);
  const fees = paidCount * event.bookingFeePerTicket.amountMinor;
  const money = (amountMinor: number): Money => ({ amountMinor, currency: "GHS" });
  const totalText = count === 0 ? formatPriceFrom(event.ticketTypes.map((t) => t.price)) : formatMoney(money(subtotal + fees));

  const [lastTotal, setLastTotal] = useState(0);
  const direction: 1 | -1 = subtotal + fees >= lastTotal ? 1 : -1;
  const setQuantity = (id: string, n: number) => {
    setLastTotal(subtotal + fees);
    setNudge(false);
    setMockNote(false);
    setQty((q) => ({ ...q, [id]: n }));
  };

  const ctaLabel = free ? "Reserve tickets" : "Continue to checkout";

  const onContinue = () => {
    if (count === 0) {
      // Respond to the tap instead of disabling the button.
      setNudge(true);
      shake.start({ x: [0, -8, 8, -5, 5, 0], transition: { duration: 0.4 } });
      document.getElementById("tickets")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    // MOCK: checkout is a later phase-1 screen.
    setMockNote(true);
  };

  /* ---------- Ticket list ---------- */
  const ticketList = (
    <section id="tickets" aria-labelledby="tickets-title" className="scroll-mt-24">
      <div className="mb-5 flex items-end justify-between gap-4">
        <h2 id="tickets-title" className="text-h1">
          Tickets
        </h2>
        {seated && !soldOut && (
          <span className="inline-flex items-center gap-1.5 text-small text-fg-muted">
            <Armchair className="size-4" aria-hidden />
            Assigned seating
          </span>
        )}
      </div>

      <ul className="grid gap-3">
        {event.ticketTypes.map((t) => {
          const a = availability(t);
          const n = qty[t.id] ?? 0;
          const unavailable = t.remaining === 0;
          const max = Math.min(t.maxPerOrder, t.remaining ?? t.maxPerOrder);
          return (
            <m.li
              key={t.id}
              layout="position"
              className={cn(
                "relative rounded-lg border bg-surface p-4 transition-colors md:p-5",
                n > 0 ? "border-primary bg-primary-soft/40 dark:bg-primary-soft/30" : "border-line",
                unavailable && "opacity-70",
              )}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    {seated && t.tier && (
                      <Seat state="available" tier={t.tier} label="" size={18} interactive={false} />
                    )}
                    <h3 className="text-h3">{t.name}</h3>
                  </div>
                  <ul className="mt-2 grid gap-1">
                    {t.includes.map((inc) => (
                      <li key={inc} className="flex items-start gap-2 text-small text-fg-muted">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary-ink" aria-hidden />
                        {inc}
                      </li>
                    ))}
                  </ul>
                  <p className={cn("mt-3 inline-flex items-center gap-1.5 text-small font-semibold", toneClass[a.tone])}>
                    <a.icon className="size-4" aria-hidden />
                    {a.text}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-5 sm:flex-col sm:items-end sm:justify-start">
                  <p className="text-h2 tabular">{formatMoney(t.price)}</p>
                  {!seated && !unavailable && (
                    <Stepper
                      value={n}
                      max={max}
                      onChange={(v) => setQuantity(t.id, v)}
                      label={`${t.name} tickets`}
                    />
                  )}
                </div>
              </div>

              <AnimatePresence initial={false}>
                {!seated && n > 0 && n >= max && (
                  <m.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={spring.snappy}
                    className="overflow-hidden text-caption text-fg-muted"
                  >
                    <span className="mt-3 flex items-center gap-1.5">
                      <Info className="size-3.5" aria-hidden />
                      {t.remaining !== null && t.remaining < t.maxPerOrder
                        ? `Only ${t.remaining} left`
                        : `Up to ${t.maxPerOrder} per order`}
                    </span>
                  </m.p>
                )}
              </AnimatePresence>
            </m.li>
          );
        })}
      </ul>

      {seated && !soldOut && (
        <p className="mt-4 flex items-start gap-2 text-small text-fg-muted">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          Choose your seats on the map. Prices depend on where you sit.
        </p>
      )}
    </section>
  );

  /* ---------- Purchase panel (desktop) ---------- */
  const panelBody = soldOut ? (
    <div className="text-center">
      <Ban className="mx-auto size-8 text-danger" aria-hidden />
      <p className="mt-3 text-h3">Sold out</p>
      <p className="mt-1 text-small text-fg-muted">Every ticket for this event has gone.</p>
      <Link href="#more" className="mt-5 inline-flex h-11 items-center gap-2 font-semibold text-primary-ink">
        See similar events <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  ) : (
    <>
      <div className="grid gap-1 text-small">
        <p className="font-semibold text-fg">{formatEventDate(event.startsAt, event.timeZone)}</p>
        <p className="text-fg-muted">
          {event.venueName}, {event.city}
        </p>
      </div>

      <div className="my-5 border-t border-line" />

      {seated ? (
        <div className="grid gap-2 text-small">
          {event.ticketTypes.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                {t.tier && <Seat state="available" tier={t.tier} label="" size={14} interactive={false} />}
                {t.name}
              </span>
              <span className="font-semibold tabular">{formatMoney(t.price)}</span>
            </div>
          ))}
        </div>
      ) : (
        <AnimatePresence initial={false} mode="popLayout">
          {lines.length === 0 ? (
            <m.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn("text-small", nudge ? "font-semibold text-danger" : "text-fg-muted")}
              role={nudge ? "alert" : undefined}
            >
              {nudge ? "Choose at least one ticket to continue." : "Choose your tickets to see the total."}
            </m.p>
          ) : (
            <m.ul key="lines" className="grid gap-2 text-small">
              <AnimatePresence initial={false}>
                {lines.map((l) => (
                  <m.li
                    key={l.t.id}
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={spring.snappy}
                    className="flex justify-between gap-3"
                  >
                    <span>
                      {l.n} × {l.t.name}
                    </span>
                    <span className="tabular">{formatMoney(money(l.n * l.t.price.amountMinor))}</span>
                  </m.li>
                ))}
                {fees > 0 && (
                  <m.li
                    key="fee"
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex justify-between gap-3 text-fg-muted"
                  >
                    <span>Booking fee ({paidCount} × {formatMoney(event.bookingFeePerTicket)})</span>
                    <span className="tabular">{formatMoney(money(fees))}</span>
                  </m.li>
                )}
              </AnimatePresence>
            </m.ul>
          )}
        </AnimatePresence>
      )}

      {!seated && (
        <div className="mt-5 flex items-baseline justify-between border-t border-line pt-4">
          <span className="text-small text-fg-muted">{count === 0 ? "Tickets" : "Total"}</span>
          <RollingNumber value={totalText} direction={direction} className="text-h2" />
        </div>
      )}

      <m.div animate={shake} className="mt-5">
        {seated ? (
          <Link
            href={`/events/${event.slug}/seats`}
            transitionTypes={["nav-forward"]}
            className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-md bg-primary px-6 text-body-lg font-semibold text-primary-fg shadow-e1 transition-colors hover:bg-primary-hover"
          >
            <Armchair className="size-5" aria-hidden />
            Choose your seats
          </Link>
        ) : (
          <Button size="lg" className="w-full" onClick={onContinue} icon={<ArrowRight className="size-5" />}>
            {ctaLabel}
          </Button>
        )}
      </m.div>

      <AnimatePresence>
        {mockNote && (
          <m.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden text-caption text-info"
            role="status"
          >
            <span className="mt-3 block rounded-sm bg-info-soft p-2.5 text-info-fg">
              Design preview: checkout is built in a later step.
            </span>
          </m.p>
        )}
      </AnimatePresence>

      <ul className="mt-5 grid gap-2 text-caption text-fg-muted">
        {!free && (
          <li className="flex items-center gap-2">
            <Smartphone className="size-4 shrink-0" aria-hidden />
            Pay with MoMo (MTN, Telecel, AirtelTigo) or card
          </li>
        )}
        <li className="flex items-center gap-2">
          <Lock className="size-4 shrink-0" aria-hidden />
          {seated
            ? "Your seats are held for 10 minutes while you pay"
            : "Tickets are held for 10 minutes once you continue"}
        </li>
      </ul>
    </>
  );

  return (
    <>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-10 pb-32 md:px-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-14 lg:pb-20">
        <div className="grid min-w-0 content-start gap-14">
          {before}
          {ticketList}
          {after}
        </div>

        <aside aria-label="Your order" className="hidden lg:block">
          <div className="sticky top-24 rounded-lg border border-line bg-surface-raised p-6 shadow-e2">
            {panelBody}
          </div>
        </aside>
      </div>

      {/* ---------- Bottom bar (phones and tablets) ---------- */}
      {!soldOut && (
        <div className="glass fixed inset-x-0 bottom-0 z-40 border-t border-line pb-[env(safe-area-inset-bottom)] lg:hidden">
          <AnimatePresence>
            {mockNote && (
              <m.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden px-4 text-caption text-info-fg"
                role="status"
              >
                <span className="mt-3 block rounded-sm bg-info-soft p-2.5">
                  Design preview: checkout is built in a later step.
                </span>
              </m.p>
            )}
          </AnimatePresence>
          <m.div animate={shake} className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className={cn("text-caption", nudge && count === 0 ? "font-semibold text-danger" : "text-fg-muted")}>
                {seated
                  ? "Seats from"
                  : count === 0
                    ? nudge
                      ? "Choose a ticket first"
                      : "Tickets from"
                    : `${count} ${count === 1 ? "ticket" : "tickets"}${fees > 0 ? " · incl. fees" : ""}`}
              </p>
              <RollingNumber
                value={seated ? formatPriceFrom(event.ticketTypes.map((t) => t.price)).replace("From ", "") : totalText.replace("From ", "")}
                direction={direction}
                className="text-h3"
              />
            </div>
            {seated ? (
              <Link
                href={`/events/${event.slug}/seats`}
                transitionTypes={["nav-forward"]}
                className="inline-flex h-12 items-center gap-2 rounded-md bg-primary px-5 font-semibold text-primary-fg"
              >
                <Armchair className="size-5" aria-hidden />
                Choose seats
              </Link>
            ) : (
              <Button onClick={onContinue} className="h-12">
                {count === 0 ? "Get tickets" : free ? "Reserve" : "Continue"}
              </Button>
            )}
          </m.div>
        </div>
      )}
    </>
  );
}
