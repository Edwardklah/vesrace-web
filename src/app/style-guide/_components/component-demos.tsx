"use client";

import { useState } from "react";
import { ArrowRight, Download, Plus, Trash2 } from "lucide-react";
import { Badge, EventStatusBadge, OrderStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PhoneField } from "@/components/ui/phone-field";
import { TextField } from "@/components/ui/text-field";
import { EventCard } from "@/components/events/event-card";
import { Seat } from "@/components/seating/seat";
import { SeatLegend } from "@/components/seating/seat-legend";
import { eventsById } from "@/data/sample-events";
import { formatMoney } from "@/lib/format";
import type { EventDisplayStatus, OrderStatus, PriceTier, SeatState } from "@/lib/types";
import { Label } from "./section";

export function ButtonsDemo() {
  const [loading, setLoading] = useState(false);
  return (
    <div className="grid gap-8">
      <div>
        <Label>Variants</Label>
        <div className="flex flex-wrap items-center gap-3">
          <Button icon={<ArrowRight className="size-5" />}>Get tickets</Button>
          <Button variant="secondary" icon={<Download className="size-5" />}>Download</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="danger" icon={<Trash2 className="size-5" />}>Refund order</Button>
        </div>
      </div>
      <div>
        <Label>Sizes</Label>
        <div className="flex flex-wrap items-end gap-3">
          <Button size="sm" variant="secondary">Small</Button>
          <Button size="md" variant="secondary">Medium</Button>
          <Button size="lg" variant="secondary">Large</Button>
          <Button size="xl" icon={<Plus className="size-6" />}>POS · Add</Button>
        </div>
      </div>
      <div>
        <Label>States</Label>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            loading={loading}
            onClick={() => {
              setLoading(true);
              window.setTimeout(() => setLoading(false), 1800);
            }}
          >
            Pay GH₵ 430.00
          </Button>
          <Button disabled>Sold out</Button>
          <p className="text-small text-fg-muted">Tap “Pay” to see loading. Repeat taps are ignored.</p>
        </div>
      </div>
    </div>
  );
}

export function InputsDemo() {
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const nameError = touched && name.trim().length < 2 ? "Enter your full name." : undefined;
  return (
    <div className="grid max-w-3xl gap-6 md:grid-cols-2">
      <PhoneField />
      <TextField
        label="Full name"
        placeholder="Ama Mensah"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => setTouched(true)}
        error={nameError}
        autoComplete="name"
      />
      <TextField label="Email" type="email" placeholder="ama@example.com" optional hint="For a copy of your receipt." />
      <TextField label="Promo code" defaultValue="EARLYBIRD" disabled hint="Applied" />
    </div>
  );
}

const eventStatuses: EventDisplayStatus[] = ["Draft", "Published", "On sale", "Paused", "Sold out", "Ended", "Cancelled"];
const orderStatuses: OrderStatus[] = ["Paid", "Pending", "Failed", "Refunded"];

export function BadgesDemo() {
  return (
    <div className="grid gap-6">
      <div>
        <Label>Event status</Label>
        <div className="flex flex-wrap gap-2">
          {eventStatuses.map((s) => <EventStatusBadge key={s} status={s} />)}
        </div>
      </div>
      <div>
        <Label>Order status</Label>
        <div className="flex flex-wrap gap-2">
          {orderStatuses.map((s) => <OrderStatusBadge key={s} status={s} />)}
        </div>
      </div>
      <div>
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-2">
          <Badge tone="primary">Concert</Badge>
          <Badge>Assigned seating</Badge>
          <Badge tone="info">MoMo accepted</Badge>
        </div>
      </div>
    </div>
  );
}

export function EventCardsDemo() {
  return (
    <div>
      <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-4">
        {eventsById(["evt_harmattan", "evt_kumasi_summit", "evt_thanksgiving", "evt_basketball"]).map((e) => (
          <EventCard key={e.id} event={e} href="#event-cards" />
        ))}
      </div>
      <p className="mt-8 max-w-2xl text-small text-fg-muted">
        Night of Thanksgiving &amp; Praise has no artwork, so it shows the branded fallback cover.
        The basketball final shows the sold-out state. Hover or press a card to feel it respond.
      </p>
    </div>
  );
}

/* A small mock row so seat states can be tried. */
type DemoSeat = { n: number; state: SeatState; tier: PriceTier; accessible?: boolean };
const initialSeats: DemoSeat[] = [
  { n: 1, state: "available", tier: 2, accessible: true },
  { n: 2, state: "available", tier: 2 },
  { n: 3, state: "sold", tier: 2 },
  { n: 4, state: "sold", tier: 2 },
  { n: 5, state: "available", tier: 1 },
  { n: 6, state: "selected", tier: 1 },
  { n: 7, state: "available", tier: 1 },
  { n: 8, state: "held", tier: 1 },
  { n: 9, state: "available", tier: 1 },
  { n: 10, state: "blocked", tier: 2 },
  { n: 11, state: "available", tier: 3 },
  { n: 12, state: "available", tier: 3 },
];
const tierInfo = {
  1: { name: "VIP", price: { amountMinor: 50000, currency: "GHS" as const } },
  2: { name: "Regular", price: { amountMinor: 20000, currency: "GHS" as const } },
  3: { name: "Student", price: { amountMinor: 12000, currency: "GHS" as const } },
};

export function SeatsDemo() {
  const [seats, setSeats] = useState(initialSeats);
  const toggle = (n: number) =>
    setSeats((all) =>
      all.map((s) =>
        s.n === n ? { ...s, state: s.state === "selected" ? "available" : "selected" } : s,
      ),
    );
  const selected = seats.filter((s) => s.state === "selected");

  return (
    <div className="grid gap-8">
      <div className="rounded-lg border border-line bg-surface p-6">
        <div className="mb-6 rounded-sm bg-surface-muted py-2 text-center text-overline text-fg-muted">
          Stage
        </div>
        <div className="flex items-center justify-center gap-3" role="group" aria-label="Row C">
          <span className="w-5 text-small font-semibold text-fg-muted">C</span>
          <div className="flex flex-wrap gap-2">
            {seats.map((s) => (
              <Seat
                key={s.n}
                state={s.state}
                tier={s.tier}
                accessible={s.accessible}
                size={32}
                label={`Row C, seat ${s.n}, ${tierInfo[s.tier].name}, ${formatMoney(tierInfo[s.tier].price)}`}
                onToggle={() => toggle(s.n)}
              />
            ))}
          </div>
        </div>
        <p className="mt-6 text-center text-small text-fg-muted" aria-live="polite">
          {selected.length === 0
            ? "Tap a seat to select it."
            : `Selected: ${selected.map((s) => `C${s.n}`).join(", ")}`}
        </p>
      </div>
      <SeatLegend
        tiers={[1, 2, 3].map((t) => ({ tier: t as PriceTier, ...tierInfo[t as PriceTier] }))}
      />
    </div>
  );
}
