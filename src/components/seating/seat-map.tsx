"use client";

import { memo, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { animate, m, useMotionValue, useMotionValueEvent } from "motion/react";
import { Accessibility } from "lucide-react";
import { spring } from "@/lib/motion";
import type { MapSeat, MapZone, SeatMap as SeatMapData } from "@/lib/types";

/* ------------------------------------------------------------------------
 * One seat, drawn in SVG. Every state differs by shape/icon as well as
 * colour (brief: never colour alone). Memoised, so choosing a seat only
 * redraws that seat, not all 640.
 * --------------------------------------------------------------------- */
const R = 11;
const tierVar = (t: number) => `var(--seat-tier-${t})`;

const SeatGlyph = memo(function SeatGlyph({
  seat,
  selected,
  preview,
  detail,
}: {
  seat: MapSeat;
  selected: boolean;
  preview: boolean;
  detail: boolean;
}) {
  const selectable = seat.state === "available";
  let body: React.ReactNode;

  if (selected) {
    body = (
      <m.g
        initial={{ scale: 0.4 }}
        animate={{ scale: 1 }}
        transition={spring.pop}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      >
        <circle r={R} fill="var(--seat-selected)" />
        {seat.accessible ? (
          <Accessibility x={-7} y={-7} width={14} height={14} color="var(--seat-selected-fg)" strokeWidth={2.4} />
        ) : (
          <path d="M-5 0.2 L-1.6 3.6 L5 -3.4" fill="none" stroke="var(--seat-selected-fg)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        )}
      </m.g>
    );
  } else if (seat.state === "available") {
    const ring = seat.accessible ? "var(--seat-accessible)" : tierVar(seat.tier);
    body = (
      <>
        <circle r={R - 1.25} fill="var(--surface)" stroke={ring} strokeWidth={2.5} />
        {seat.accessible ? (
          <Accessibility x={-7} y={-7} width={14} height={14} color={ring} strokeWidth={2.4} />
        ) : detail ? (
          <text textAnchor="middle" dominantBaseline="central" fontSize={9.5} fontWeight={700} fill={ring}>
            {seat.number}
          </text>
        ) : null}
      </>
    );
  } else if (seat.state === "sold") {
    body = (
      <>
        <circle r={R} fill="var(--seat-sold)" />
        <path d="M-3.6 -3.6 L3.6 3.6 M3.6 -3.6 L-3.6 3.6" stroke="var(--seat-sold-fg)" strokeWidth={1.8} strokeLinecap="round" />
      </>
    );
  } else if (seat.state === "held") {
    body = (
      <>
        <circle r={R - 1.25} fill="var(--surface)" stroke="var(--seat-held)" strokeWidth={2} strokeDasharray="3.2 2.4" />
        <circle r={4.2} fill="none" stroke="var(--seat-held)" strokeWidth={1.5} />
        <path d="M0 -2.3 V0 L1.7 1.2" fill="none" stroke="var(--seat-held)" strokeWidth={1.4} strokeLinecap="round" />
      </>
    );
  } else {
    body = (
      <>
        <circle r={R - 1.25} fill="var(--surface-muted)" stroke="var(--seat-blocked)" strokeWidth={1.8} strokeDasharray="3 2.4" />
        <path d="M-4 0 H4" stroke="var(--seat-blocked)" strokeWidth={1.8} strokeLinecap="round" />
      </>
    );
  }

  return (
    <g
      transform={`translate(${seat.x} ${seat.y})`}
      data-seat={seat.id}
      style={{ cursor: selectable || selected ? "pointer" : "not-allowed" }}
    >
      {/* Larger invisible hit area so near-misses still count. */}
      <circle r={R + 3} fill="transparent" />
      {body}
      {preview && (
        <m.circle
          r={R + 5}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={2.5}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: [1, 0.35, 1], scale: 1 }}
          transition={{ opacity: { duration: 1.4, repeat: Infinity }, scale: spring.pop }}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        />
      )}
    </g>
  );
});

/* ------------------------------------------------------------------------ */

export interface SeatMapHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
}

