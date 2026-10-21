# Vesrace: edge cases, abuse and failure handling

What happens in each awkward situation, who is responsible for stopping it,
and whether it's built yet. Use it as the checklist for the frontend and the
contract for the backend.

**The rule behind all of it:** the page explains, the server enforces. Anything
the page does (disabling a button, hiding a stepper, counting down) is for the
customer's benefit only. A determined person can skip the page and call the API
directly, so every limit below must also be checked on the server.

**Status key**

| Status | Meaning |
| --- | --- |
| **Built** | Working in the current frontend (against the mock API) |
| **With screen X** | Handled when that screen is built; the behaviour is specified here |
| **Backend** | Needs the real server; the page only shows the result |

**Who enforces**: *Server* (must be on the backend), *Page* (frontend only, a
convenience), or *Both*.

---

## 1. Seat and ticket holds

A hold reserves seats or standing tickets for a short time while someone pays.
It's the main thing people try to abuse.

| Situation | What happens | Who | Status |
| --- | --- | --- | --- |
| Someone holds seats they never buy, again and again | Hold lasts 10 minutes. When it runs out, those seats are released and the same customer can't take them again for 2 minutes, so others get first chance | Server | Built (mock) |
| Removing all seats and re-adding to restart the timer | The hold keeps its original end time even when it's empty. Only a brand-new hold (after the old one ends) gets a fresh 10 minutes | Server | Built (mock) |
| Holding huge numbers of seats | Up to `maxPerOrder` of each ticket type and `maxTicketsPerOrder` in total (10 by default, set by the organiser). Refused with `LIMIT_PER_TYPE` / `LIMIT_PER_ORDER` | Both | Built |
| Opening many tabs to hold more seats | One active hold per customer per event. Starting a new one in another tab replaces the old one, and the old tab is told "Your seats moved to another tab" | Server (page listens) | Built |
| Two people tap the same seat at the same moment | The server gives it to whoever's request lands first. The other sees "Someone else just took this seat", and the seat turns grey on their map | Server | Built |
| Script hammering the hold endpoint | Rate limit (mock: 15 requests per 10 seconds per customer). Refused with `RATE_LIMITED` and a wait time | Server | Built (mock) |
| Many accounts / phone numbers to get round limits | Limits are per customer *and* per device/IP and per payment number. Repeated holds from the same device that never pay get a longer cooldown, then a challenge | Server | Backend |
| Tab closed or page refreshed while holding seats | The hold is **kept**, not released. Coming back to the seat page in the same browser restores it with the same timer. If nobody returns, it simply expires | Both | Built |
| Customer clears seats on purpose | "Clear all" or removing the last seat releases them straight away | Server | Built |
| Hold runs out mid-selection | A dialog says the seats were released and explains the 2-minute cooldown on those exact seats. Other seats can be chosen at once | Page | Built |
| Hold runs out during payment | If MoMo approval arrives after the hold ended, the server checks whether the seats are still free. If yes, the order completes. If not, the money is refunded automatically and the customer is told clearly. (The mock simply shows the "time ran out" screen.) | Server | Built (page), Backend (late approvals) |
| Phone clock is wrong | Every response includes `serverTime`. The timer uses the difference, so a phone that's minutes slow still shows the right time left | Page | Built |
| Accessible (wheelchair) seats taken by people who don't need them | The seat panel asks people to choose them only if someone in their group needs it. Organisers can hold them back until close to the date and release them to everyone later | Both | Built (message), Backend (release rule) |
| Standing area sells out while choosing | Refused with `ZONE_FULL`, including how many are left | Server | Built |

**Payment review switches** (add to the checkout URL): `?pay=decline`, `?pay=funds`, `?pay=timeout`. Without one, the MoMo prompt is approved after about 7 seconds.

**Review switches** (add to the seat page URL, mock only):
`?hold=30` short hold, `?simulate=taken` next seat is taken by someone else,
`?simulate=rate` next request is rate-limited, `?skew=120` phone clock 2 minutes slow.

