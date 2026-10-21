"use client";

/**
 * Remembers this tab's hold id for an event, so a refresh or moving between
 * the event page, seat map and checkout keeps the same hold. Session storage
 * only: it's cleared when the browser closes, and it never holds personal data.
 */
const key = (eventId: string) => `vesrace-hold-${eventId}`;

export const holdSession = {
  get(eventId: string): string | null {
    try {
      return sessionStorage.getItem(key(eventId));
    } catch {
      return null;
    }
  },
  set(eventId: string, holdId: string) {
    try {
      sessionStorage.setItem(key(eventId), holdId);
    } catch {
      /* storage blocked: the hold still works until the page is left */
    }
  },
  clear(eventId: string) {
    try {
      sessionStorage.removeItem(key(eventId));
    } catch {
      /* ignore */
    }
  },
};
