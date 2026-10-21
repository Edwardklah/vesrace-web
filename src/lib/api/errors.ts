/**
 * Error codes the API returns for ticket holds and purchases.
 * These are the contract proposed in docs/edge-cases.md. The server decides
 * them; the page only turns them into plain messages.
 */
export type ApiErrorCode =
  | "SEAT_TAKEN" // someone else got the seat first
  | "ZONE_FULL" // not enough standing tickets left
  | "LIMIT_PER_TYPE" // more of one ticket type than one order allows
  | "LIMIT_PER_ORDER" // more tickets in total than one order allows
  | "COOLDOWN" // you just let these seats expire; others get first chance
  | "SALES_NOT_OPEN"
  | "SALES_CLOSED"
  | "EVENT_CANCELLED"
  | "HOLD_EXPIRED"
  | "RATE_LIMITED" // too many attempts in a short time
  | "CODE_WRONG" // the verification code doesn't match
  | "CODE_EXPIRED" // the code is too old or was replaced by a newer one
  | "CODE_LOCKED" // too many wrong tries for this code
  | "OFFLINE" // the device has no connection
  | "NETWORK" // the request failed or timed out
  | "UNKNOWN";

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    public details: { limit?: number; ticketType?: string; retryAfterSeconds?: number; remaining?: number; triesLeft?: number } = {},
  ) {
    super(code);
    this.name = "ApiError";
  }
}

/** Plain-language message for each error, with what to do next. */
export function errorMessage(e: unknown): string {
  const err = e instanceof ApiError ? e : new ApiError("UNKNOWN");
  const d = err.details;
  switch (err.code) {
    case "SEAT_TAKEN":
      return "Someone else just took this seat. Choose another one.";
    case "ZONE_FULL":
      return d.remaining ? `Only ${d.remaining} left in this area now.` : "This area has just sold out.";
    case "LIMIT_PER_TYPE":
      return `You can choose up to ${d.limit} ${d.ticketType ?? ""} tickets per order.`.replace("  ", " ");
    case "LIMIT_PER_ORDER":
      return `You can have up to ${d.limit} tickets in one order.`;
    case "COOLDOWN":
      return `Your hold on this seat ran out, so others get the first chance. Try again in ${Math.ceil((d.retryAfterSeconds ?? 120) / 60)} min, or choose another seat.`;
    case "SALES_NOT_OPEN":
      return "Tickets for this event aren't on sale yet.";
    case "SALES_CLOSED":
      return "Ticket sales for this event have ended.";
    case "EVENT_CANCELLED":
      return "This event has been cancelled, so tickets can't be bought.";
    case "HOLD_EXPIRED":
      return "Your hold ran out. Choose your seats again.";
    case "RATE_LIMITED":
      {
        const secs = d.retryAfterSeconds ?? 10;
        const wait = secs > 90 ? `${Math.ceil(secs / 60)} minutes` : `${secs} seconds`;
        return `That was a lot of tries in a short time. Wait ${wait} and try again.`;
      }
    case "CODE_WRONG":
      return d.triesLeft === 1 ? "That code isn't right. You have 1 try left." : `That code isn't right. You have ${d.triesLeft} tries left.`;
    case "CODE_EXPIRED":
      return "That code has expired. Send a new one.";
    case "CODE_LOCKED":
      return "Too many wrong tries for this code. Send a new one.";
    case "OFFLINE":
      return "You're offline. Seats can only be held while you're connected.";
    case "NETWORK":
      return "We couldn't reach Vesrace. Check your connection and try again.";
    default:
      return "Something went wrong. Try again.";
  }
}
