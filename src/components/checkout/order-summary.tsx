"use client";

import { useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { ChevronDown } from "lucide-react";
import { RollingNumber } from "@/components/ui/rolling-number";
import type { Quote } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { spring } from "@/lib/motion";

const ghs = (amountMinor: number) => formatMoney({ amountMinor, currency: "GHS" });

/** Ticket lines, the booking fee on its own line, and the total. All figures come from the server's quote. */
export function SummaryLines({ quote, className }: { quote: Quote; className?: string }) {
  return (
    <dl className={cn("grid gap-2.5 text-small", className)}>
      {quote.lines.map((l) => (
        <div key={l.ticketTypeId}>
          <div className="flex justify-between gap-3">
            <dt>
              {l.qty} × {l.name}
            </dt>
            <dd className="tabular">{ghs(l.qty * l.unitMinor)}</dd>
          </div>
          {l.seats.length > 0 && (
            <ul className="mt-0.5 grid gap-0.5 text-caption text-fg-muted">
              {l.seats.map((s) => (
                <li key={s.id}>{s.label}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
      {quote.feeMinor > 0 && (
        <div className="flex justify-between gap-3 text-fg-muted">
          <dt>
            Booking fee ({quote.ticketCount} × {ghs(quote.feePerTicketMinor)})
          </dt>
          <dd className="tabular">{ghs(quote.feeMinor)}</dd>
        </div>
      )}
      <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-line pt-3">
        <dt className="font-semibold">Total</dt>
        <dd className="text-h3 tabular">{quote.totalMinor === 0 ? "Free" : ghs(quote.totalMinor)}</dd>
      </div>
    </dl>
  );
}

/** Phones: a bar under the header that opens to the full summary, so it's always one tap away. */
export function MobileSummary({ quote }: { quote: Quote }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line bg-surface lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="flex-1 text-small">
          <span className="font-semibold">Order summary</span>
          <span className="text-fg-muted">
            {" "}
            · {quote.ticketCount} {quote.ticketCount === 1 ? "ticket" : "tickets"}
          </span>
        </span>
        <RollingNumber value={quote.totalMinor === 0 ? "Free" : ghs(quote.totalMinor)} className="text-body font-bold" />
        <m.span animate={{ rotate: open ? 180 : 0 }} transition={spring.snappy}>
          <ChevronDown className="size-5 text-fg-muted" aria-hidden />
        </m.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring.smooth}
            className="overflow-hidden"
          >
            <SummaryLines quote={quote} className="px-4 pb-4" />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
