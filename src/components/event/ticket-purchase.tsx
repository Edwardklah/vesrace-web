"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, m, useAnimationControls } from "motion/react";
import {
  Armchair,
  ArrowRight,
  Ban,
  Bell,
  BellRing,
  CalendarClock,
  CalendarX2,
  Check,
  CircleCheck,
  Flame,
  Info,
  Lock,
  MapPinned,
  Smartphone,
  Ticket,
  WifiOff,
} from "lucide-react";
import { Seat } from "@/components/seating/seat";
import { Button } from "@/components/ui/button";
import { RollingNumber } from "@/components/ui/rolling-number";
import { Stepper } from "@/components/ui/stepper";
import { api, ApiError, errorMessage } from "@/lib/api";
import { holdSession } from "@/lib/api/hold-session";
import { cn } from "@/lib/cn";
import { formatEventDate, formatMoney, formatPriceFrom, type Money } from "@/lib/format";
import { spring } from "@/lib/motion";
import type { EventDetail, EventNotice, TicketType } from "@/lib/types";
import { useOnline } from "@/lib/use-online";

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

/** "Fri 30 Oct, 10:00 AM" in the event's own timezone. */
function salesOpenText(iso: string, timeZone: string) {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", day: "numeric", month: "short" }).format(d);
  const t = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "numeric", minute: "2-digit", hour12: true })
    .format(d)
    .toUpperCase();
  return `${day.replace(",", "")}, ${t}`;
}

/**
 * Time left until sales open. Client-only (the server can't know the
 * viewer's "now" at render time), so it renders nothing until mounted.
 * MOCK: the real page should use the server time from the API, like the
 * hold timer does, so a wrong phone clock can't show the wrong countdown.
 */
function Countdown({ to }: { to: string }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, new Date(to).getTime() - Date.now()));
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [to]);
  if (left === null) return null;
  if (left === 0) return <span>Opening now. Refresh the page.</span>;
  const s = Math.floor(left / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const text = d > 0 ? `${d}d ${h}h ${mm}m` : `${h}h ${String(mm).padStart(2, "0")}m ${String(ss).padStart(2, "0")}s`;
  return <span className="tabular">Opens in {text}</span>;
}

const noticeStyle = {
  rescheduled: { icon: CalendarClock, box: "border-info/30 bg-info-soft text-info-fg" },
  "venue-changed": { icon: MapPinned, box: "border-info/30 bg-info-soft text-info-fg" },
  cancelled: { icon: CalendarX2, box: "border-danger/30 bg-danger-soft text-danger-fg" },
} as const;

