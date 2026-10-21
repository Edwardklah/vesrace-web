"use client";

/**
 * Checkout API: pricing a hold, taking payment and issuing tickets.
 *
 * The page only ever shows what this returns. The real implementation calls
 * the backend, which prices the order, talks to the payment provider
 * (Paystack first, behind the backend's payment abstraction) and confirms
 * payment from the provider's callback, never from the browser.
 *
 * MOCK below. Review switches (add to the checkout URL):
 *   ?pay=approve   the MoMo prompt is approved after a few seconds (default)
 *   ?pay=decline   the customer declines the prompt
 *   ?pay=funds     not enough money in the wallet
 *   ?pay=timeout   nobody approves; the prompt times out
 */

import { getEventById } from "@/data/sample-event-details";
import { getSeatMap } from "@/data/sample-seat-maps";
import { ApiError } from "./errors";
import { HOLD_CHANNEL, mockServer, type HoldBroadcast } from "./holds";

/* ---------------- Contract ---------------- */

export interface QuoteLine {
  ticketTypeId: string;
  name: string;
  qty: number;
  unitMinor: number;
  /** Assigned seats in this line, already labelled by the server. */
  seats: { id: string; label: string }[];
}

export interface Quote {
  holdId: string;
  eventId: string;
  lines: QuoteLine[];
  ticketCount: number;
  subtotalMinor: number;
  feePerTicketMinor: number;
  feeMinor: number;
  totalMinor: number;
  currency: "GHS";
  expiresAt: number;
  serverTime: number;
}

export type Network = "mtn" | "telecel" | "airteltigo";
export type PaymentStatus = "pending" | "paid" | "failed" | "cancelled" | "expired";
export type FailReason = "declined" | "insufficient-funds" | "timeout";

export interface Customer {
  name: string;
  phone: string; // local digits, "0241234567"
  email?: string;
}

export interface Payment {
  id: string;
  holdId: string;
  method: "momo" | "card" | "free";
  network?: Network;
  /** "024 ••• 4567": the server never sends the full number back. */
  phoneMasked?: string;
  amountMinor: number;
  status: PaymentStatus;
  reason?: FailReason;
  /** Server clock. The prompt was (re)sent at this time. */
  promptSentAt: number;
  /** Server clock. "Resend prompt" unlocks at this time. */
  resendAvailableAt: number;
  /** Server clock. The prompt stops being valid at this time. */
  promptExpiresAt: number;
  orderRef?: string;
  serverTime: number;
}

export type TicketStatus = "Issued" | "Checked in" | "Refunded" | "Invalidated";

export interface IssuedTicket {
  id: string;
  /** Short code staff can type if a QR won't scan. */
  code: string;
  /** Signed credential from the server. The page only draws it as a QR code. */
  qr: string;
  ticketTypeName: string;
  seat: { section: string; row: string; number: number } | null;
  area: string | null;
  holderName: string;
  status: TicketStatus;
}

export interface OrderView {
  ref: string;
  eventId: string;
  eventSlug: string;
  eventName: string;
  startsAt: string;
  endsAt: string;
  timeZone: string;
  venueName: string;
  city: string;
  imageUrl: string | null;
  customer: { name: string; phoneMasked: string; emailMasked: string | null };
  lines: QuoteLine[];
  feeMinor: number;
  totalMinor: number;
  paidWith: string;
  tickets: IssuedTicket[];
  delivery: { sms: "sent" | "sending"; email: "sent" | "sending" | "none" };
  createdAt: number;
}

export interface CheckoutApi {
  quote(holdId: string): Promise<Quote>;
  startPayment(input: {
    holdId: string;
    /** "free" for orders that total GH₵ 0 (RSVP events). */
    method: "momo" | "card" | "free";
    network?: Network;
    phone?: string;
    customer: Customer;
    /** Same key = same payment, so a double tap can't charge twice. */
    idempotencyKey: string;
  }): Promise<Payment>;
  getPayment(id: string): Promise<Payment>;
  resendPrompt(id: string): Promise<Payment>;
  cancelPayment(id: string): Promise<Payment>;
  getOrder(ref: string): Promise<OrderView | null>;
}