## 2. Event lifecycle

| Situation | What happens | Who | Status |
| --- | --- | --- | --- |
| Not on sale yet | Card: "On sale 30 Oct · From GH₵ 180". Event page: date and time sales open, a live countdown and "Remind me" (mock). No steppers. Seat page redirects to the event page. Holds refused with `SALES_NOT_OPEN` | Both | Built |
| Sales open at a set time and many people arrive at once | The countdown hits zero and asks for a refresh. For big launches, a waiting room (queue with position) sits in front of the hold endpoint | Server | Backend |
| Sold out | Card and page say "Sold out", with similar events. No bottom bar on phones | Both | Built |
| Sales ended (but event not over) | "Ticket sales have ended", with a note that the organiser may sell at the door | Both | Built |
| Event cancelled | Red notice at the top, "Event cancelled" panel with Find my tickets, card labelled "Cancelled". Not counted in category totals; left out of "similar events". Holds refused with `EVENT_CANCELLED` | Both | Built |
| Refunds after cancellation | Automatic full refund, including the booking fee, to the number or card that paid. Customers get an SMS | Server | Backend |
| Rescheduled | Blue notice with the new date. Card shows "Rescheduled". Existing tickets stay valid; refunds allowed until the old date | Both | Built (display), Backend (refunds) |
| Venue changed | Blue notice with the new venue (same component, `venue-changed`) | Page | Built (component); no sample event uses it yet |
| Event already happened | Card and page show "Ended". Tickets can't be bought; ticket holders still see their ticket | Both | With event lifecycle job |
| Prices change while someone is choosing | The event-page total is a preview. Checkout shows the server's quote (lines, booking fee, total) before payment | Server | Built (mock quote) |

## 3. Payments (MoMo and card)

| Situation | What happens | Who | Status |
| --- | --- | --- | --- |
| Customer never approves the MoMo prompt | Waiting screen with the hold timer, a 2-minute prompt countdown, "No prompt on your phone?" help, "Resend prompt" after 30 seconds, "Use a different number" and "Cancel payment". If it expires: "We didn't get an approval", nothing taken, send a new prompt | Both | Built (mock) |
| Wrong number typed | Number is validated (10 digits, Ghana prefix) and shown back on the payment step ("Pay from 024 412 3456"); the network is picked from the prefix and can be changed | Page | Built |
| Not enough balance / prompt declined | Plain message for each ("Payment declined", "Not enough money in this wallet"), nothing taken, with "Send a new prompt" or "Pay another way". Hold time keeps running | Both | Built (mock) |
| Payment approved but the page lost connection | The server finishes the order from the provider's callback, not the page. The customer gets the ticket by SMS and in Find my tickets | Server | Backend |
| Paying twice (double tap, two tabs, retry) | Every payment attempt carries an idempotency key tied to the hold. The server accepts only one successful payment per hold and refunds any duplicate | Server | Built (page sends the key; mock honours it), Backend |
| Provider callback arrives late, twice or out of order | Callbacks are verified (signature), stored and processed once. Order state only moves forward | Server | Backend |
| Approved after the hold ended | See section 1: complete if seats are still free, otherwise automatic refund | Server | Backend |
| Chargebacks / stolen cards | Card payments go through 3-D Secure. Tickets on disputed payments are cancelled and can't be scanned | Server | Backend |
| Free events | "Reserve tickets", no payment step. Same per-order limits, plus a per-phone-number limit so free events can't be emptied | Both | Built (label), Backend (limit) |

## 4. Tickets, entry and scanning