export interface SeatMapProps {
  map: SeatMapData;
  selected: ReadonlySet<string>;
  previewId: string | null;
  zoneQty: Record<string, number>;
  zoneLabel: (zone: MapZone) => string;
  onSeatTap: (seatId: string) => void;
  onZoneTap: (zone: MapZone) => void;
  /** Tapped empty space: close any preview. */
  onBackgroundTap: () => void;
  ref?: React.Ref<SeatMapHandle>;
}

const MIN_TAP_PX = 22; // below this on-screen size, a finger tap zooms in instead of choosing
const MIN_CLICK_PX = 12; // same for a mouse, which is more precise
const COMFORT_PX = 36; // seat size we zoom to after such a tap

/**
 * Interactive seat map: drag to pan, pinch or scroll to zoom, buttons via
 * the `ref` handle. The whole venue is visible at "fit"; on small screens a
 * tap on a tiny seat zooms into that area first, so seats are always big
 * enough to tap accurately.
 */
export function SeatMap({
  map,
  selected,
  previewId,
  zoneQty,
  zoneLabel,
  onSeatTap,
  onZoneTap,
  onBackgroundTap,
  ref,
}: SeatMapProps) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const s = useMotionValue(0.5);
  const [detail, setDetail] = useState(false);
  const fitScale = useRef(0.5);

  // Show seat numbers only once seats are large enough to read them.
  useMotionValueEvent(s, "change", (v) => {
    const px = v * 2 * R;
    setDetail((d) => (d ? px > 24 : px > 28));
  });

  // Track the container size.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const limits = useCallback(() => {
    const min = fitScale.current * 0.9;
    const max = Math.max(fitScale.current * 6, 64 / (2 * R));
    return { min, max };
  }, []);

  /** Keep the map from being dragged out of view. */
  const constrain = useCallback(
    (nx: number, ny: number, ns: number) => {
      const mw = map.width * ns;
      const mh = map.height * ns;
      const pad = 48;
      const cx = mw <= size.w ? (size.w - mw) / 2 : Math.min(pad, Math.max(size.w - mw - pad, nx));
      const cy = mh <= size.h ? (size.h - mh) / 2 : Math.min(pad, Math.max(size.h - mh - pad, ny));
      return { x: cx, y: cy };
    },
    [map.width, map.height, size.w, size.h],
  );

  const setView = useCallback(
    (nx: number, ny: number, ns: number, smooth: boolean) => {
      const { min, max } = limits();
      const sc = Math.min(max, Math.max(min, ns));
      const c = constrain(nx, ny, sc);
      if (smooth) {
        animate(s, sc, spring.smooth);
        animate(x, c.x, spring.smooth);
        animate(y, c.y, spring.smooth);
      } else {
        s.set(sc);
        x.set(c.x);
        y.set(c.y);
      }
    },
    [constrain, limits, s, x, y],
  );

  /** Zoom so that the point (px, py) in the container stays under the finger. */
  const zoomAt = useCallback(
    (px: number, py: number, ns: number, smooth: boolean) => {
      const { min, max } = limits();
      const sc = Math.min(max, Math.max(min, ns));
      const k = sc / s.get();
      setView(px - (px - x.get()) * k, py - (py - y.get()) * k, sc, smooth);
    },
    [limits, s, x, y, setView],
  );

  const fit = useCallback(
    (smooth = true) => {
      if (!size.w || !size.h) return;
      const sc = Math.min(size.w / map.width, size.h / map.height) * 0.96;
      fitScale.current = sc;
      setView((size.w - map.width * sc) / 2, (size.h - map.height * sc) / 2, sc, smooth);
    },
    [map.width, map.height, size.w, size.h, setView],
  );

  // Until the person moves or zooms the map, keep it fitted to the screen
  // on every size change (first layout, rotating the phone, panels opening).
  // Once they've chosen a view, keep it and only nudge it back into bounds.
  const userMoved = useRef(false);
  useEffect(() => {
    if (!size.w || !size.h) return;
    if (!userMoved.current) fit(false);
    else setView(x.get(), y.get(), s.get(), false);
  }, [size.w, size.h, fit, setView, x, y, s]);

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => {
        userMoved.current = true;
        zoomAt(size.w / 2, size.h / 2, s.get() * 1.6, true);
      },
      zoomOut: () => {
        userMoved.current = true;
        zoomAt(size.w / 2, size.h / 2, s.get() / 1.6, true);
      },
      // "Fit" hands control back: the map follows the screen size again.
      fit: () => {
        userMoved.current = false;
        fit(true);
      },
    }),
    [zoomAt, fit, size.w, size.h, s],
  );

  /* ---- Gestures: pan with one pointer, pinch with two ---------------- */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{
    startX: number;
    startY: number;
    startS: number;
    startDist: number;
    startMid: { x: number; y: number };
    moved: boolean;
  } | null>(null);

  const local = (e: { clientX: number; clientY: number }) => {
    const r = box.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const beginGesture = () => {
    const pts = [...pointers.current.values()];
    const mid = pts.length === 2 ? { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 } : pts[0];
    gesture.current = {
      startX: x.get(),
      startY: y.get(),
      startS: s.get(),
      startDist: pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0,
      startMid: mid,
      moved: gesture.current?.moved ?? false,
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    try {
      box.current?.setPointerCapture(e.pointerId);
    } catch {
      /* some synthetic or cancelled pointers can't be captured; panning still works */
    }
    pointers.current.set(e.pointerId, local(e));
    if (pointers.current.size === 1) gesture.current = null;
    beginGesture();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, local(e));
    const g = gesture.current;
    const pts = [...pointers.current.values()];
    if (pts.length === 1) {
      const dx = pts[0].x - g.startMid.x;
      const dy = pts[0].y - g.startMid.y;
      if (!g.moved && Math.hypot(dx, dy) < 6) return;
      g.moved = true;
      userMoved.current = true;
      setView(g.startX + dx, g.startY + dy, g.startS, false);
    } else if (pts.length === 2) {
      g.moved = true;
      userMoved.current = true;
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const { min, max } = limits();
      const ns = Math.min(max, Math.max(min, g.startS * (dist / g.startDist)));
      const k = ns / g.startS;
      setView(mid.x - (g.startMid.x - g.startX) * k, mid.y - (g.startMid.y - g.startY) * k, ns, false);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const wasMoved = gesture.current?.moved ?? false;
    const wasSingle = pointers.current.size === 1;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size > 0) {
      beginGesture(); // continue panning with the remaining finger
      return;
    }
    gesture.current = null;
    if (wasMoved || !wasSingle) return;

    // A tap. The container captures the pointer (so drags keep working
    // outside it), which makes e.target the container itself; look up what
    // is actually under the finger instead.
    const target = (document.elementFromPoint(e.clientX, e.clientY) ?? e.target) as Element;
    const seatEl = target.closest?.("[data-seat]");
    const zoneEl = target.closest?.("[data-zone]");
    const p = local(e);
    if (seatEl) {
      // Fingers need bigger targets than a mouse pointer.
      const minPx = e.pointerType === "mouse" ? MIN_CLICK_PX : MIN_TAP_PX;
      if (s.get() * 2 * R < minPx) {
        userMoved.current = true;
        zoomAt(p.x, p.y, COMFORT_PX / (2 * R), true);
        return;
      }
      onSeatTap(seatEl.getAttribute("data-seat")!);
    } else if (zoneEl) {
      const zone = map.zones.find((z) => z.id === zoneEl.getAttribute("data-zone"));
      if (zone) onZoneTap(zone);
    } else {
      onBackgroundTap();
    }
  };

  // Wheel / trackpad zoom (needs a non-passive listener to stop page scroll).
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      userMoved.current = true;
      const r = el.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018));
      zoomAt(e.clientX - r.left, e.clientY - r.top, s.get() * factor, false);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt, s]);

  // Keyboard: + / − to zoom, arrows to pan, 0 to fit.
  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = 60;
    const k: Record<string, () => void> = {
      "+": () => zoomAt(size.w / 2, size.h / 2, s.get() * 1.4, true),
      "=": () => zoomAt(size.w / 2, size.h / 2, s.get() * 1.4, true),
      "-": () => zoomAt(size.w / 2, size.h / 2, s.get() / 1.4, true),
      "0": () => fit(true),
      ArrowLeft: () => setView(x.get() + step, y.get(), s.get(), true),
      ArrowRight: () => setView(x.get() - step, y.get(), s.get(), true),
      ArrowUp: () => setView(x.get(), y.get() + step, s.get(), true),
      ArrowDown: () => setView(x.get(), y.get() - step, s.get(), true),
    };
    if (k[e.key]) {
      e.preventDefault();
      userMoved.current = e.key !== "0";
      k[e.key]();
    }
  };

  const { stage } = map;
  const firstSection = map.sections[0];
  const lastSection = map.sections[map.sections.length - 1];

  return (
    <div
      ref={box}
      tabIndex={0}
      role="region"
      aria-label="Seat map. Drag to move, pinch or use the plus and minus keys to zoom. For keyboard and screen reader seat choice, switch to the list view."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      className="relative h-full w-full cursor-grab touch-none overflow-hidden select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset active:cursor-grabbing"
    >
      <m.div style={{ x, y, scale: s, transformOrigin: "0 0", width: map.width, height: map.height }} className="absolute top-0 left-0">
        <svg viewBox={`0 0 ${map.width} ${map.height}`} width={map.width} height={map.height} aria-hidden className="overflow-visible">
          {/* Stage, cut on the logo's slant. */}
          <polygon
            points={`${stage.x + 24},${stage.y} ${stage.x + stage.width},${stage.y} ${stage.x + stage.width - 24},${stage.y + stage.height} ${stage.x},${stage.y + stage.height}`}
            fill="var(--fg)"
          />
          <text
            x={stage.x + stage.width / 2}
            y={stage.y + stage.height / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={18}
            fontWeight={800}
            letterSpacing={6}
            fill="var(--bg)"
          >
            {stage.label.toUpperCase()}
          </text>

          {/* Block names */}
          {map.sections.map((sec) => (
            <text key={sec.id} x={sec.labelX} y={sec.labelY} textAnchor="middle" fontSize={12} fontWeight={700} letterSpacing={2} fill="var(--fg-muted)">
              {sec.name.toUpperCase()}
            </text>
          ))}

          {/* Row letters at both ends */}
          {firstSection.rows.map((row, i) => {
            const left = row.seats[0];
            const right = lastSection.rows[i].seats[lastSection.rows[i].seats.length - 1];
            return (
              <g key={row.label} fontSize={12} fontWeight={700} fill="var(--fg-subtle)">
                <text x={left.x - 28} y={left.y} textAnchor="middle" dominantBaseline="central">
                  {row.label}
                </text>
                <text x={right.x + 28} y={right.y} textAnchor="middle" dominantBaseline="central">
                  {row.label}
                </text>
              </g>
            );
          })}

          {/* Seats */}
          {map.sections.map((sec) =>
            sec.rows.map((row) =>
              row.seats.map((seat) => (
                <SeatGlyph
                  key={seat.id}
                  seat={seat}
                  selected={selected.has(seat.id)}
                  preview={previewId === seat.id}
                  detail={detail}
                />
              )),
            ),
          )}

          {/* Standing zones */}
          {map.zones.map((z) => {
            const n = zoneQty[z.id] ?? 0;
            const active = previewId === z.id;
            return (
              <g key={z.id} data-zone={z.id} style={{ cursor: "pointer" }}>
                <rect
                  x={z.x}
                  y={z.y}
                  width={z.width}
                  height={z.height}
                  rx={14}
                  fill="color-mix(in srgb, var(--seat-tier-3) 12%, transparent)"
                  stroke={active || n > 0 ? "var(--primary)" : "var(--seat-tier-3)"}
                  strokeWidth={active || n > 0 ? 3 : 2}
                  strokeDasharray={n > 0 ? undefined : "8 6"}
                />
                <text x={z.x + z.width / 2} y={z.y + z.height / 2 - 12} textAnchor="middle" fontSize={20} fontWeight={800} fill="var(--fg)">
                  {z.name}
                </text>
                <text x={z.x + z.width / 2} y={z.y + z.height / 2 + 16} textAnchor="middle" fontSize={14} fontWeight={600} fill="var(--fg-muted)">
                  {n > 0 ? `${n} chosen · ` : ""}
                  {zoneLabel(z)}
                </text>
              </g>
            );
          })}
        </svg>
      </m.div>
    </div>
  );
}
