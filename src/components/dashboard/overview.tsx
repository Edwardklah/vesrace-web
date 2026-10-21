"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { m } from "motion/react";
import { CalendarPlus, Check, Plus, ScanLine, Ticket, Wallet } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";
import {
  AS_OF,
  FEE_RATE_BPS,
  attentionItems,
  chartSeries,
  dashEvents,
  organiser,
  orders,
  ranges,
  summarise,
  toDay,
  type RangeKey,
} from "@/data/sample-dashboard";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";
import { AttentionList } from "./attention-list";
import { cedis, count, longDay, trend } from "./dash-format";
import { OrdersTable } from "./orders-table";
import { PageHeader } from "./page-header";
import { SalesChart } from "./sales-chart";
import { StatCard } from "./stat-card";
import { UpcomingEvents } from "./upcoming-events";
import { useReviewParam, useRole } from "./use-role";

/** CSS entrance (works before JavaScript loads), staggered by `delay`. */
const rise = (delay: number, extra?: string) => ({
  className: cn("animate-rise [--rise:14px]", extra),
  style: { "--delay": `${delay}ms` } as React.CSSProperties,
});

const createEvent = (
  <Link
    href="/dashboard/events"
    className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-small font-semibold text-primary-fg shadow-e1 transition-colors hover:bg-primary-hover"
  >
    <Plus className="size-4" aria-hidden /> Create event
  </Link>
);

/**
 * Organiser dashboard overview. Answers the organiser's two questions in
 * order: "how are my events selling?" (figures, chart, events) and
 * "what do I need to do next?" (Next up).
 *
 * Review switches: `?state=empty` (new organiser), `?state=loading`,
 * `?role=manager` (no payout details).
 */
