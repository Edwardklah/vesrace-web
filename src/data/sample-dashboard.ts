/**
 * MOCK data for the organiser dashboard, for one organiser: Coastline Live.
 *
 * Everything is generated from a few fixed facts (capacity and tickets sold
 * per ticket type), so every number on the dashboard adds up:
 *   - daily sales sum exactly to tickets sold per ticket type,
 *   - the paid orders in the table are those same daily sales split into orders,
 *   - Harmattan Sounds Live matches its public seat map (111 VIP and 286
 *     Regular seats sold, 20 of 60 standing).
 *
 * The real dashboard gets these figures from the API (see docs/edge-cases.md
 * for the rule that the server is the source of truth). "Today" is fixed so
 * the sample data never drifts.
 */

import type { EventCategory, EventDisplayStatus, OrderStatus } from "@/lib/types";

/** The day the sample data is "as of" (Africa/Accra, which is UTC+0). */
export const AS_OF = "2026-10-20";
/** Vesrace's fee on ticket sales, taken before payout. */
export const FEE_RATE_BPS = 300; // 3.00%

export type Role = "owner" | "manager";

export const organiser = {
  name: "Coastline Live",
  initials: "CL",
  user: { name: "Ama Mensah", initials: "AM", role: "owner" as Role },
  payoutTo: "MTN MoMo ••• 4567",
};

export interface DashTicketType {
  id: string;
  name: string;
  priceMinor: number;
  capacity: number;
  sold: number;
  /** Sold at the door on the day (included in `sold`). */
  boxOffice?: number;
}

export interface DashEvent {
  id: string;
  slug: string | null;
  name: string;
  category: EventCategory;
  startsAt: string;
  venue: string;
  status: EventDisplayStatus;
  imageUrl: string | null;
  salesFrom: string | null; // YYYY-MM-DD
  ticketTypes: DashTicketType[];
  checkedIn?: number;
  /** Door staff assigned for the day. */
  scanners: number;
}

const img = (id: string) => `https://images.unsplash.com/${id}`;

export const dashEvents: DashEvent[] = [
  {
    id: "evt_sundown_labadi",
    slug: "accra-sundown-festival",
    name: "Accra Sundown Festival",
    category: "Concert",
    startsAt: "2026-10-24T16:00:00Z",
    venue: "Black Star Square, Accra",
    status: "On sale",
    imageUrl: img("photo-1727023663928-1772e2c7e679"),
    salesFrom: "2026-08-20",
    ticketTypes: [
      { id: "tt_sd_ga", name: "General admission", priceMinor: 15000, capacity: 800, sold: 782 },
      { id: "tt_sd_vip", name: "VIP deck", priceMinor: 40000, capacity: 150, sold: 96 },
    ],
    scanners: 0,
  },
  {
    id: "evt_harmattan",
    slug: "harmattan-sounds-live",
    name: "Harmattan Sounds Live",
    category: "Concert",
    startsAt: "2026-12-12T19:00:00Z",
    venue: "Osu Arts Hall, Accra",
    status: "On sale",
    imageUrl: img("photo-1689864727821-e47577e88226"),
    salesFrom: "2026-09-15",
    ticketTypes: [
      { id: "tt_hm_vip", name: "VIP", priceMinor: 50000, capacity: 128, sold: 111 },
      { id: "tt_hm_reg", name: "Regular", priceMinor: 20000, capacity: 512, sold: 286 },
      { id: "tt_hm_std", name: "Standing", priceMinor: 20000, capacity: 60, sold: 20 },
    ],
    scanners: 4,
  },
  {
    id: "evt_countdown",
    slug: null,
    name: "Coastline Countdown 2027",
    category: "Concert",
    startsAt: "2026-12-31T21:00:00Z",
    venue: "Venue not set",
    status: "Draft",
    imageUrl: null,
    salesFrom: null,
    ticketTypes: [],
    scanners: 0,
  },
  {
    id: "evt_jamestown",
    slug: null,
    name: "Jamestown Sunset Sessions",
    category: "Concert",
    startsAt: "2026-09-26T17:00:00Z",
    venue: "Lighthouse Grounds, Jamestown",
    status: "Ended",
    imageUrl: img("photo-1528508670332-4c687dae6295"),
    salesFrom: "2026-08-01",
    ticketTypes: [{ id: "tt_js_ga", name: "Entry", priceMinor: 10000, capacity: 350, sold: 338, boxOffice: 42 }],
    checkedIn: 311,
    scanners: 3,
  },
];

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

const DAY = 86_400_000;
export const toDay = (iso: string) => iso.slice(0, 10);
export const addDays = (day: string, n: number) => new Date(Date.parse(day) + n * DAY).toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

