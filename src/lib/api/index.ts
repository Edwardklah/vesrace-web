/**
 * The single place the frontend talks to the backend.
 *
 * Components import `api` from here and never call fetch() themselves, so
 * swapping the mock for the real `/api/v1` client is a change in this file
 * only. NEXT_PUBLIC_API_BASE_URL (see .env.example) will point the real
 * client at the server.
 */
import { mockHolds } from "./holds";

export const api = {
  holds: mockHolds, // MOCK: replace with the HTTP client when /api/v1/holds exists
};

export { ApiError, errorMessage, type ApiErrorCode } from "./errors";
export { HOLD_CHANNEL, type Hold, type HoldBroadcast } from "./holds";
