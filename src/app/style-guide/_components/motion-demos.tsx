"use client";

import { useState } from "react";
import { AnimatePresence, m, useDragControls } from "motion/react";
import { Minus, Play, Plus, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RollingNumber } from "@/components/ui/rolling-number";
import { formatMoney } from "@/lib/format";
import { spring } from "@/lib/motion";
import { Label } from "./section";

const presets = [
  { key: "press", use: "Press feedback" },
  { key: "snappy", use: "Toggles, tabs" },
  { key: "smooth", use: "Sheets, panels" },
  { key: "hero", use: "Shared elements" },
  { key: "pop", use: "Seat selected" },
] as const;

/** Each preset moves a marker across a track so the personalities can be compared. */
function SpringRunner() {
  const [on, setOn] = useState(false);
  return (
    <div className="rounded-lg border border-line p-5">
      <div className="mb-4 flex items-center justify-between">
        <Label>Spring presets</Label>
        <Button size="sm" variant="secondary" icon={<Play className="size-4" />} onClick={() => setOn((v) => !v)}>
          Play
        </Button>
      </div>
      <ul className="grid gap-4">
        {presets.map((p) => (
          <li key={p.key} className="grid grid-cols-[6.5rem_1fr] items-center gap-3">
            <div>
              <p className="font-mono text-small">{p.key}</p>
              <p className="text-caption text-fg-muted">{p.use}</p>
            </div>
            <div className="relative h-8 rounded-full bg-surface-muted">
              <m.span
                className="absolute top-1 left-1 size-6 rounded-full bg-primary shadow-e1"
                animate={{ left: on ? "calc(100% - 1.75rem)" : "0.25rem" }}
                transition={spring[p.key]}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** iOS-style bottom sheet: drag it down (or flick it) to dismiss. */
function SheetDemo() {
  const [open, setOpen] = useState(true);
  const [qty, setQty] = useState(2);
  const [dir, setDir] = useState<1 | -1>(1);
  const controls = useDragControls();
  const unit = 20000; // GH₵ 200.00, mock price for the demo only
  const change = (d: 1 | -1) => {
    setDir(d);
    setQty((q) => Math.min(8, Math.max(1, q + d)));
  };

  return (
    <div className="rounded-lg border border-line p-5">
      <Label>Draggable sheet and rolling total</Label>
      <div className="relative mx-auto h-[26rem] w-full max-w-[19rem] overflow-hidden rounded-[2.25rem] border-[6px] border-ink-950 bg-surface-muted dark:border-ink-800">
        <div className="grid h-full place-items-center p-6 text-center">
          <div>
            <p className="text-small text-fg-muted">Drag the sheet down, or flick it.</p>
            {!open && (
              <Button size="sm" className="mt-4" onClick={() => setOpen(true)}>
                Open sheet
              </Button>
            )}
          </div>
        </div>
        <AnimatePresence>
          {open && (
            <m.div
              key="sheet"
              drag="y"
              dragListener={false}
              dragControls={controls}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.08, bottom: 0.9 }}
              onDragEnd={(_, info) => {
                // Close on a long drag or a fast downward flick, like iOS.
                if (info.offset.y > 110 || info.velocity.y > 600) setOpen(false);
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={spring.smooth}
              className="absolute inset-x-0 bottom-0 rounded-t-[1.5rem] bg-surface-raised px-5 pt-2 pb-6 shadow-e3"
            >
              <div
                onPointerDown={(e) => controls.start(e)}
                className="mx-auto mb-3 flex h-6 w-full cursor-grab touch-none items-center justify-center active:cursor-grabbing"
                aria-hidden
              >
                <span className="h-1.5 w-10 rounded-full bg-line-strong" />
              </div>
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-md bg-primary-soft text-primary-soft-fg">
                  <Ticket className="size-5" aria-hidden />
                </span>
                <div className="flex-1">
                  <p className="font-semibold">Regular</p>
                  <p className="text-small text-fg-muted tabular">{formatMoney({ amountMinor: unit, currency: "GHS" })} each</p>
                </div>
                <div className="flex items-center gap-2">
                  <m.button
                    whileTap={{ scale: 0.85 }}
                    transition={spring.press}
                    onClick={() => change(-1)}
                    aria-label="One fewer ticket"
                    className="grid size-11 place-items-center rounded-full border border-line-strong"
                  >
                    <Minus className="size-4" />
                  </m.button>
                  <RollingNumber value={String(qty)} direction={dir} className="w-4 justify-center text-h3" />
                  <m.button
                    whileTap={{ scale: 0.85 }}
                    transition={spring.press}
                    onClick={() => change(1)}
                    aria-label="One more ticket"
                    className="grid size-11 place-items-center rounded-full border border-line-strong"
                  >
                    <Plus className="size-4" />
                  </m.button>
                </div>
              </div>
              <div className="mt-5 flex items-baseline justify-between border-t border-line pt-4">
                <span className="text-small text-fg-muted">Total</span>
                <RollingNumber
                  value={formatMoney({ amountMinor: unit * qty, currency: "GHS" })}
                  direction={dir}
                  className="text-h2"
                />
              </div>
              <Button className="mt-4 w-full" size="lg">
                Continue
              </Button>
            </m.div>
          )}
        </AnimatePresence>
      </div>
      <p className="mt-3 text-center text-caption text-fg-muted">Demo prices only.</p>
    </div>
  );
}

export function MotionSection() {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <SpringRunner />
      <SheetDemo />
      <ul className="grid gap-2 text-small text-fg-muted lg:col-span-2 lg:grid-cols-3">
        <li className="rounded-md bg-surface-muted p-4">
          <span className="font-semibold text-fg">Only transform and opacity</span> animate,
          so motion stays smooth on mid-range Android phones.
        </li>
        <li className="rounded-md bg-surface-muted p-4">
          <span className="font-semibold text-fg">Reduce motion</span> on the device turns
          movement off; fades remain.
        </li>
        <li className="rounded-md bg-surface-muted p-4">
          <span className="font-semibold text-fg">POS and scanner</span> stay almost static:
          speed beats flourish at the door.
        </li>
      </ul>
    </div>
  );
}
