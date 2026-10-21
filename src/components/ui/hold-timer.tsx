"use client";

import { useEffect, useRef, useState } from "react";
import { Timer, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { RollingNumber } from "./rolling-number";

const WARN_AT = 120; // seconds

/**
 * Countdown for a seat/ticket hold. `expiresAt` comes from the server's
 * hold response (epoch ms); we only display it. Warns at 2 minutes and calls
 * `onExpire` once when it reaches zero.
 */
export function HoldTimer({
  expiresAt,
  onExpire,
  className,
  compact = false,
  label = "Seats held for you",
}: {
  expiresAt: number;
  onExpire: () => void;
  className?: string;
  compact?: boolean;
  /** What's being held, e.g. "Tickets held for you". */
  label?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  const fired = useRef(false);

  useEffect(() => {
    fired.current = false;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  const left = Math.max(0, Math.ceil((expiresAt - now) / 1000));

  useEffect(() => {
    if (left === 0 && !fired.current) {
      fired.current = true;
      onExpire();
    }
  }, [left, onExpire]);

  const warn = left <= WARN_AT;
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 transition-colors",
        warn ? "bg-warning-soft text-warning-fg" : "bg-primary-soft text-primary-soft-fg",
        className,
      )}
    >
      {warn ? (
        <TriangleAlert className="size-4 shrink-0" aria-hidden />
      ) : (
        <Timer className="size-4 shrink-0" aria-hidden />
      )}
      <span className="flex-1 text-small font-semibold">
        {warn ? (compact ? "Hurry" : "Less than 2 minutes left") : compact ? "Held" : label}
      </span>
      <RollingNumber value={`${mm}:${ss}`} direction={-1} live={false} className="text-body font-bold" />
      {/* Announce only the important moment, not every second. */}
      <span className="sr-only" aria-live="assertive">
        {warn && left > WARN_AT - 2 ? "Less than two minutes left to complete your order." : ""}
      </span>
    </div>
  );
}