/** Organiser announcement shown at the top of the event page. */
export function EventNoticeBanner({ notice }: { notice: EventNotice }) {
  const st = noticeStyle[notice.kind];
  return (
    <div role={notice.kind === "cancelled" ? "alert" : "status"} className={cn("flex gap-3 rounded-lg border p-4 md:p-5", st.box)}>
      <st.icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div>
        <p className="text-h3">{notice.title}</p>
        <p className="mt-1 text-small">{notice.body}</p>
      </div>
    </div>
  );
}

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
  const [busy, setBusy] = useState(false);
  const [holdError, setHoldError] = useState<string | null>(null);
  const router = useRouter();
  // Next.js keeps this page alive while you're on checkout, so pressing Back
  // shows it exactly as you left it. Effects clean up when it's hidden; use
  // that to drop the "loading" state so the button works again on return.
  useEffect(() => () => setBusy(false), []);
  const [remind, setRemind] = useState(false);
  const shake = useAnimationControls();
  const online = useOnline();

  const seated = event.seating === "assigned";
  const soldOut = event.status === "Sold out" || event.ticketTypes.every((t) => t.remaining === 0);
  const free = event.ticketTypes.every((t) => t.price.amountMinor === 0);
  // Lifecycle: the server refuses holds in all of these too (see docs/edge-cases.md).
  const cancelled = event.status === "Cancelled" || event.notice?.kind === "cancelled";
  const upcoming = !cancelled && event.salesState === "upcoming";
  const closed = !cancelled && !upcoming && event.salesState === "closed";
  const unavailableNow = cancelled || upcoming || closed || soldOut;
  const orderMax = event.maxTicketsPerOrder;

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
    setHoldError(null);
    setQty((q) => ({ ...q, [id]: n }));
  };

  const ctaLabel = free ? "Reserve tickets" : "Continue to checkout";

  const onContinue = async () => {
    if (!online || busy) return; // the offline note explains why; busy stops double taps
    if (count === 0) {
      // Respond to the tap instead of disabling the button.
      setNudge(true);
      shake.start({ x: [0, -8, 8, -5, 5, 0], transition: { duration: 0.4 } });
      document.getElementById("tickets")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    // Reserve the tickets (the 10-minute hold starts now), then go to checkout.
    setBusy(true);
    setHoldError(null);
    const quantities = Object.fromEntries(lines.map((l) => [l.t.id, l.n]));
    try {
      let hold;
      try {
        hold = await api.holds.setTickets({ eventId: event.id, holdId: holdSession.get(event.id), quantities });
      } catch (e) {
        // An old hold from earlier ran out: start a fresh one.
        if (!(e instanceof ApiError && e.code === "HOLD_EXPIRED")) throw e;
        hold = await api.holds.setTickets({ eventId: event.id, holdId: null, quantities });
      }
      holdSession.set(event.id, hold.id);
      router.push(`/checkout/${event.slug}`);
    } catch (e) {
      setHoldError(errorMessage(e));
      setBusy(false);
    }
  };

  /* ---------- Ticket list ---------- */
  const ticketList = (
    <section id="tickets" aria-labelledby="tickets-title" className="scroll-mt-24">
      <div className="mb-5 flex items-end justify-between gap-4">
        <h2 id="tickets-title" className="text-h1">
          Tickets
        </h2>
        {seated && !unavailableNow && (
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
          const unavailable = t.remaining === 0 || unavailableNow;
          // Never more than the type allows, what's left, or what the order has room for.
          const roomInOrder = orderMax - (count - n);
          const max = Math.max(0, Math.min(t.maxPerOrder, t.remaining ?? t.maxPerOrder, roomInOrder));
          const limitText =
            t.remaining !== null && t.remaining <= Math.min(t.maxPerOrder, roomInOrder)
              ? `Only ${t.remaining} left`
              : roomInOrder < t.maxPerOrder
                ? `Up to ${orderMax} tickets per order in total`
                : `Up to ${t.maxPerOrder} per order`;
          return (
            <m.li
              key={t.id}
              layout="position"
              className={cn(
                "relative rounded-lg border bg-surface p-4 transition-colors md:p-5",
                n > 0 ? "border-primary bg-primary-soft/40 dark:bg-primary-soft/30" : "border-line",
                t.remaining === 0 && "opacity-70",
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
                  {!cancelled && !closed && (
                    <p className={cn("mt-3 inline-flex items-center gap-1.5 text-small font-semibold", toneClass[a.tone])}>
                      <a.icon className="size-4" aria-hidden />
                      {upcoming && t.remaining !== 0 ? "On sale soon" : a.text}
                    </p>
                  )}
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
                      {limitText}
                    </span>
                  </m.p>
                )}
              </AnimatePresence>
            </m.li>
          );
        })}
      </ul>

      {!unavailableNow && (
        <p className="mt-4 flex items-start gap-2 text-small text-fg-muted">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          {seated
            ? `Choose your seats on the map. Prices depend on where you sit. Up to ${orderMax} seats per order.`
            : `Up to ${orderMax} tickets per order.`}
        </p>
      )}
    </section>
  );

  /* ---------- Purchase panel (desktop) ---------- */
  const offlineNote = !online && !unavailableNow && (
    <p role="status" className="mt-3 flex items-start gap-2 rounded-sm bg-warning-soft p-2.5 text-caption text-warning-fg">
      <WifiOff className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      You&apos;re offline. You can look around, but tickets can only be bought while you&apos;re connected.
    </p>
  );

  const stateBlock = (icon: React.ReactNode, title: string, body: React.ReactNode, action?: React.ReactNode) => (
    <div className="text-center">
      {icon}
      <p className="mt-3 text-h3">{title}</p>
      <div className="mt-1 text-small text-fg-muted">{body}</div>
      {action}
    </div>
  );

  const similarLink = (
    <Link href="#more" className="mt-5 inline-flex h-11 items-center gap-2 font-semibold text-primary-ink">
      See similar events <ArrowRight className="size-4" aria-hidden />
    </Link>
  );

  const panelBody = cancelled ? (
    stateBlock(
      <CalendarX2 className="mx-auto size-8 text-danger" aria-hidden />,
      "Event cancelled",
      "Tickets can't be bought. If you already have tickets, your refund is on its way automatically.",
      <div className="mt-5 grid justify-items-center gap-1">
        <Link
          href="/tickets/find"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-line-strong bg-surface px-5 font-semibold hover:bg-surface-muted"
        >
          <Ticket className="size-5" aria-hidden /> Find my tickets
        </Link>
        {similarLink}
      </div>,
    )
  ) : upcoming && event.salesStartsAt ? (
    stateBlock(
      <CalendarClock className="mx-auto size-8 text-primary-ink" aria-hidden />,
      `On sale ${salesOpenText(event.salesStartsAt, event.timeZone)}`,
      <>
        <p>Tickets aren&apos;t on sale yet.</p>
        <p className="mt-1 font-semibold text-fg">
          <Countdown to={event.salesStartsAt} />
        </p>
      </>,
      <div className="mt-5">
        <Button
          variant={remind ? "secondary" : "primary"}
          className="w-full"
          onClick={() => setRemind((r) => !r)}
          icon={remind ? <BellRing className="size-5" /> : <Bell className="size-5" />}
          aria-pressed={remind}
        >
          {remind ? "Reminder set" : "Remind me"}
        </Button>
        <AnimatePresence>
          {remind && (
            <m.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden text-caption text-fg-muted"
              role="status"
            >
              {/* MOCK: the real reminder asks for a phone number and sends an SMS. */}
              <span className="mt-3 block">Design preview: we&apos;ll text you when sales open.</span>
            </m.p>
          )}
        </AnimatePresence>
      </div>,
    )
  ) : closed ? (
    stateBlock(
      <Ban className="mx-auto size-8 text-fg-muted" aria-hidden />,
      "Ticket sales have ended",
      "Online sales for this event are closed. The organiser may sell at the door.",
      similarLink,
    )
  ) : soldOut ? (
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

      {offlineNote}

      <m.div animate={shake} className="mt-5">
        {seated ? (
          <Link
            href={`/events/${event.slug}/seats`}
            transitionTypes={["nav-forward"]}
            prefetch
            className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-md bg-primary px-6 text-body-lg font-semibold text-primary-fg shadow-e1 transition-colors hover:bg-primary-hover"
          >
            <Armchair className="size-5" aria-hidden />
            Choose your seats
          </Link>
        ) : (
          <Button size="lg" className="w-full" onClick={onContinue} disabled={!online} loading={busy} icon={<ArrowRight className="size-5" />}>
            {ctaLabel}
          </Button>
        )}
      </m.div>

      <AnimatePresence>
        {holdError && (
          <m.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden text-caption"
            role="alert"
          >
            <span className="mt-3 block rounded-sm bg-danger-soft p-2.5 text-danger-fg">{holdError}</span>
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
          {event.notice && <EventNoticeBanner notice={event.notice} />}
          {/* Phones have no side panel, so the sale state shows here instead of the bottom bar. */}
          {unavailableNow && (
            <div className="rounded-lg border border-line bg-surface-raised p-6 shadow-e1 lg:hidden">{panelBody}</div>
          )}
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
      {!unavailableNow && (
        <div className="glass fixed inset-x-0 bottom-0 z-40 border-t border-line pb-[env(safe-area-inset-bottom)] lg:hidden">
          {!online && (
            <p role="status" className="mx-auto flex max-w-3xl items-center gap-2 px-4 pt-3 text-caption font-semibold text-warning">
              <WifiOff className="size-3.5 shrink-0" aria-hidden />
              You&apos;re offline. Reconnect to buy tickets.
            </p>
          )}
          <AnimatePresence>
            {holdError && (
              <m.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mx-auto max-w-3xl overflow-hidden px-4 text-caption"
                role="alert"
              >
                <span className="mt-3 block rounded-sm bg-danger-soft p-2.5 text-danger-fg">{holdError}</span>
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
              <Button onClick={onContinue} className="h-12" disabled={!online} loading={busy}>
                {count === 0 ? "Get tickets" : free ? "Reserve" : "Continue"}
              </Button>
            )}
          </m.div>
        </div>
      )}
    </>
  );
}
