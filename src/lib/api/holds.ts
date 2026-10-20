"use client";

/**
 * Holds API: reserving seats/tickets for a few minutes while someone pays.
 *
 * The page talks to this interface only. Today it's backed by MOCK code
 * (below) that imitates the server rules from docs/edge-cases.md, so the
 * page's handling of every case can be reviewed. The real implementation
 * will call POST/PATCH/DELETE /api/v1/holds and must enforce the same rules
 * on the server: nothing here can be trusted for real security.
 *
 * Review switches (add to the page URL):
 *   ?hold=30          hold length in seconds (default 600)
 *   ?simulate=taken   the next seat you add is "taken by someone else"
 *   ?simulate=rate    the next request is rate-limited
 *   ?skew=120         pretend this phone's clock is 2 minutes slow
 */

import { getEventById } from "@/data/sample-event-details";
import { getSeatMap } from "@/data/sample-seat-maps";
import { ApiError } from "./errors";

export interface Hold {
  id: string;
  eventId: string;
  seatIds: string[];
  /** Standing / general admission quantities by zone id. */
  zones: Record<string, number>;
  /** When the hold ends, in the server's clock (epoch ms). */
  expiresAt: number;
  /** The server's clock when it answered, so the page can correct for a wrong phone clock. */
  serverTime: number;
}

export interface HoldsApi {
  get(holdId: string): Promise<Hold | null>;
  addSeat(input: { eventId: string; holdId: string | null; seatId: string }): Promise<Hold>;
  removeSeat(input: { holdId: string; seatId: string }): Promise<Hold>;
  setZone(input: { eventId: string; holdId: string | null; zoneId: string; quantity: number }): Promise<Hold>;
  release(holdId: string): Promise<void>;
}

/** Messages other tabs receive when a hold changes. */
export type HoldBroadcast = { type: "hold-replaced" | "hold-released"; eventId: string; holdId: string };
export const HOLD_CHANNEL = "vesrace-holds";

/* ======================================================================
 * MOCK SERVER
 * ==================================================================== */

const STORE_KEY = "vesrace-mock-holds";
const HOLD_SECONDS = 600;
const COOLDOWN_SECONDS = 120;
const RATE_WINDOW_MS = 10_000;
const RATE_MAX = 15;

type HoldRecord = Omit<Hold, "serverTime">;

interface Store {
  holds: Record<string, HoldRecord>;
  cooldowns: Record<string, number>; // seatId -> until (ms)
  calls: number[];
}

function param(name: string) {
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch {
    return null;
  }
}

/* The mock keeps its state in localStorage so it survives refreshes and is
   shared between tabs, the way a real server would be. */
function load(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as Store;
  } catch {
    /* storage unavailable: start empty */
  }
  return { holds: {}, cooldowns: {}, calls: [] };
}
function save(s: Store) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

const serverNow = () => Date.now() + Number(param("skew") ?? 0) * 1000;
const latency = () => new Promise((r) => setTimeout(r, 250 + Math.random() * 250));

function broadcast(msg: HoldBroadcast) {
  try {
    const ch = new BroadcastChannel(HOLD_CHANNEL);
    ch.postMessage(msg);
    ch.close();
  } catch {
    /* older browsers: other tabs find out on their next request */
  }
}

/** Shared checks every request goes through, like server middleware. */
async function begin(store: Store) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new ApiError("OFFLINE");
  await latency();
  const now = serverNow();
  store.calls = store.calls.filter((t) => now - t < RATE_WINDOW_MS);
  store.calls.push(now);
  const sim = sessionStorage.getItem("vesrace-sim-used") ? null : param("simulate");
  if (sim === "rate" || store.calls.length > RATE_MAX) {
    if (sim) sessionStorage.setItem("vesrace-sim-used", "1");
    save(store);
    throw new ApiError("RATE_LIMITED", { retryAfterSeconds: 10 });
  }
  // Expire old holds; expired seats go into a short cooldown for this customer.
  for (const h of Object.values(store.holds)) {
    if (h.expiresAt <= now) {
      h.seatIds.forEach((id) => (store.cooldowns[id] = now + COOLDOWN_SECONDS * 1000));
      delete store.holds[h.id];
    }
  }
  for (const [id, until] of Object.entries(store.cooldowns)) if (until <= now) delete store.cooldowns[id];
  return now;
}

function checkEvent(eventId: string) {
  const event = getEventById(eventId);
  if (!event) throw new ApiError("UNKNOWN");
  if (event.status === "Cancelled" || event.notice?.kind === "cancelled") throw new ApiError("EVENT_CANCELLED");
  if (event.salesState === "upcoming") throw new ApiError("SALES_NOT_OPEN");
  if (event.salesState === "closed") throw new ApiError("SALES_CLOSED");
  return event;
}

/** One active hold per customer per event: a new one replaces the old. */
function holdFor(store: Store, eventId: string, holdId: string | null, now: number) {
  if (holdId && store.holds[holdId]) return store.holds[holdId];
  if (holdId && !store.holds[holdId]) throw new ApiError("HOLD_EXPIRED");
  for (const h of Object.values(store.holds)) {
    if (h.eventId === eventId) {
      delete store.holds[h.id];
      broadcast({ type: "hold-replaced", eventId, holdId: h.id });
    }
  }
  const secs = Number(param("hold")) > 0 ? Number(param("hold")) : HOLD_SECONDS;
  const h: HoldRecord = { id: `hold_${now.toString(36)}`, eventId, seatIds: [], zones: {}, expiresAt: now + secs * 1000 };
  store.holds[h.id] = h;
  return h;
}