| Situation | What happens | Who | Status |
| --- | --- | --- | --- |
| Screenshot of a QR shared with friends | The QR is signed and checked online. The first scan admits; any later scan shows "Already used at 7:42 PM, Gate B" in red | Server | With scanner |
| Rotating QR to stop screenshots | The ticket page shows a code that changes every 30 seconds when online. Offline it falls back to the static signed code | Both | With issued ticket screen |
| Fake or edited QR | Signature fails, scanner shows "Not a valid Vesrace ticket" | Server | With scanner |
| No signal at the gate | Scanners download the guest list beforehand and check signatures offline, then sync. Two offline scanners could both admit one copy; sync flags it for the organiser | Both | With scanner |
| Customer lost their phone | Find my tickets (`/tickets/find`) by phone number or email + a 6-digit code, from any device. Results split into Upcoming and Past. The organiser can also look them up by name or number at the door | Both | Built (mock; code is 123456), Backend (door lookup) |
| Ticket for the wrong event or date | Scanner shows the event name and date it belongs to, in red | Server | With scanner |
| Refunded or cancelled ticket scanned | "Refunded: not valid" | Server | With scanner |

## 5. Box office (POS)

| Situation | What happens | Who | Status |
| --- | --- | --- | --- |
| Door sales with no internet | Not allowed: selling needs a live connection so seats aren't sold twice. The POS says so clearly and offers scanning only | Both | With POS |
| Cash discrepancies | Every sale is tied to the staff member and shift, with an end-of-shift summary | Server | Backend |
| Staff member leaves mid-event | Organiser can sign them out of all devices instantly | Server | With organiser team screen |

## 6. Accounts and OTP

