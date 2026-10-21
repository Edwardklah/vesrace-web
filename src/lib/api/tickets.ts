"use client";

/**
 * Find my tickets: guests get their tickets back with the phone number or
 * email they used, proven with a one-time code.
 *
 * Server rules (see docs/edge-cases.md, "Accounts and OTP"):
 * - at most 3 codes per number/email per 10 minutes, and per device;
 * - a code lasts 10 minutes, and a new one replaces the old;
 * - 5 wrong tries locks that code;
 * - the response never says whether a number has orders before the code
 *   is entered, so nobody can probe which numbers bought tickets.
 *
 * MOCK: the code is always 123456 and nothing is really sent.
 */

import { ApiError } from "./errors";
import { maskPhone, mockCheckoutStore, type OrderView } from "./checkout";

export interface CodeChallenge {
  id: string;
  channel: "phone" | "email";
  sentTo: string; // masked
  resendAvailableAt: number;
  expiresAt: number;
  serverTime: number;
}

export interface TicketsApi {
  sendCode(input: { channel: "phone" | "email"; value: string }): Promise<CodeChallenge>;
  verifyCode(input: { challengeId: string; code: string }): Promise<{ orders: OrderView[] }>;
}

export const MOCK_CODE = "123456";

const KEY = "vesrace-mock-otp";
const RESEND_AFTER = 30_000;
const LIFETIME = 10 * 60_000;
const WINDOW = 10 * 60_000;
const MAX_SENDS = 3;
const MAX_TRIES = 5;

interface ChallengeRecord {
  id: string;
  channel: "phone" | "email";
  value: string;
  sentAt: number;
  tries: number;
  replaced: boolean;
}
interface OtpStore {
  challenges: Record<string, ChallengeRecord>;
}

function load(): OtpStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as OtpStore;
  } catch {
    /* ignore */
  }
  return { challenges: {} };
}
function save(s: OtpStore) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const maskEmail = (e: string) => e.replace(/^(.).*(@.*)$/, "$1•••$2");

export const mockTickets: TicketsApi = {
  async sendCode({ channel, value }) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) throw new ApiError("OFFLINE");
    await wait(450);
    const now = Date.now();
    const v = channel === "email" ? value.trim().toLowerCase() : value;
    const s = load();
    const recent = Object.values(s.challenges).filter((c) => c.value === v && now - c.sentAt < WINDOW);
    if (recent.length >= MAX_SENDS) {
      const oldest = Math.min(...recent.map((c) => c.sentAt));
      throw new ApiError("RATE_LIMITED", { retryAfterSeconds: Math.ceil((oldest + WINDOW - now) / 1000) });
    }
    const last = recent.sort((a, b) => b.sentAt - a.sentAt)[0];
    if (last && now - last.sentAt < RESEND_AFTER) {
      throw new ApiError("RATE_LIMITED", { retryAfterSeconds: Math.ceil((last.sentAt + RESEND_AFTER - now) / 1000) });
    }
    recent.forEach((c) => (c.replaced = true)); // a new code replaces the old one
    const id = `otp_${now.toString(36)}`;
    s.challenges[id] = { id, channel, value: v, sentAt: now, tries: 0, replaced: false };
    save(s);
    return {
      id,
      channel,
      sentTo: channel === "phone" ? maskPhone(v) : maskEmail(v),
      resendAvailableAt: now + RESEND_AFTER,
      expiresAt: now + LIFETIME,
      serverTime: now,
    };
  },

  async verifyCode({ challengeId, code }) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) throw new ApiError("OFFLINE");
    await wait(500);
    const s = load();
    const c = s.challenges[challengeId];
    if (!c || c.replaced || Date.now() - c.sentAt > LIFETIME) throw new ApiError("CODE_EXPIRED");
    if (c.tries >= MAX_TRIES) throw new ApiError("CODE_LOCKED");
    if (code !== MOCK_CODE) {
      c.tries++;
      save(s);
      if (c.tries >= MAX_TRIES) throw new ApiError("CODE_LOCKED");
      throw new ApiError("CODE_WRONG", { triesLeft: MAX_TRIES - c.tries });
    }
    delete s.challenges[challengeId];
    save(s);
    const store = mockCheckoutStore.load();
    const orders = Object.values(store.orders)
      .filter((o) => {
        const contact = store.contacts[o.ref];
        return contact && (c.channel === "phone" ? contact.phone === c.value : contact.email === c.value);
      })
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return { orders };
  },
};
