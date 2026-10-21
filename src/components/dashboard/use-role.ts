"use client";

import { useSyncExternalStore } from "react";
import { organiser, type Role } from "@/data/sample-dashboard";

/*
 * MOCK: the signed-in person's role. The real value comes from the session
 * (and the server still checks every action). For review, add `?role=manager`
 * to any dashboard URL to see what an event manager sees.
 */
const read = (): Role => {
  const r = new URLSearchParams(window.location.search).get("role");
  return r === "manager" ? "manager" : organiser.user.role;
};
const subscribe = (cb: () => void) => {
  window.addEventListener("popstate", cb);
  return () => window.removeEventListener("popstate", cb);
};

export function useRole(): Role {
  return useSyncExternalStore(subscribe, read, () => organiser.user.role);
}

export const roleLabel: Record<Role, string> = { owner: "Owner", manager: "Event manager" };

/** A review-only URL switch such as `?state=empty`. Null on the server and until hydrated. */
export function useReviewParam(name: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(window.location.search).get(name),
    () => null,
  );
}
