import Image from "next/image";
import { CircleCheck, CircleX, RotateCcw, ScanLine } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import type { IssuedTicket, OrderView } from "@/lib/api";
import { cn } from "@/lib/cn";
import { QrCode } from "./qr-code";

const statusStyle: Record<IssuedTicket["status"], { icon: typeof CircleCheck; text: string; cls: string }> = {
  Issued: { icon: CircleCheck, text: "Valid · not scanned yet", cls: "bg-success-soft text-success-fg" },
  "Checked in": { icon: ScanLine, text: "Checked in", cls: "bg-info-soft text-info-fg" },
  Refunded: { icon: RotateCcw, text: "Refunded · not valid", cls: "bg-surface-muted text-fg-muted" },
  Invalidated: { icon: CircleX, text: "Not valid", cls: "bg-danger-soft text-danger-fg" },
};

const day = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", day: "numeric", month: "short" })
    .format(new Date(iso))
    .replace(",", "")
    .replace("Sept", "Sep");
const time = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso)).toUpperCase();

/**
 * One ticket, sized to show at the gate: the QR is the biggest thing on it,
 * and everything a steward checks (event, date, ticket type, seat, name)
 * is readable without zooming.
 */
export function TicketCard({ order, ticket, index, total }: { order: OrderView; ticket: IssuedTicket; index: number; total: number }) {
  const st = statusStyle[ticket.status];
  const usable = ticket.status === "Issued";
  return (
    <article
      aria-label={`Ticket ${index + 1} of ${total}: ${ticket.ticketTypeName}${ticket.seat ? `, row ${ticket.seat.row} seat ${ticket.seat.number}` : ""}`}
      className="relative overflow-hidden rounded-[1.25rem] border border-line bg-surface-raised shadow-e3"
    >
      {/* Artwork band, cut on the logo's slant */}
      <div className="crop-slant relative h-32 bg-teal-800 [--slant-crop:1.5rem]">
        {order.imageUrl ? (
          <Image src={order.imageUrl} alt="" fill sizes="22rem" className="object-cover" />
        ) : (
          <LogoMark className="absolute -right-6 -bottom-6 h-40 text-teal-600/60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-1000/80 via-ink-1000/25 to-transparent" />
        <div className="absolute inset-x-4 bottom-7 text-white">
          <p className="text-overline text-teal-200">
            Ticket {index + 1} of {total}
          </p>
          <h2 className="mt-1 font-display text-[1.6rem] leading-none font-[850] italic [font-variation-settings:'wdth'_86]">
            {order.eventName}
          </h2>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 pt-2 pb-5 text-small">
        <div>
          <dt className="text-caption text-fg-muted">Date</dt>
          <dd className="font-semibold">{day(order.startsAt, order.timeZone)}</dd>
        </div>
        <div>
          <dt className="text-caption text-fg-muted">Time</dt>
          <dd className="font-semibold">{time(order.startsAt, order.timeZone)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-caption text-fg-muted">Venue</dt>
          <dd className="font-semibold">
            {order.venueName}, {order.city}
          </dd>
        </div>
        <div className={ticket.seat ? "col-span-2" : undefined}>
          <dt className="text-caption text-fg-muted">Ticket</dt>
          <dd className="font-semibold">{ticket.ticketTypeName}</dd>
        </div>
        {ticket.seat ? (
          <div className="col-span-2 grid grid-cols-[minmax(0,1.6fr)_1fr_1fr] items-end gap-3 rounded-md bg-surface-muted p-3">
            <div className="min-w-0">
              <dt className="text-caption text-fg-muted">Section</dt>
              <dd className="truncate text-body font-semibold leading-8">{ticket.seat.section}</dd>
            </div>
            {[
              ["Row", ticket.seat.row],
              ["Seat", String(ticket.seat.number)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-caption text-fg-muted">{k}</dt>
                <dd className="text-h2 leading-8 tabular">{v}</dd>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <dt className="text-caption text-fg-muted">Entry</dt>
            <dd className="font-semibold">Any gate</dd>
          </div>
        )}
        <div className="col-span-2">
          <dt className="text-caption text-fg-muted">Name</dt>
          <dd className="font-semibold">{ticket.holderName}</dd>
        </div>
      </dl>

      {/* Tear line */}
      <div className="relative h-0 border-t-2 border-dashed border-line-strong" aria-hidden>
        <span className="absolute -top-3 -left-3 size-6 rounded-full bg-bg" />
        <span className="absolute -top-3 -right-3 size-6 rounded-full bg-bg" />
      </div>

      <div className="grid justify-items-center px-5 pt-6 pb-5">
        <div className={cn("rounded-xl bg-white p-3 shadow-e1", !usable && "opacity-30 grayscale")}>
          <QrCode value={ticket.qr} label={`QR code for ticket ${ticket.code}`} className="size-56 sm:size-60" />
        </div>
        <p className="mt-3 font-mono text-small font-semibold tracking-wider">{ticket.code}</p>
        <p className={cn("mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption font-semibold", st.cls)}>
          <st.icon className="size-3.5" aria-hidden />
          {st.text}
        </p>
        <p className="mt-3 text-caption text-fg-subtle">Order {order.ref}</p>
      </div>
    </article>
  );
}
