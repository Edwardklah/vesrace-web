/**
 * The single place the frontend talks to the backend.
 *
 * Components import `api` from here and never call fetch() themselves, so
 * swapping the mock for the real `/api/v1` client is a change in this file
 * only. NEXT_PUBLIC_API_BASE_URL (see .env.example) will point the real
 * client at the server.
 */
import { mockCheckout } from "./checkout";
import { mockHolds } from "./holds";
import { mockTickets } from "./tickets";

export const api = {
  holds: mockHolds, // MOCK: replace with the HTTP client when /api/v1/holds exists
  checkout: mockCheckout, // MOCK: /api/v1/orders and /api/v1/payments
  tickets: mockTickets, // MOCK: /api/v1/ticket-lookup (one-time code)
};

export { ApiError, errorMessage, type ApiErrorCode } from "./errors";
export { HOLD_CHANNEL, type Hold, type HoldBroadcast } from "./holds";
export {
  maskPhone,
  networkFromPhone,
  networkName,
  type Customer,
  type IssuedTicket,
  type Network,
  type OrderView,
  type Payment,
  type Quote,
} from "./checkout";
export { MOCK_CODE, type CodeChallenge } from "./tickets";