/* ------------------------------------------------------------------ */
/* Deterministic "random" numbers, so the sample never changes         */
/* ------------------------------------------------------------------ */

function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Split `total` into whole numbers proportional to `weights` (largest remainder). */
function apportion(total: number, weights: number[]) {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map((w) => (w / sum) * total);
  const out = raw.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; left > 0; k = (k + 1) % order.length, left--) out[order[k][1]]++;
  return out;
}

/* ------------------------------------------------------------------ */
/* Daily sales                                                         */
/* ------------------------------------------------------------------ */

export interface DailySale {
  day: string;
  eventId: string;
  ticketTypeId: string;
  channel: "online" | "box-office";
  tickets: number;
  amountMinor: number;
}

/**
 * Online sales per ticket type per day: a launch spike, a quiet middle,
 * a rush in the final week, and busier weekends. Box-office sales all
 * happen on the event day.
 */
function buildDailySales(): DailySale[] {
  const rows: DailySale[] = [];
  for (const ev of dashEvents) {
    if (!ev.salesFrom) continue;
    const eventDay = toDay(ev.startsAt);
    const last = eventDay < AS_OF ? eventDay : AS_OF;
    const n = daysBetween(ev.salesFrom, last) + 1;
    for (const tt of ev.ticketTypes) {
      const rand = seeded(tt.id);
      const weights = Array.from({ length: n }, (_, i) => {
        const day = addDays(ev.salesFrom!, i);
        const untilEvent = daysBetween(day, eventDay);
        const launch = 3.2 * Math.exp(-i / 4);
        const rush = untilEvent <= 10 ? 2.4 * Math.exp(-untilEvent / 4) : 0;
        const dow = new Date(day).getUTCDay();
        const weekend = dow === 5 || dow === 6 ? 1.35 : 1;
        return (0.55 + launch + rush) * weekend * (0.6 + rand() * 0.8);
      });
      const online = tt.sold - (tt.boxOffice ?? 0);
      apportion(online, weights).forEach((tickets, i) => {
        if (tickets > 0)
          rows.push({
            day: addDays(ev.salesFrom!, i),
            eventId: ev.id,
            ticketTypeId: tt.id,
            channel: "online",
            tickets,
            amountMinor: tickets * tt.priceMinor,
          });
      });
      if (tt.boxOffice)
        rows.push({
          day: eventDay,
          eventId: ev.id,
          ticketTypeId: tt.id,
          channel: "box-office",
          tickets: tt.boxOffice,
          amountMinor: tt.boxOffice * tt.priceMinor,
        });
    }
  }
  return rows;
}

export const dailySales = buildDailySales();

/* ------------------------------------------------------------------ */
/* Ranges and summaries                                                */
/* ------------------------------------------------------------------ */

export type RangeKey = "7d" | "30d" | "all";

export const ranges: Record<RangeKey, { label: string; days: number | null; caption: string }> = {
  "7d": { label: "7 days", days: 7, caption: "Last 7 days" },
  "30d": { label: "30 days", days: 30, caption: "Last 30 days" },
  all: { label: "All time", days: null, caption: "All time" },
};

export const firstSaleDay = dailySales.reduce((a, s) => (s.day < a ? s.day : a), AS_OF);

export function rangeBounds(range: RangeKey) {
  const days = ranges[range].days;
  const from = days ? addDays(AS_OF, -(days - 1)) : firstSaleDay;
  return { from, to: AS_OF };
}

export const feeOf = (grossMinor: number) => Math.round((grossMinor * FEE_RATE_BPS) / 10_000);

export function summarise(range: RangeKey) {
  const { from, to } = rangeBounds(range);
  const inRange = dailySales.filter((s) => s.day >= from && s.day <= to);
  const tickets = inRange.reduce((n, s) => n + s.tickets, 0);
  const gross = inRange.reduce((n, s) => n + s.amountMinor, 0);
  const boxOffice = inRange.filter((s) => s.channel === "box-office").reduce((n, s) => n + s.tickets, 0);

  // The same-length period just before, for a trend line (not for "all time").
  let previous: { tickets: number; gross: number } | null = null;
  const days = ranges[range].days;
  if (days) {
    const pFrom = addDays(from, -days);
    const pTo = addDays(from, -1);
    const p = dailySales.filter((s) => s.day >= pFrom && s.day <= pTo);
    previous = { tickets: p.reduce((n, s) => n + s.tickets, 0), gross: p.reduce((n, s) => n + s.amountMinor, 0) };
  }
  const fee = feeOf(gross);
  return { from, to, tickets, boxOffice, gross, fee, net: gross - fee, previous };
}

