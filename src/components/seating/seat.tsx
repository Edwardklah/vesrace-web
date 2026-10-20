"use client";

import { m } from "motion/react";
import { Accessibility, Check, Clock, Minus, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { pressScale, spring } from "@/lib/motion";
import type { PriceTier, SeatState } from "@/lib/types";

const tierColour: Record<PriceTier, string> = {
  1: "var(--seat-tier-1)",
  2: "var(--seat-tier-2)",
  3: "var(--seat-tier-3)",
};

export interface SeatProps {
  state: SeatState;
  tier?: PriceTier;
  /** Wheelchair or companion seat. Shown with an icon in every state. */
  accessible?: boolean;
  /** Full description for screen readers, e.g. "Section A, row C, seat 12, VIP, GH₵ 500.00". */
  label: string;
  size?: number;
  onToggle?: () => void;
  /** Static seats (legend, previews) render as non-interactive. */
  interactive?: boolean;
}

/**
 * One seat. Each state differs by shape and icon as well as colour, so it
 * reads correctly without colour (brief: never colour alone):
 *   available  solid ring in its price-tier colour, empty centre
 *   selected   filled disc with a check, pops when chosen
 *   held       dashed ring with a clock (someone else is checking out)
 *   sold       filled grey disc with a cross
 *   blocked    dashed grey ring with a bar
 *   accessible wheelchair icon (combines with available / selected)
 */
export function Seat({
  state,
  tier = 2,
  accessible = false,
  label,
  size = 28,
  onToggle,
  interactive = true,
}: SeatProps) {
  const selectable = state === "available" || state === "selected";
  const icon = Math.round(size * 0.55);
  const ring = accessible && state === "available" ? "var(--seat-accessible)" : tierColour[tier];

  const style: React.CSSProperties = { width: size, height: size };
  let look = "";
  let content: React.ReactNode = null;

  switch (state) {
    case "available":
      style.borderColor = ring;
      look = "border-2 bg-surface";
      content = accessible ? (
        <Accessibility style={{ width: icon, height: icon, color: ring }} strokeWidth={2.25} />
      ) : null;
      break;
    case "selected":
      style.backgroundColor = "var(--seat-selected)";
      style.color = "var(--seat-selected-fg)";
      look = "shadow-e1";
      content = accessible ? (
        <Accessibility style={{ width: icon, height: icon }} strokeWidth={2.5} />
      ) : (
        <Check style={{ width: icon, height: icon }} strokeWidth={3} />
      );
      break;
    case "held":
      style.borderColor = "var(--seat-held)";
      style.color = "var(--seat-held)";
      look = "border-2 border-dashed bg-surface";
      content = <Clock style={{ width: icon, height: icon }} strokeWidth={2.25} />;
      break;
    case "sold":
      style.backgroundColor = "var(--seat-sold)";
      style.color = "var(--seat-sold-fg)";
      content = <X style={{ width: icon, height: icon }} strokeWidth={2.5} />;
      break;
    case "blocked":
      style.borderColor = "var(--seat-blocked)";
      style.color = "var(--seat-blocked)";
      look = "border-2 border-dashed bg-surface-muted";
      content = <Minus style={{ width: icon, height: icon }} strokeWidth={2.5} />;
      break;
  }

  const stateText = {
    available: "available",
    selected: "selected",
    held: "held by another customer",
    sold: "sold",
    blocked: "unavailable",
  }[state];

  const className = cn(
    "relative grid shrink-0 place-items-center rounded-full",
    selectable && interactive && "cursor-pointer",
    !selectable && interactive && "cursor-not-allowed",
    look,
  );

  if (!interactive) {
    return (
      <span className={className} style={style} aria-hidden>
        {content}
      </span>
    );
  }

  return (
    <m.button
      type="button"
      role="checkbox"
      aria-checked={state === "selected"}
      aria-disabled={!selectable}
      aria-label={`${label}, ${stateText}${accessible ? ", accessible seat" : ""}`}
      onClick={selectable ? onToggle : undefined}
      whileTap={selectable ? { scale: pressScale.seat } : undefined}
      transition={spring.press}
      className={className}
      style={style}
    >
      {/* Re-keyed on every state change, so a newly selected seat's check
          springs in with a little overshoot. */}
      <m.span
        key={state}
        initial={state === "selected" ? { scale: 0.3, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={spring.pop}
        className="grid place-items-center"
      >
        {content}
      </m.span>
    </m.button>
  );
}