export const networkName: Record<Network, string> = {
  mtn: "MTN MoMo",
  telecel: "Telecel Cash",
  airteltigo: "AirtelTigo Money",
};

/** Network from the number's prefix. A suggestion only: people move numbers between networks. */
export function networkFromPhone(digits: string): Network | null {
  const p = digits.slice(0, 3);
  if (["024", "054", "055", "059", "025", "053"].includes(p)) return "mtn";
  if (["020", "050"].includes(p)) return "telecel";
  if (["027", "057", "026", "056"].includes(p)) return "airteltigo";
  return null;
}

export const maskPhone = (digits: string) => `${digits.slice(0, 3)} ••• ${digits.slice(-4)}`;

/* ---------------- MOCK SERVER ---------------- */

const KEY = "vesrace-mock-checkout";
const RESEND_AFTER = 30_000;
const PROMPT_LIFETIME = 120_000;
const OUTCOME_AFTER = 7_000;

interface PaymentRecord extends Omit<Payment, "serverTime"> {
  key: string;
  outcome: "approve" | "decline" | "funds" | "timeout";
  customer: Customer;
  startedAt: number;
}
interface CheckoutStore {
  payments: Record<string, PaymentRecord>;
  orders: Record<string, OrderView>;
  /** Unmasked contact details per order, used only by the mock ticket lookup. */
  contacts: Record<string, { phone: string; email: string | null }>;
}

function loadC(): CheckoutStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { contacts: {}, ...(JSON.parse(raw) as Partial<CheckoutStore>) } as CheckoutStore;
  } catch {
    /* ignore */
  }
  return { payments: {}, orders: {}, contacts: {} };
}
function saveC(s: CheckoutStore) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const randomCode = (n: number) => {
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(bytes, (b) => CHARS[b % CHARS.length]).join("");
};

function priceHold(holdId: string): Quote {
  const store = mockServer.load();
  const h = store.holds[holdId];
  if (!h) throw new ApiError("HOLD_EXPIRED");
  const event = getEventById(h.eventId);
  if (!event) throw new ApiError("UNKNOWN");
  const map = getSeatMap(h.eventId);
  const seatInfo = new Map(
    (map?.sections ?? []).flatMap((sec) =>
      sec.rows.flatMap((r) => r.seats.map((x) => [x.id, { ticketTypeId: x.ticketTypeId, label: `${sec.name} · Row ${r.label}, Seat ${x.number}` }] as const)),
    ),
  );

  const byType = new Map<string, QuoteLine>();
  const line = (ttId: string) => {
    const tt = event.ticketTypes.find((t) => t.id === ttId)!;
    if (!byType.has(ttId)) byType.set(ttId, { ticketTypeId: ttId, name: tt.name, qty: 0, unitMinor: tt.price.amountMinor, seats: [] });
    return byType.get(ttId)!;
  };
  for (const id of h.seatIds) {
    const info = seatInfo.get(id)!;
    const l = line(info.ticketTypeId);
    l.qty++;
    l.seats.push({ id, label: info.label });
  }
  for (const [zoneId, n] of Object.entries(h.zones)) {
    const z = map?.zones.find((x) => x.id === zoneId);
    if (z && n > 0) line(z.ticketTypeId).qty += n;
  }
  for (const [ttId, n] of Object.entries(h.tickets ?? {})) if (n > 0) line(ttId).qty += n;

  // Keep the event's ticket-type order.
  const lines = event.ticketTypes.map((t) => byType.get(t.id)).filter((l): l is QuoteLine => !!l);
  const ticketCount = lines.reduce((n, l) => n + l.qty, 0);
  const subtotalMinor = lines.reduce((n, l) => n + l.qty * l.unitMinor, 0);
  const paid = lines.filter((l) => l.unitMinor > 0).reduce((n, l) => n + l.qty, 0);
  const feePerTicketMinor = event.bookingFeePerTicket.amountMinor;
  const feeMinor = paid * feePerTicketMinor;
  return {
    holdId,
    eventId: h.eventId,
    lines,
    ticketCount,
    subtotalMinor,
    feePerTicketMinor,
    feeMinor,
    totalMinor: subtotalMinor + feeMinor,
    currency: "GHS",
    expiresAt: h.expiresAt,
    serverTime: mockServer.serverNow(),
  };
}

