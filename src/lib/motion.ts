import type { Transition } from "motion/react";

/**
 * Spring presets
 * --------------
 * iOS-style motion comes from springs, not fixed-duration easing curves.
 * Each preset is described the way Apple describes springs: how long it
 * visually takes to settle (`visualDuration`, seconds) and how much it
 * overshoots (`bounce`, 0 = none, 0.3 = playful).
 *
 * Use these everywhere instead of inventing new timings, so the whole
 * product moves with one personality.
 */
export const spring = {
  /** Buttons, cards and seats compressing under a finger. */
  press: { type: "spring", visualDuration: 0.18, bounce: 0.2 },
  /** Small UI changes: toggles, tabs, badges, chips. */
  snappy: { type: "spring", visualDuration: 0.28, bounce: 0.12 },
  /** Larger movement: sheets, panels, page content. */
  smooth: { type: "spring", visualDuration: 0.45, bounce: 0.08 },
  /** Shared-element transitions (card image -> event hero). */
  hero: { type: "spring", visualDuration: 0.55, bounce: 0.1 },
  /** A little delight: selecting a seat, a ticket appearing. */
  pop: { type: "spring", visualDuration: 0.35, bounce: 0.35 },
} satisfies Record<string, Transition>;

/** How far things shrink when pressed. Subtle on purpose. */
export const pressScale = {
  button: 0.97,
  card: 0.985,
  seat: 0.85,
} as const;

/** Fade-and-rise used when content enters the screen. */
export const enterUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: spring.smooth,
} as const;
