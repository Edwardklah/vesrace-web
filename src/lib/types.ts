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
  organiser: { name: string; about: string; eventsHosted: number };
}

export type SeatState =
  | "available"
  | "selected"
  | "held"
  | "sold"
  | "blocked";

export type PriceTier = 1 | 2 | 3;