const view = (p: PaymentRecord, now: number): Payment => {
  const { key: _k, outcome: _o, customer: _c, startedAt: _s, ...rest } = p; // eslint-disable-line @typescript-eslint/no-unused-vars
  return { ...rest, serverTime: now };
};

/** Turn a paid payment into an order with tickets, and release the hold as sold. */
function issue(c: CheckoutStore, p: PaymentRecord, now: number) {
  const quote = priceHold(p.holdId);
  const event = getEventById(quote.eventId)!;
  const map = getSeatMap(quote.eventId);
  const seatParts = new Map(
    (map?.sections ?? []).flatMap((sec) => sec.rows.flatMap((r) => r.seats.map((x) => [x.id, { section: sec.name, row: r.label, number: x.number }] as const))),
  );
  const prefix = event.name.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).slice(0, 3).map((w) => w[0].toUpperCase()).join("");
  const tickets: IssuedTicket[] = quote.lines.flatMap((l) => {
    const seated = l.seats.map((s) => s.id);
    return Array.from({ length: l.qty }, (_, i) => ({
      id: `tkt_${randomCode(10)}`,
      code: `${prefix}-${randomCode(4)}-${randomCode(4)}`,
      // MOCK credential. The real one is signed by the server and checked at the gate.
      qr: `VSR1.${randomCode(24)}.${randomCode(16)}`,
      ticketTypeName: l.name,
      seat: seated[i] ? seatParts.get(seated[i]) ?? null : null,
      area: seated[i] ? null : l.name,
      holderName: p.customer.name,
      status: "Issued" as const,
    }));
  });
  const ref = `VS-${randomCode(6)}`;
  const email = p.customer.email?.trim();
  c.orders[ref] = {
    ref,
    eventId: event.id,
    eventSlug: event.slug,
    eventName: event.name,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    timeZone: event.timeZone,
    venueName: event.venueName,
    city: event.city,
    imageUrl: event.imageUrl,
    customer: {
      name: p.customer.name,
      phoneMasked: maskPhone(p.customer.phone),
      emailMasked: email ? email.replace(/^(.).*(@.*)$/, "$1•••$2") : null,
    },
    lines: quote.lines,
    feeMinor: quote.feeMinor,
    totalMinor: quote.totalMinor,
    paidWith: p.method === "free" ? "Free" : p.method === "card" ? "Card" : `${networkName[p.network!]} ${p.phoneMasked}`,
    tickets,
    delivery: { sms: "sent", email: email ? "sent" : "none" },
    createdAt: now,
  };
  c.contacts[ref] = { phone: p.customer.phone, email: email?.toLowerCase() ?? null };
  p.orderRef = ref;

  // The hold becomes a sale.
  const hs = mockServer.load();
  const h = hs.holds[p.holdId];
  if (h) {
    hs.sold.push(...h.seatIds);
    delete hs.holds[p.holdId];
    mockServer.save(hs);
    try {
      const ch = new BroadcastChannel(HOLD_CHANNEL);
      ch.postMessage({ type: "hold-released", eventId: h.eventId, holdId: h.id } satisfies HoldBroadcast);
      ch.close();
    } catch {
      /* ignore */
    }
  }
}