export function Overview() {
  const [range, setRange] = useState<RangeKey>("30d");
  const role = useRole();
  const state = useReviewParam("state");

  const s = useMemo(() => summarise(range), [range]);
  const buckets = useMemo(() => chartSeries(range), [range]);
  const todo = useMemo(() => attentionItems().filter((i) => !i.ownerOnly || role === "owner"), [role]);
  const upcoming = dashEvents.filter((e) => toDay(e.startsAt) >= AS_OF).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const last = dashEvents
    .filter((e) => e.status === "Ended")
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))[0];
  const lastSold = last?.ticketTypes.reduce((n, t) => n + t.sold, 0) ?? 0;
  const lastPct = last?.checkedIn && lastSold ? Math.round((last.checkedIn / lastSold) * 100) : 0;
  const caption = ranges[range].caption;
  const vs = range === "all" ? undefined : `vs previous ${ranges[range].label}`;

  if (state === "loading") return <OverviewSkeleton />;
  if (state === "empty") return <FirstRun />;

  return (
    // minmax(0,1fr): wide content (tables) scrolls inside its card instead of widening the page.
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div {...rise(0)}>
        <PageHeader
          title="Overview"
          context={
            <>
              {organiser.name} · {longDay(AS_OF)} · Amounts in GH₵, times in Accra
            </>
          }
          actions={
            <>
              <Segmented
                label="Time range"
                value={range}
                onChange={setRange}
                options={(Object.keys(ranges) as RangeKey[]).map((k) => ({ value: k, label: ranges[k].label }))}
                className="[&_button]:h-8 [&_button]:px-3"
              />
              {createEvent}
            </>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div {...rise(60, "grid")}>
          <StatCard
            label="Tickets sold"
            value={count(s.tickets)}
            numeric={s.tickets}
            trend={trend(s.tickets, s.previous?.tickets)}
            trendLabel={vs}
            caption={`${caption} · ${s.boxOffice ? `${count(s.boxOffice)} at the box office` : "all online"}`}
          />
        </div>
        <div {...rise(110, "grid")}>
          <StatCard
            label="Gross sales"
            value={cedis(s.gross)}
            numeric={s.gross}
            trend={trend(s.gross, s.previous?.gross)}
            trendLabel={vs}
            caption={caption}
            info="Ticket sales before fees. Booking fees that customers pay go to Vesrace and aren't included."
          />
        </div>
        <div {...rise(160, "grid")}>
          <StatCard
            label="Net after fees"
            value={cedis(s.net)}
            numeric={s.net}
            caption={`${caption} · after the ${FEE_RATE_BPS / 100}% Vesrace fee`}
            info={
              <span className="grid gap-1 tabular">
                <span className="flex justify-between gap-4">
                  <span>Gross</span> {cedis(s.gross)}
                </span>
                <span className="flex justify-between gap-4">
                  <span>Vesrace fee ({FEE_RATE_BPS / 100}%)</span> −{cedis(s.fee)}
                </span>
                <span className="flex justify-between gap-4 border-t border-white/20 pt-1 font-semibold dark:border-ink-950/20">
                  <span>Net</span> {cedis(s.net)}
                </span>
              </span>
            }
          />
        </div>
        <div {...rise(210, "grid")}>
          {last ? (
            <StatCard
              label="Checked in · last event"
              value={`${count(last.checkedIn ?? 0)} of ${count(lastSold)}`}
              numeric={last.checkedIn ?? 0}
              caption={`${last.name} · ${longDay(toDay(last.startsAt))}`}
            >
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
                  <m.div
                    className="h-full rounded-full bg-success"
                    initial={{ width: 0 }}
                    animate={{ width: `${lastPct}%` }}
                    transition={{ ...spring.smooth, delay: 0.35 }}
                  />
                </div>
                <span className="text-caption font-semibold tabular">{lastPct}%</span>
              </div>
            </StatCard>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div {...rise(260)}>
          <SalesChart buckets={buckets} range={range} />
        </div>
        <div {...rise(310)}>
          <AttentionList items={todo} />
        </div>
      </div>

      <div {...rise(360)}>
        <UpcomingEvents events={upcoming} />
      </div>

      <div {...rise(410)}>
        <OrdersTable orders={orders} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

/** Skeleton with the same layout, so nothing jumps when data arrives. */
export function OverviewSkeleton() {
  const block = "animate-pulse rounded-lg bg-surface-muted";
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Loading overview">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="grid gap-2">
          <div className={cn(block, "h-10 w-48")} />
          <div className={cn(block, "h-4 w-72")} />
        </div>
        <div className={cn(block, "h-10 w-80")} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cn(block, "h-36")} />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className={cn(block, "h-96")} />
        <div className={cn(block, "h-96")} />
      </div>
      <div className={cn(block, "h-72")} />
    </div>
  );
}

/** A new organiser with no events: guide the first steps instead of showing zeros. */
function FirstRun() {
  const steps = [
    { icon: CalendarPlus, title: "Create your first event", body: "Name, date, venue and artwork. You can save it as a draft.", href: "/dashboard/events" },
    { icon: Ticket, title: "Add ticket types", body: "Prices, how many, and when sales open and close.", href: "/dashboard/events" },
    { icon: Wallet, title: "Add a payout number", body: "Where we send your money after each event: MoMo or bank.", href: "/dashboard/payouts" },
    { icon: ScanLine, title: "Invite your door team", body: "Scanners only see check-in, never your sales.", href: "/dashboard/team" },
  ];
  return (
    <div className="grid gap-6">
      <PageHeader title={`Welcome, ${organiser.user.name.split(" ")[0]}`} context="Four steps to your first ticket sale." actions={createEvent} />
      <ol className="grid gap-3 md:grid-cols-2">
        {steps.map((st, i) => (
          <li key={st.title} className="animate-rise [--rise:14px]" style={{ "--delay": `${i * 70}ms` } as React.CSSProperties}>
            <Link
              href={st.href}
              className="group flex h-full gap-4 rounded-lg border border-line bg-surface p-5 shadow-e1 transition-colors hover:border-primary"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary-ink">
                <st.icon className="size-5" aria-hidden />
              </span>
              <span>
                <span className="text-overline text-fg-subtle">Step {i + 1}</span>
                <span className="mt-1 block text-body font-semibold">{st.title}</span>
                <span className="mt-0.5 block text-small text-fg-muted">{st.body}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <p className="flex items-center gap-2 text-small text-fg-muted">
        <Check className="size-4 text-success" aria-hidden /> Sales, orders and check-ins will show here once your first event is on sale.
      </p>
    </div>
  );
}
