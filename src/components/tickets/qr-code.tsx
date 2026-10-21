"use client";

import { useMemo } from "react";
import { encode } from "uqr";

/**
 * Draws a ticket's QR credential. The credential itself comes from the
 * server (signed, single-use at the gate); this only turns it into squares.
 * Always dark-on-white, even in dark mode, because scanners need contrast.
 */
export function QrCode({ value, label, className }: { value: string; label: string; className?: string }) {
  const { path, size } = useMemo(() => {
    const qr = encode(value, { ecc: "M", border: 0 });
    let d = "";
    qr.data.forEach((row, y) => {
      // One path segment per run of dark modules keeps the SVG small.
      let x = 0;
      while (x < row.length) {
        if (!row[x]) {
          x++;
          continue;
        }
        const start = x;
        while (x < row.length && row[x]) x++;
        d += `M${start} ${y}h${x - start}v1h${start - x}z`;
      }
    });
    return { path: d, size: qr.size };
  }, [value]);

  return (
    <svg
      viewBox={`-2 -2 ${size + 4} ${size + 4}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect x={-2} y={-2} width={size + 4} height={size + 4} fill="#fff" />
      <path d={path} fill="#0a0b0e" />
    </svg>
  );
}
