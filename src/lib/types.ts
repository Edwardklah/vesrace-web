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

export type SeatState =
  | "available"
  | "selected"
  | "held"
  | "sold"
  | "blocked";

export type PriceTier = 1 | 2 | 3;