export interface ChartBucket {
  key: string;
  /** First and last day covered. */
  from: string;
  to: string;
  online: { tickets: number; amountMinor: number };
  boxOffice: { tickets: number; amountMinor: number };
}

/** Daily buckets for 7 and 30 days; weekly buckets for all time. */
export function chartSeries(range: RangeKey): ChartBucket[] {
  const { from, to } = rangeBounds(range);
  const step = range === "all" ? 7 : 1;
  const buckets: ChartBucket[] = [];
  // Weekly buckets end on AS_OF so the latest week is complete-to-date.
  const span = daysBetween(from, to) + 1;
  const count = Math.ceil(span / step);
  for (let b = count - 1; b >= 0; b--) {
    const bTo = addDays(to, -b * step);
    const bFrom = addDays(bTo, -(step - 1)) < from ? from : addDays(bTo, -(step - 1));
    buckets.push({
      key: bTo,
      from: bFrom,
      to: bTo,
      online: { tickets: 0, amountMinor: 0 },
      boxOffice: { tickets: 0, amountMinor: 0 },
    });
  }
  for (const s of dailySales) {
    if (s.day < from || s.day > to) continue;
    const bucket = buckets.find((b) => s.day >= b.from && s.day <= b.to)!;
    const slot = s.channel === "online" ? bucket.online : bucket.boxOffice;
    slot.tickets += s.tickets;
    slot.amountMinor += s.amountMinor;
  }
  return buckets;
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export type PayMethod = "MTN MoMo" | "Telecel Cash" | "AirtelTigo Money" | "Card" | "Box office";

export interface Order {
  id: string;
  placedAt: string; // ISO
  customer: string;
  phone: string; // already masked, as the API sends it
  eventId: string;
  eventName: string;
  lines: { name: string; qty: number }[];
  tickets: number;
  amountMinor: number;
  method: PayMethod;
  status: OrderStatus;
}

const FIRST = ["Kwame", "Abena", "Kofi", "Akosua", "Yaw", "Efua", "Kojo", "Adwoa", "Kwesi", "Esi", "Nana", "Afia", "Selorm", "Dzifa", "Kwabena", "Ama", "Fiifi", "Naa", "Elikem", "Mawuli", "Yaa", "Ekow", "Aseye", "Delali"];
const LAST = ["Mensah", "Owusu", "Boateng", "Asante", "Ofori", "Quaye", "Addo", "Agyeman", "Tetteh", "Amoah", "Danso", "Lamptey", "Nkrumah", "Ansah", "Osei", "Darko", "Kuffour", "Badu", "Agbeko", "Larbi"];
const PREFIX: Record<Exclude<PayMethod, "Card" | "Box office">, string[]> = {
  "MTN MoMo": ["024", "054", "055", "059"],
  "Telecel Cash": ["020", "050"],
  "AirtelTigo Money": ["027", "057", "026"],
};

const ORDER_DAYS = 7;
const ORDER_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * The paid orders from the last 7 days are the daily sales above, split
 * into orders of 1–6 tickets. A few pending, failed and refunded orders are
 * added on top; they don't count as tickets sold.
 */
function buildOrders(): Order[] {
  const rand = seeded("orders");
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
  const code = () => "VS-" + Array.from({ length: 6 }, () => pick(ORDER_CHARS.split(""))).join("");
  const person = () => {
    const methodRoll = rand();
    const method: PayMethod =
      methodRoll < 0.52 ? "MTN MoMo" : methodRoll < 0.72 ? "Telecel Cash" : methodRoll < 0.84 ? "AirtelTigo Money" : "Card";
    const prefixes = method === "Card" ? ["024", "020", "055", "027"] : PREFIX[method];
    const phone = `${pick(prefixes)} ••• ${String(Math.floor(rand() * 9000) + 1000)}`;
    return { customer: `${pick(FIRST)} ${pick(LAST)}`, phone, method };
  };
  const timeOn = (day: string) => {
    // Most orders between 8 AM and 11 PM.
    const minutes = 8 * 60 + Math.floor(rand() * 15 * 60);
    return new Date(Date.parse(day) + minutes * 60_000).toISOString();
  };

  const from = addDays(AS_OF, -(ORDER_DAYS - 1));
  const orders: Order[] = [];
  const evName = Object.fromEntries(dashEvents.map((e) => [e.id, e.name]));
  const ttName = Object.fromEntries(dashEvents.flatMap((e) => e.ticketTypes.map((t) => [t.id, t] as const)));

  for (const s of dailySales) {
    if (s.day < from || s.channel !== "online") continue;
    let left = s.tickets;
    while (left > 0) {
      const roll = rand();
      const qty = Math.min(left, roll < 0.38 ? 1 : roll < 0.72 ? 2 : roll < 0.86 ? 3 : roll < 0.96 ? 4 : 6);
      left -= qty;
      const tt = ttName[s.ticketTypeId];
      orders.push({
        id: code(),
        placedAt: timeOn(s.day),
        ...person(),
        eventId: s.eventId,
        eventName: evName[s.eventId],
        lines: [{ name: tt.name, qty }],
        tickets: qty,
        amountMinor: qty * tt.priceMinor,
        status: "Paid",
      });
    }
  }

  // Not counted as sales: a payment still waiting, failed ones and a refund.
  const extra: { status: OrderStatus; eventId: string; ttId: string; qty: number; day: string }[] = [
    { status: "Pending", eventId: "evt_sundown_labadi", ttId: "tt_sd_ga", qty: 2, day: AS_OF },
    { status: "Failed", eventId: "evt_sundown_labadi", ttId: "tt_sd_vip", qty: 2, day: AS_OF },
    { status: "Failed", eventId: "evt_harmattan", ttId: "tt_hm_reg", qty: 4, day: addDays(AS_OF, -2) },
    { status: "Refunded", eventId: "evt_harmattan", ttId: "tt_hm_vip", qty: 1, day: addDays(AS_OF, -3) },
    { status: "Failed", eventId: "evt_sundown_labadi", ttId: "tt_sd_ga", qty: 1, day: addDays(AS_OF, -5) },
  ];
  for (const x of extra) {
    const tt = ttName[x.ttId];
    const p = person();
    orders.push({
      id: code(),
      placedAt: x.status === "Pending" ? `${AS_OF}T12:58:00Z` : timeOn(x.day),
      ...p,
      method: p.method === "Card" && x.status === "Pending" ? "MTN MoMo" : p.method,
      eventId: x.eventId,
      eventName: evName[x.eventId],
      lines: [{ name: tt.name, qty: x.qty }],
      tickets: x.qty,
      amountMinor: x.qty * tt.priceMinor,
      status: x.status,
    });
  }

  // Nothing later than "now" on the sample's day.
  const now = `${AS_OF}T13:00:00Z`;
  for (const o of orders) if (o.placedAt > now) o.placedAt = new Date(Date.parse(now) - Math.floor(rand() * 5 * 3_600_000)).toISOString();
  return orders.sort((a, b) => b.placedAt.localeCompare(a.placedAt));
}

export const orders = buildOrders();

/* ------------------------------------------------------------------ */
/* What needs doing                                                    */
/* ------------------------------------------------------------------ */

export interface AttentionItem {
  id: string;
  tone: "warning" | "info" | "success";
  title: string;
  body: string;
  action: { label: string; href: string };
  /** Hidden for roles that can't act on it. */
  ownerOnly?: boolean;
}

export function attentionItems(): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const ev of dashEvents) {
    const until = daysBetween(AS_OF, toDay(ev.startsAt));
    if (ev.status === "On sale" && until >= 0 && until <= 7 && ev.scanners === 0)
      items.push({
        id: `scan-${ev.id}`,
        tone: "warning",
        title: `No door staff for ${ev.name}`,
        body: `It's in ${until} days. Assign at least one scanner so tickets can be checked at the gate.`,
        action: { label: "Assign staff", href: "/dashboard/team" },
      });
    for (const tt of ev.ticketTypes) {
      const left = tt.capacity - tt.sold;
      if (ev.status === "On sale" && left > 0 && left / tt.capacity <= 0.05)
        items.push({
          id: `low-${tt.id}`,
          tone: "warning",
          title: `${left} ${tt.name} tickets left`,
          body: `${ev.name} is ${Math.round((tt.sold / tt.capacity) * 100)}% sold for this ticket type. Add more, or let it sell out.`,
          action: { label: "Edit tickets", href: "/dashboard/events" },
        });
    }
    if (ev.status === "Draft")
      items.push({
        id: `draft-${ev.id}`,
        tone: "info",
        title: `${ev.name} is a draft`,
        body: "Add a venue and ticket types, then publish it to start selling.",
        action: { label: "Continue setup", href: "/dashboard/events" },
      });
  }
  const js = dashEvents.find((e) => e.id === "evt_jamestown")!;
  const jsGross = js.ticketTypes.reduce((n, t) => n + t.sold * t.priceMinor, 0);
  items.push({
    id: "payout-jamestown",
    tone: "success",
    title: "Payout sent",
    body: `GH₵ ${((jsGross - feeOf(jsGross)) / 100).toLocaleString("en-GH", { minimumFractionDigits: 2 })} for ${js.name} reached ${organiser.payoutTo} on Tue 29 Sep.`,
    action: { label: "View payouts", href: "/dashboard/payouts" },
    ownerOnly: true,
  });
  return items;
}