/** Move a pending payment forward according to the mock's script. */
function advance(c: CheckoutStore, p: PaymentRecord, now: number) {
  if (p.status !== "pending") return;
  const hold = mockServer.load().holds[p.holdId];
  const elapsed = now - p.promptSentAt;
  if (p.method === "card" || p.method === "free") {
    if (!hold) p.status = "expired";
    else if (elapsed > (p.method === "free" ? 800 : 3_000)) {
      p.status = "paid";
      issue(c, p, now);
    }
    return;
  }
  if (!hold) {
    // MOCK simplification. The real server completes a late approval if the
    // seats are still free, and refunds it automatically if not.
    p.status = "expired";
  } else if (p.outcome === "approve" && elapsed > OUTCOME_AFTER) {
    p.status = "paid";
    issue(c, p, now);
  } else if ((p.outcome === "decline" || p.outcome === "funds") && elapsed > 5_000) {
    p.status = "failed";
    p.reason = p.outcome === "decline" ? "declined" : "insufficient-funds";
  } else if (now > p.promptExpiresAt) {
    p.status = "failed";
    p.reason = "timeout";
  }
}

export const mockCheckout: CheckoutApi = {
  async quote(holdId) {
    const hs = mockServer.load();
    await mockServer.begin(hs);
    mockServer.save(hs);
    return priceHold(holdId);
  },

  async startPayment({ holdId, method, network, phone, customer, idempotencyKey }) {
    const hs = mockServer.load();
    const now = await mockServer.begin(hs);
    mockServer.save(hs);
    const c = loadC();
    const existing = Object.values(c.payments).find((p) => p.key === idempotencyKey);
    if (existing) return view(existing, now);
    const h = hs.holds[holdId];
    if (!h) throw new ApiError("HOLD_EXPIRED");
    mockServer.checkEvent(h.eventId);
    const quote = priceHold(holdId);
    const sim = mockServer.param("pay");
    const speed = sim === "timeout" ? 15_000 : PROMPT_LIFETIME;
    const p: PaymentRecord = {
      id: `pay_${randomCode(10)}`,
      key: idempotencyKey,
      holdId,
      method,
      network,
      phoneMasked: phone ? maskPhone(phone) : undefined,
      amountMinor: quote.totalMinor,
      status: "pending",
      promptSentAt: now,
      resendAvailableAt: now + RESEND_AFTER,
      promptExpiresAt: now + speed,
      outcome: sim === "decline" || sim === "funds" || sim === "timeout" ? sim : "approve",
      customer,
      startedAt: now,
    };
    c.payments[p.id] = p;
    saveC(c);
    return view(p, now);
  },

  async getPayment(id) {
    const now = mockServer.serverNow();
    await new Promise((r) => setTimeout(r, 150));
    const c = loadC();
    const p = c.payments[id];
    if (!p) throw new ApiError("UNKNOWN");
    advance(c, p, now);
    saveC(c);
    return view(p, now);
  },

  async resendPrompt(id) {
    const hs = mockServer.load();
    const now = await mockServer.begin(hs);
    mockServer.save(hs);
    const c = loadC();
    const p = c.payments[id];
    if (!p) throw new ApiError("UNKNOWN");
    if (p.status === "pending" && now >= p.resendAvailableAt) {
      p.promptSentAt = now;
      p.resendAvailableAt = now + RESEND_AFTER;
      p.promptExpiresAt = now + (p.outcome === "timeout" ? 15_000 : PROMPT_LIFETIME);
    }
    saveC(c);
    return view(p, now);
  },

  async cancelPayment(id) {
    const now = mockServer.serverNow();
    const c = loadC();
    const p = c.payments[id];
    if (!p) throw new ApiError("UNKNOWN");
    advance(c, p, now); // it may have just been approved
    if (p.status === "pending") p.status = "cancelled";
    saveC(c);
    return view(p, now);
  },

  async getOrder(ref) {
    await new Promise((r) => setTimeout(r, 200));
    return loadC().orders[ref] ?? null;
  },
};

/** MOCK internals for the mock ticket lookup in ./tickets.ts. */
export const mockCheckoutStore = { load: loadC };
