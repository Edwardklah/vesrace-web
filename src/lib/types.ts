import type { Money } from "./format";

/**
 * Frontend models. These mirror what we expect from the `/api/v1` contract.
 * They are proposals until the backend publishes its OpenAPI spec; any
 * mismatch should be raised, not silently renamed.
 */

export type EventCategory =
  | "Concert"
  | "Nightlife"
  | "Conference"
  | "Faith"
  | "Comedy"
  | "Sport"
  | "Theatre";

/** What customers and organisers see (brief v2). Backend statuses map onto these. */
export type EventDisplayStatus =
  | "Draft"
  | "Published"
  | "On sale"
  | "Paused"
  | "Sold out"
  | "Ended"
  | "Cancelled";

export type OrderStatus = "Paid" | "Pending" | "Failed" | "Refunded";

export type UrgencyLabel =
  | { kind: "few-left" }
  | { kind: "starts-soon"; hours: number }
  | { kind: "today" }
  | { kind: "sales-end"; text: string };

export interface EventSummary {
  id: string;
  slug: string;
  name: string;
  category: EventCategory;
  startsAt: string; // ISO 8601
  timeZone: string; // IANA, e.g. "Africa/Accra"
  venueName: string;
  city: string;
  /** null = organiser uploaded no artwork; we render the branded fallback cover. */
  imageUrl: string | null;
  /** Photographer credit for sample photography. */
  imageCredit?: string;
  prices: Money[];
  seating: "assigned" | "general";
  status: EventDisplayStatus;
  urgency?: UrgencyLabel;
  organiserName: string;
  /**
   * Whether tickets can be bought right now, as decided by the server at
   * request time (sales window + status). The page never works this out
   * from the clock itself. Defaults to "open".
   */
  salesState?: "open" | "upcoming" | "closed";
  /** When sales open, for "upcoming" events (ISO 8601). */
  salesStartsAt?: string;
  /** Organiser announcement shown on the event: rescheduled, venue change, cancelled. */
  notice?: EventNotice;
}

export interface EventNotice {
  kind: "rescheduled" | "venue-changed" | "cancelled";
  title: string;
  body: string;
}

/**
 * A ticket type as the API would return it. The server is the authority on
 * price, availability and limits; the page only displays them.
 */
export interface TicketType {
  id: string;
  name: string;
  /** Short list of what this ticket includes. */
  includes: string[];
  price: Money;
  /** Tickets left. null = plenty (the API chose not to reveal a number). */
  remaining: number | null;
  /** Most a single order may contain. */
  maxPerOrder: number;
  /** e.g. "Sales end Fri 13 Nov". Shown as a warning when present. */
  salesEndText?: string;
  /** For seated events: which price tier colour this ticket uses on the map. */
  tier?: PriceTier;
}

export interface EventDetail extends EventSummary {
  description: string[];
  /** Practical notes: doors, age limit, dress code, parking. */
  goodToKnow: { label: string; value: string }[];
  address: string;
  endsAt: string;
  ticketTypes: TicketType[];
  /** Flat platform fee per paid ticket, paid by the customer. */
  bookingFeePerTicket: Money;
  /** Most tickets one order may contain across all ticket types (server enforced). */
  maxTicketsPerOrder: number;
  organiser: { name: string; about: string; eventsHosted: number };
}

export type SeatState =
  | "available"
  | "selected"
  | "held"
  | "sold"
  | "blocked";

export type PriceTier = 1 | 2 | 3;

/* ---- Seat maps -----------------------------------------------------------
 * Coordinates are in map units (one seat is about 24 units across). The map
 * is drawn once from this data; only seat states change while choosing. */

export interface MapSeat {
  id: string; // "C-C-12" = block C, row C, seat 12
  number: number;
  x: number;
  y: number;
  state: Exclude<SeatState, "selected">; // "selected" is this customer's, held in the page
  ticketTypeId: string;
  tier: PriceTier;
  accessible?: boolean;
}

export interface MapRow {
  label: string; // "A", "B", …
  seats: MapSeat[];
}

export interface MapSection {
  id: string;
  name: string; // "Centre block"
  labelX: number;
  labelY: number;
  rows: MapRow[];
}

/** A standing / general-admission area drawn on the same map. */
export interface MapZone {
  id: string;
  name: string;
  ticketTypeId: string;
  remaining: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SeatMap {
  eventId: string;
  width: number;
  height: number;
  stage: { label: string; x: number; y: number; width: number; height: number };
  sections: MapSection[];
  zones: MapZone[];
}
