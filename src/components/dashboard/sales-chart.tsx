"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Segmented } from "@/components/ui/segmented";
import type { ChartBucket, RangeKey } from "@/data/sample-dashboard";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";
import {
  cedis,
  cedisShort,
  count,
  longDay,
  shortDay,
  weekdayShort,
} from "./dash-format";

type Metric = "revenue" | "tickets";

/** Round the axis up to a friendly number with ~4 gridlines. */
function niceTicks(max: number) {
  if (max <= 0) return [0, 1];
  const rough = max / 4;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= rough)!;
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}

const PAD = { top: 12, right: 8, bottom: 28, left: 64 };

/**
 * Sales over time, split into online and box office. Hand-built SVG (no
 * chart library) so it matches the design system and stays small.
 *
 * Hover, tap or use the arrow keys to read a bar. A hidden table gives
 * screen readers the same figures.
 */
export function SalesChart({
  buckets,
  range,
}: {
  buckets: ChartBucket[];
  range: RangeKey;
}) {
  const [metric, setMetric] = useState<Metric>("revenue");
  const [active, setActive] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const width = box.w;

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setBox({
        w: Math.round(e.contentRect.width),
        h: Math.round(e.contentRect.height),
      }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // A new range starts with nothing highlighted (adjusted during render).
  const [lastRange, setLastRange] = useState(range);
  if (range !== lastRange) {
    setLastRange(range);
    setActive(null);
  }

  // Fills the card, so it lines up with the panel beside it.
  const height = Math.max(box.h, 200);
  const value = (b: ChartBucket, part: "online" | "boxOffice") =>
    metric === "revenue" ? b[part].amountMinor : b[part].tickets;
  const total = (b: ChartBucket) => value(b, "online") + value(b, "boxOffice");

  const ticks = niceTicks(Math.max(0, ...buckets.map(total)));
  const top = ticks[ticks.length - 1];
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const band = buckets.length ? innerW / buckets.length : 0;
  const barW = Math.max(3, Math.min(band * 0.62, 30));
  const yOf = (v: number) => PAD.top + innerH - (v / top) * innerH;
  const weekly = range === "all";
  const labelEvery = Math.max(
    1,
    Math.ceil(buckets.length / Math.max(1, Math.floor(innerW / 64))),
  );
  const fmtVal = (v: number) => (metric === "revenue" ? cedis(v) : count(v));
  const axisVal = (v: number) =>
    metric === "revenue" ? cedisShort(v) : count(v);
  const bucketLabel = (b: ChartBucket) =>
    weekly ? `${shortDay(b.from)} – ${shortDay(b.to)}` : longDay(b.from);

  const hasBoxOffice = buckets.some((b) => b.boxOffice.tickets > 0);
  const a = active !== null ? buckets[active] : null;
  const ax = active !== null ? PAD.left + band * active + band / 2 : 0;

  return (
    <section
      aria-labelledby="sales-title"
      className="flex h-full flex-col rounded-lg border border-line bg-surface p-5 shadow-e1"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="sales-title" className="text-h3">
            Sales over time
          </h2>
          <p className="text-caption text-fg-muted">
            {weekly ? "Per week" : "Per day"} ·{" "}
            {metric === "revenue" ? "gross, GH₵" : "tickets"}
          </p>
        </div>
        <Segmented
          label="Show"
          value={metric}
          onChange={setMetric}
          options={[
            { value: "revenue", label: "Revenue" },
            { value: "tickets", label: "Tickets" },
          ]}
          className="[&_button]:h-8 [&_button]:px-3"
        />
      </div>

      <ul
        className="mt-4 flex gap-4 text-caption text-fg-muted"
        aria-label="Legend"
      >
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-primary" aria-hidden />{" "}
          Online
        </li>
        {hasBoxOffice && (
          <li className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-[3px] bg-ink-800 dark:bg-ink-300"
              aria-hidden
            />{" "}
            Box office
          </li>
        )}
      </ul>

      <div
        ref={boxRef}
        className="relative mt-2 min-h-60 flex-1 md:min-h-72 rounded-md outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
        tabIndex={0}
        role="group"
        aria-label="Sales chart. Use the left and right arrow keys to read each bar."
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          e.preventDefault();
          const step = e.key === "ArrowRight" ? 1 : -1;
          setActive((i) =>
            Math.min(
              buckets.length - 1,
              Math.max(0, (i ?? (step > 0 ? -1 : buckets.length)) + step),
            ),
          );
        }}
        onBlur={() => setActive(null)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
      >
        {width > 0 && (
          <svg
            width={width}
            height={height}
            className="absolute inset-0 overflow-visible"
            aria-hidden
          >
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={yOf(t)}
                  y2={yOf(t)}
                  className={t === 0 ? "stroke-line-strong" : "stroke-line"}
                  strokeDasharray={t === 0 ? undefined : "3 4"}
                />
                <text
                  x={PAD.left - 10}
                  y={yOf(t)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-fg-subtle text-[11px] tabular"
                >
                  {axisVal(t)}
                </text>
              </g>
            ))}

            {buckets.map((b, i) => {
              const cx = PAD.left + band * i + band / 2;
              const on = value(b, "online");
              const bo = value(b, "boxOffice");
              const dim = active !== null && active !== i;
              return (
                <g
                  key={b.key}
                  style={{
                    opacity: dim ? 0.4 : 1,
                    transition: "opacity 150ms",
                  }}
                >
                  <m.rect
                    x={cx - barW / 2}
                    width={barW}
                    rx={Math.min(3, barW / 3)}
                    initial={{ y: yOf(0), height: 0 }}
                    animate={{
                      y: yOf(on),
                      height: Math.max(0, yOf(0) - yOf(on)),
                    }}
                    transition={{
                      ...spring.smooth,
                      delay: Math.min(i * 0.012, 0.3),
                    }}
                    className="fill-primary"
                  />
                  {bo > 0 && (
                    <m.rect
                      x={cx - barW / 2}
                      width={barW}
                      rx={Math.min(3, barW / 3)}
                      initial={{ y: yOf(on), height: 0 }}
                      animate={{
                        y: yOf(on + bo),
                        height: Math.max(0, yOf(on) - yOf(on + bo) - 1.5),
                      }}
                      transition={{
                        ...spring.smooth,
                        delay: Math.min(i * 0.012, 0.3) + 0.05,
                      }}
                      className="fill-ink-800 dark:fill-ink-300"
                    />
                  )}
                  {(buckets.length - 1 - i) % labelEvery === 0 && (
                    <text
                      x={cx}
                      y={height - 8}
                      textAnchor="middle"
                      className="fill-fg-subtle text-[11px]"
                    >
                      {weekly
                        ? shortDay(b.to)
                        : buckets.length <= 7
                          ? weekdayShort(b.from)
                          : shortDay(b.from)}
                    </text>
                  )}
                  {/* Wide invisible target, so thin bars are easy to hover and tap. */}
                  <rect
                    x={PAD.left + band * i}
                    y={PAD.top}
                    width={band}
                    height={innerH}
                    fill="transparent"
                    onPointerEnter={() => setActive(i)}
                    onPointerDown={() => setActive(i)}
                  />
                </g>
              );
            })}
          </svg>
        )}

        <AnimatePresence>
          {a && (
            <m.div
              key="tip"
              initial={{ opacity: 0, y: 4, scale: 0.97, x: "-50%" }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                x: "-50%",
                left: Math.min(Math.max(ax, 96), width - 96),
              }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={spring.snappy}
              className="pointer-events-none absolute top-0 z-10 w-48 rounded-md border border-line bg-surface-raised p-3 text-caption shadow-e3"
            >
              <p className="font-semibold text-fg">{bucketLabel(a)}</p>
              <dl className="mt-2 grid gap-1">
                <div className="flex justify-between gap-3">
                  <dt className="flex items-center gap-1.5 text-fg-muted">
                    <span
                      className="size-2 rounded-[2px] bg-primary"
                      aria-hidden
                    />{" "}
                    Online
                  </dt>
                  <dd className="tabular">{fmtVal(value(a, "online"))}</dd>
                </div>
                {a.boxOffice.tickets > 0 && (
                  <div className="flex justify-between gap-3">
                    <dt className="flex items-center gap-1.5 text-fg-muted">
                      <span
                        className="size-2 rounded-[2px] bg-ink-800 dark:bg-ink-300"
                        aria-hidden
                      />{" "}
                      Box office
                    </dt>
                    <dd className="tabular">{fmtVal(value(a, "boxOffice"))}</dd>
                  </div>
                )}
                <div className="mt-1 flex justify-between gap-3 border-t border-line pt-1.5 font-semibold text-fg">
                  <dt>Total</dt>
                  <dd className="tabular">{fmtVal(total(a))}</dd>
                </div>
              </dl>
              {metric === "revenue" && (
                <p className="mt-1.5 text-fg-subtle">
                  {count(a.online.tickets + a.boxOffice.tickets)} tickets
                </p>
              )}
            </m.div>
          )}
        </AnimatePresence>
        <p className="sr-only" aria-live="polite">
          {a ? `${bucketLabel(a)}: ${fmtVal(total(a))}` : ""}
        </p>
      </div>

      {/* Tables ignore sr-only's 1px width, so the wrapper does the hiding. */}
      <div className="sr-only">
        <table>
          <caption>Sales {weekly ? "per week" : "per day"}</caption>
          <thead>
            <tr>
              <th scope="col">{weekly ? "Week" : "Day"}</th>
              <th scope="col">Online tickets</th>
              <th scope="col">Box office tickets</th>
              <th scope="col">Gross</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((b) => (
              <tr key={b.key}>
                <th scope="row">{bucketLabel(b)}</th>
                <td>{b.online.tickets}</td>
                <td>{b.boxOffice.tickets}</td>
                <td>{cedis(b.online.amountMinor + b.boxOffice.amountMinor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p
        className={cn(
          "mt-1 text-caption text-fg-subtle",
          !hasBoxOffice && "hidden",
        )}
      >
        Box-office sales happen on the event day.
      </p>
    </section>
  );
}
