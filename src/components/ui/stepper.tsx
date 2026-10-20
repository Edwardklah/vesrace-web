"use client";

import { useState } from "react";
import { m } from "motion/react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";
import { RollingNumber } from "./rolling-number";

/**
 * Quantity stepper: − 2 +. The number rolls when it changes.
 * At the limit, the + button nudges sideways instead of doing nothing,
 * so it's clear the limit was reached (and the reason is shown by the caller).
 */
export function Stepper({
  value,
  onChange,
  min = 0,
  max,
  label,
  size = "md",
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max: number;
  /** e.g. "Regular tickets" — used for the buttons' accessible names. */
  label: string;
  size?: "md" | "lg";
}) {
  const [dir, setDir] = useState<1 | -1>(1);
  const atMax = value >= max;
  const atMin = value <= min;
  const btn = size === "lg" ? "size-14" : "size-11";

  const change = (d: 1 | -1) => {
    const next = value + d;
    if (next < min || next > max) return;
    setDir(d);
    onChange(next);
  };

  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={label}>
      <m.button
        type="button"
        onClick={() => change(-1)}
        whileTap={atMin ? undefined : { scale: 0.85 }}
        transition={spring.press}
        aria-label={`Remove one ${label}`}
        aria-disabled={atMin || undefined}
        className={cn(
          "grid place-items-center rounded-full border transition-colors",
          btn,
          atMin
            ? "cursor-not-allowed border-line text-fg-subtle"
            : "border-line-strong text-fg hover:bg-surface-muted",
        )}
      >
        <Minus className="size-4" aria-hidden />
      </m.button>
      <RollingNumber
        value={String(value)}
        direction={dir}
        className={cn("justify-center font-semibold", size === "lg" ? "w-8 text-h2" : "w-6 text-h3")}
      />
      <m.button
        type="button"
        onClick={() => change(1)}
        whileTap={atMax ? { x: [0, -4, 4, -2, 0] } : { scale: 0.85 }}
        transition={atMax ? { duration: 0.3 } : spring.press}
        aria-label={`Add one ${label}`}
        aria-disabled={atMax || undefined}
        className={cn(
          "grid place-items-center rounded-full border transition-colors",
          btn,
          atMax
            ? "cursor-not-allowed border-line text-fg-subtle"
            : "border-primary bg-primary text-primary-fg hover:bg-primary-hover",
        )}
      >
        <Plus className="size-4" aria-hidden />
      </m.button>
    </div>
  );
}
