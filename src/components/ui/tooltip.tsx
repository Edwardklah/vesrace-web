"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, m } from "motion/react";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";

/**
 * Tooltip that works for everyone:
 * - mouse: shows on hover (after a short delay so it doesn't flicker)
 * - keyboard: shows on focus, Escape hides it
 * - touch: tap the trigger to show, tap anywhere else to hide
 *
 * It renders at the end of <body>, so it isn't clipped by scrolling rows,
 * and it flips above the trigger / stays inside the screen when needed.
 */
export function Tooltip({
  content,
  children,
  side = "bottom",
  className,
  asChild = false,
  touch = true,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
  /** The child is already a button: wrap it without adding another one. */
  asChild?: boolean;
  /** Show on tap for touch screens. Off for buttons whose tap does something else. */
  touch?: boolean;
}) {
  const id = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number; placed: "top" | "bottom" | "left" | "right" } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = (delay = 0) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    setOpen(false);
  };

  // Position after the tooltip has rendered, so we know its size.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !tipRef.current) return;
    const t = triggerRef.current.getBoundingClientRect();
    const tip = tipRef.current.getBoundingClientRect();
    const gap = 8;
    const margin = 8;
    let placed = side;
    let x: number;
    let y: number;
    if (side === "left") {
      x = t.left - tip.width - gap;
      y = t.top + t.height / 2 - tip.height / 2;
      if (x < margin) placed = "bottom";
    }
    if (side === "right") {
      x = t.right + gap;
      y = t.top + t.height / 2 - tip.height / 2;
      if (x + tip.width > window.innerWidth - margin) placed = "bottom";
    }
    if (placed !== "left" && placed !== "right") {
      x = t.left + t.width / 2 - tip.width / 2;
      y = placed === "bottom" ? t.bottom + gap : t.top - tip.height - gap;
      if (placed === "bottom" && y + tip.height > window.innerHeight - margin) {
        placed = "top";
        y = t.top - tip.height - gap;
      } else if (placed === "top" && y < margin) {
        placed = "bottom";
        y = t.bottom + gap;
      }
    }
    x = Math.min(Math.max(margin, x!), window.innerWidth - tip.width - margin);
    setPos({ x, y: y!, placed });
  }, [open, side]);

  // Touch: a tap elsewhere closes it. Scrolling also closes it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!triggerRef.current?.contains(e.target as Node)) hide();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && hide();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", hide, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", hide, true);
    };
  }, [open]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const triggerProps = {
    onPointerEnter: (e: React.PointerEvent) => e.pointerType === "mouse" && show(150),
    onPointerLeave: (e: React.PointerEvent) => e.pointerType === "mouse" && hide(),
    onFocus: () => show(0),
    onBlur: hide,
    onClick: (e: React.MouseEvent) => {
      // Touch / pen: tapping toggles it (mouse users already see it on hover).
      if (touch && (e.nativeEvent as PointerEvent).pointerType !== "mouse") setOpen((o) => !o);
    },
  };

  return (
    <>
      <span ref={triggerRef} className={cn("inline-flex", className)} aria-describedby={open ? id : undefined} {...triggerProps}>
        {asChild ? (
          children
        ) : (
          <button type="button" className="inline-flex items-center gap-1.5 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
            {children}
          </button>
        )}
      </span>
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <m.div
                ref={tipRef}
                id={id}
                role="tooltip"
                initial={{ opacity: 0, scale: 0.96, y: pos?.placed === "top" ? 4 : -4 }}
                animate={{ opacity: pos ? 1 : 0, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.1 } }}
                transition={spring.snappy}
                style={{ left: pos?.x ?? -9999, top: pos?.y ?? -9999 }}
                className="pointer-events-none fixed z-[70] max-w-[16rem] rounded-md bg-ink-950 px-3 py-2 text-caption leading-snug font-medium text-white shadow-e2 dark:bg-ink-50 dark:text-ink-950"
              >
                {content}
              </m.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