| Situation | What happens | Who | Status |
| --- | --- | --- | --- |
| OTP bombing (requesting codes to someone else's number) | 3 codes per number/email per 10 minutes and one per 30 seconds; the page shows the wait. Also limited per device on the server | Server | Built (mock), Backend (per device) |
| Guessing OTP codes | Tries left are shown; 5 wrong tries locks that code and a new one must be sent. A new code replaces the old one, and codes last 10 minutes | Server | Built (mock) |
| Checking which numbers bought tickets | The lookup never says whether a number has orders until the code is entered, so it can't be used to probe numbers | Server | Built (mock) |
| SIM swap / number recycled | Changing the number on an account needs the old number or support. Large purchases on a recently changed number get extra checks | Server | Backend |
| Checking out without an account | Allowed with a phone number. Tickets are linked to that number and can be claimed later | Both | Built (guest checkout) |

## 7. Organisers and staff

| Situation | What happens | Who | Status |
| --- | --- | --- | --- |
| Fake events to collect payments | New organisers are verified before payouts. Payouts are held until after the event | Server | Backend |
| Organiser edits an event after tickets are sold | Date, venue and cancellation changes notify every ticket holder and create the notice on the page | Both | With dashboard |
| Reducing capacity below tickets sold | Blocked; the dashboard shows how many are already sold | Both | With dashboard |
| Staff seeing more than they should | Roles: owner, manager, box office, scanner. Scanners never see sales figures | Server | With dashboard |

## 8. Touts and resale

| Situation | What happens | Who | Status |
| --- | --- | --- | --- |
| Bulk buying for resale | Per-order and per-customer limits across all orders for the event, plus device and payment-number checks (section 1) | Server | Backend |
| Selling tickets at inflated prices elsewhere | Optional official transfer: the ticket moves to the new holder's number and the old QR stops working, so buyers have a safe route. Organisers can cap the transfer price | Server | Later phase |
| Bots | Rate limits, waiting room for big launches, challenge after suspicious patterns. No challenge for normal customers | Server | Backend |

## 9. Reliability, clocks and tabs

| Situation | What happens | Who | Status |
| --- | --- | --- | --- |
| Connection drops on the event page | Warning in the panel and bottom bar; Continue is disabled. Browsing still works | Page | Built |
| Connection drops on the seat page | Banner at the top; Add buttons say "Reconnect to add this seat". Nothing is sent while offline | Page | Built |
| Slow or failed request | Each button shows its own loading state, and a plain error with what to do next. One request at a time, so double taps don't send twice | Page | Built |
| Two tabs open on the same event | Each tab starts empty. As soon as one tab holds a seat, it replaces any hold from the other tab, and the other tab shows "Your seats moved to another tab" | Both | Built |
| Low-end phones / Data Saver | Blur effects switch off and images are smaller (see README, "lite" mode) | Page | Built |
| Server down during a big launch | Status message instead of an error page, and the waiting room holds people's place | Server | Backend |

## 10. Accessibility

| Situation | What happens | Who | Status |
| --- | --- | --- | --- |
| Can't use the seat map (screen reader, keyboard, motor) | "List" view of the same seats, grouped by section and row, with the same Add button | Page | Built |
| Messages only shown by colour | Every state has text and an icon as well (sold out, few left, errors) | Page | Built |
| Errors not announced | Errors and state changes use `role="alert"` / `role="status"` | Page | Built |
| Reduced motion | Animations respect the system setting | Page | Built |

## 11. Privacy

| Situation | What happens | Who | Status |
| --- | --- | --- | --- |
| Phone numbers in URLs or logs | Never in URLs. Masked on screen after payment (024 ••• 4567); the server only sends masked numbers back | Both | Built (page), Backend (logs) |
| Organiser exports of customer data | Only what's needed for entry (name, ticket, number masked unless the customer opted in to marketing) | Server | With dashboard |
| Shared or public computer | Hold ids live in session storage only (cleared when the browser closes). No card details are stored by Vesrace | Page | Built |

---

## Backend contract for holds

```
POST   /api/v1/holds                 { eventId, seatId? , zoneId?, quantity? } -> Hold
PATCH  /api/v1/holds/:id             { addSeat? | removeSeat? | zone? }        -> Hold
GET    /api/v1/holds/:id                                                        -> Hold | 404
DELETE /api/v1/holds/:id                                                        -> 204
```

`Hold` response:

```ts
{
  id: string;
  eventId: string;
  seatIds: string[];
  zones: Record<string, number>;   // standing quantities by zone id
  expiresAt: number;               // server clock, epoch ms
  serverTime: number;              // server clock when it answered
}
```

Rules the server must apply (the mock in `src/lib/api/holds.ts` imitates them):

1. One active hold per customer per event. A new POST replaces the old one and notifies the customer's other sessions.
2. The hold's `expiresAt` is set once, when it's created. Adding or removing seats never moves it.
3. Expired seats are released at once but blocked for the same customer for 2 minutes.
4. Per-type (`maxPerOrder`) and per-order (`maxTicketsPerOrder`) limits on every change, counted across seats and standing.
5. Seat changes are atomic: a seat is either in exactly one hold or sold.
6. Event must be published, on sale and not cancelled.
7. Rate limit per customer, device and IP.
8. Payment completes against the hold; an approval after expiry follows section 1.

## Error codes

The page turns each code into a plain message (`src/lib/api/errors.ts`).

| Code | When | Extra details |
| --- | --- | --- |
| `SEAT_TAKEN` | Someone else got the seat first | |
| `ZONE_FULL` | Not enough standing tickets left | `remaining` |
| `LIMIT_PER_TYPE` | Too many of one ticket type | `limit`, `ticketType` |
| `LIMIT_PER_ORDER` | Too many tickets in total | `limit` |
| `COOLDOWN` | You just let this seat expire | `retryAfterSeconds` |
| `SALES_NOT_OPEN` | Sales haven't started | |
| `SALES_CLOSED` | Sales have ended | |
| `EVENT_CANCELLED` | Event was cancelled | |
| `HOLD_EXPIRED` | The hold no longer exists | |
| `RATE_LIMITED` | Too many requests | `retryAfterSeconds` |
| `OFFLINE` | Device has no connection (page only) | |
| `NETWORK` | Request failed or timed out (page only) | |
| `UNKNOWN` | Anything else | |
