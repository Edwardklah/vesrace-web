"use client";

import { useId } from "react";
import { m } from "motion/react";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Optional shorter label for phones. */
  shortLabel?: string;
  icon?: React.ReactNode;
}

/**
 * A row of choices where the highlight slides between options, like an iOS
 * segmented control. Works as a radio group for keyboard and screen readers.
 *
 * `variant="chips"` spaces the options out as separate pills (for category
 * rows that scroll sideways on phones).
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  variant = "segmented",
  fill = false,
  className,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  variant?: "segmented" | "chips";
  /** Stretch to the full width with equal segments. */
  fill?: boolean;
  className?: string;
}) {
  // Each control needs its own layoutId, or highlights would jump between them.
  const layoutId = useId();

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "flex",
        variant === "segmented"
          ? cn("gap-0.5 rounded-full bg-surface-muted p-1", fill ? "w-full" : "inline-flex")
          : "gap-2",
        className,
      )}
      onKeyDown={(e) => {
        // Arrow keys move the selection, as in a native radio group.
        const i = options.findIndex((o) => o.value === value);
        const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        const next = options[(i + step + options.length) % options.length];
        onChange(next.value);
        const el = e.currentTarget.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`);
        el?.focus();
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <m.button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            data-value={o.value}
            onClick={() => onChange(o.value)}
            whileTap={{ scale: 0.95 }}
            transition={spring.press}
            className={cn(
              "relative isolate inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-small font-semibold whitespace-nowrap transition-colors",
              fill && "flex-1 px-2 sm:px-4",
              variant === "chips" && !active && "border border-line bg-surface hover:border-line-strong",
              variant === "chips" && active && "border border-transparent",
              active
                ? variant === "chips"
                  ? "text-primary-fg"
                  : "text-fg"
                : "text-fg-muted hover:text-fg",
            )}
          >
            {active && (
              <m.span
                layoutId={layoutId}
                transition={spring.snappy}
                className={cn(
                  "absolute inset-0 -z-10 rounded-full",
                  variant === "chips" ? "bg-primary" : "bg-surface shadow-e1",
                )}
              />
            )}
            {o.icon}
            {o.shortLabel ? (
              <>
                <span className="sm:hidden">{o.shortLabel}</span>
                <span className="hidden sm:inline">{o.label}</span>
              </>
            ) : (
              o.label
            )}
          </m.button>
        );
      })}
    </div>
  );
}
