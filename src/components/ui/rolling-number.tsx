"use client";

import { AnimatePresence, m } from "motion/react";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";

/**
 * Text whose changing characters roll vertically, like iOS counters.
 * Pass already-formatted text (e.g. "GH₵ 400.00"); only characters that
 * change animate, and they roll up when the number grows, down when it shrinks.
 */
export function RollingNumber({
  value,
  direction = 1,
  className,
  live = true,
}: {
  value: string;
  /** 1 = value went up, -1 = went down. */
  direction?: 1 | -1;
  className?: string;
  /** Announce changes to screen readers. Turn off for values that tick every second. */
  live?: boolean;
}) {
  // Align from the right so units/pesewas stay put as digits are added.
  const chars = value.split("");
  return (
    <span className={cn("inline-flex overflow-hidden tabular", className)} aria-live={live ? "polite" : undefined}>
      <span className="sr-only">{value}</span>
      <span aria-hidden className="inline-flex">
        {chars.map((ch, i) => {
          const fromRight = chars.length - i;
          return (
            <span key={fromRight} className="relative inline-block">
              <AnimatePresence initial={false} mode="popLayout" custom={direction}>
                <m.span
                  key={ch}
                  custom={direction}
                  variants={{
                    enter: (d: number) => ({ y: d > 0 ? "100%" : "-100%", opacity: 0 }),
                    center: { y: "0%", opacity: 1 },
                    exit: (d: number) => ({ y: d > 0 ? "-100%" : "100%", opacity: 0 }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={spring.snappy}
                  className="inline-block whitespace-pre"
                >
                  {ch}
                </m.span>
              </AnimatePresence>
            </span>
          );
        })}
      </span>
    </span>
  );
}
