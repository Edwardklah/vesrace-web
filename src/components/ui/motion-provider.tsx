"use client";

import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import { spring } from "@/lib/motion";

// Drag gestures and layout animations (sliding highlights, sheets) are the
// heaviest part of the library, so they download in the background after
// the page is interactive. Until then those effects simply don't animate.
const loadFullFeatures = () => import("@/lib/motion-features").then((mod) => mod.default);

/**
 * App-wide motion setup.
 *
 * - LazyMotion: components use the light `m.*` elements, and only the
 *   animation features we need are bundled. `strict` throws if anyone
 *   accidentally imports the heavy `motion.*` elements instead.
 * - reducedMotion="user": with "reduce motion" switched on, movement is
 *   skipped and only opacity/colour animate.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <LazyMotion features={loadFullFeatures}>
        <MotionConfig reducedMotion="user" transition={spring.snappy}>
          {children}
        </MotionConfig>
      </LazyMotion>
    </LazyMotion>
  );
}