function countTickets(h: HoldRecord) {
  return h.seatIds.length + Object.values(h.zones).reduce((a, b) => a + b, 0);
}

function typeCount(h: HoldRecord, ticketTypeId: string) {
  const map = getSeatMap(h.eventId);
  if (!map) return 0;
  const seatTypes = new Map(map.sections.flatMap((s) => s.rows.flatMap((r) => r.seats.map((x) => [x.id, x.ticketTypeId] as const))));
  const fromSeats = h.seatIds.filter((id) => seatTypes.get(id) === ticketTypeId).length;
  const fromZones = map.zones.filter((z) => z.ticketTypeId === ticketTypeId).reduce((n, z) => n + (h.zones[z.id] ?? 0), 0);
  return fromSeats + fromZones;
}

const done = (store: Store, h: HoldRecord, now: number): Hold => {
  save(store);
  return { ...h, seatIds: [...h.seatIds], zones: { ...h.zones }, serverTime: now };
};

export const mockHolds: HoldsApi = {
  async get(holdId) {
    const store = load();
    const now = await begin(store);
    const h = store.holds[holdId];
    save(store);
    return h ? done(store, h, now) : null;
  },

  async addSeat({ eventId, holdId, seatId }) {
    const store = load();
    const now = await begin(store);
    const event = checkEvent(eventId);
    const seat = getSeatMap(eventId)?.sections.flatMap((s) => s.rows.flatMap((r) => r.seats)).find((x) => x.id === seatId);
    if (!seat) throw new ApiError("UNKNOWN");

    if (param("simulate") === "taken" && !sessionStorage.getItem("vesrace-sim-used")) {
      sessionStorage.setItem("vesrace-sim-used", "1");
      save(store);
      throw new ApiError("SEAT_TAKEN");
    }
    if (seat.state !== "available") throw new ApiError("SEAT_TAKEN");
    if (store.cooldowns[seatId]) {
      save(store);
      throw new ApiError("COOLDOWN", { retryAfterSeconds: Math.ceil((store.cooldowns[seatId] - now) / 1000) });
    }
    // Another of this customer's holds (another tab) already has it.
    const existing = holdId ? store.holds[holdId] : null;
    const tt = event.ticketTypes.find((t) => t.id === seat.ticketTypeId)!;
    const probe: HoldRecord = existing ?? { id: "", eventId, seatIds: [], zones: {}, expiresAt: 0 };
    if (typeCount(probe, tt.id) + 1 > tt.maxPerOrder) throw new ApiError("LIMIT_PER_TYPE", { limit: tt.maxPerOrder, ticketType: tt.name });
    if (countTickets(probe) + 1 > event.maxTicketsPerOrder) throw new ApiError("LIMIT_PER_ORDER", { limit: event.maxTicketsPerOrder });

    const h = holdFor(store, eventId, holdId, now);
    if (!h.seatIds.includes(seatId)) h.seatIds.push(seatId);
    return done(store, h, now);
  },

  async removeSeat({ holdId, seatId }) {
    const store = load();
    const now = await begin(store);
    const h = store.holds[holdId];
    if (!h) throw new ApiError("HOLD_EXPIRED");
    h.seatIds = h.seatIds.filter((x) => x !== seatId);
    // The hold keeps its original expiry even when empty, so removing and
    // re-adding seats can't be used to restart the timer.
    return done(store, h, now);
  },

  async setZone({ eventId, holdId, zoneId, quantity }) {
    const store = load();
    const now = await begin(store);
    const event = checkEvent(eventId);
    const zone = getSeatMap(eventId)?.zones.find((z) => z.id === zoneId);
    if (!zone) throw new ApiError("UNKNOWN");
    if (quantity > zone.remaining) throw new ApiError("ZONE_FULL", { remaining: zone.remaining });
    const existing = holdId ? store.holds[holdId] : null;
    const probe: HoldRecord = { ...(existing ?? { id: "", eventId, seatIds: [], zones: {}, expiresAt: 0 }) };
    probe.zones = { ...probe.zones, [zoneId]: quantity };
    const tt = event.ticketTypes.find((t) => t.id === zone.ticketTypeId)!;
    if (typeCount(probe, tt.id) > tt.maxPerOrder) throw new ApiError("LIMIT_PER_TYPE", { limit: tt.maxPerOrder, ticketType: tt.name });
    if (countTickets(probe) > event.maxTicketsPerOrder) throw new ApiError("LIMIT_PER_ORDER", { limit: event.maxTicketsPerOrder });
    const h = holdFor(store, eventId, holdId, now);
    if (quantity > 0) h.zones[zoneId] = quantity;
    else delete h.zones[zoneId];
    return done(store, h, now);
  },

  async release(holdId) {
    const store = load();
    await begin(store);
    const h = store.holds[holdId];
    if (h) {
      delete store.holds[holdId];
      broadcast({ type: "hold-released", eventId: h.eventId, holdId });
    }
    save(store);
  },
};
