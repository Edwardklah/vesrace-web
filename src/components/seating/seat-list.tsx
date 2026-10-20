"use client";

import { Accessibility, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import type { MapSeat, SeatMap, TicketType } from "@/lib/types";

const stateText: Record<MapSeat["state"], string> = {
  available: "available",
  held: "held by another customer",
  sold: "sold",
  blocked: "unavailable",
};

/**
 * List view of the same seats, grouped by block and row. This is the
 * keyboard and screen-reader way to choose seats (brief: an alternative to
 * the visual map). Each seat is a toggle button that says its state.
 */
export function SeatList({
  map,
  selected,
  ticketTypes,
  onToggle,
}: {
  map: SeatMap;
  selected: ReadonlySet<string>;
  ticketTypes: Record<string, TicketType>;
  onToggle: (seatId: string) => void;
}) {
  return (
    <div className="grid gap-3 p-4 md:p-6">
      {map.sections.map((sec, i) => {
        const free = sec.rows.reduce((n, r) => n + r.seats.filter((s) => s.state === "available").length, 0);
        return (
          <details key={sec.id} open={i === 1} className="group rounded-lg border border-line bg-surface">
            <summary className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-4 py-3 font-semibold marker:content-none hover:bg-surface-muted">
              <span>{sec.name}</span>
              <span className="text-small font-normal text-fg-muted">{free} available</span>
            </summary>
            <div className="grid gap-4 border-t border-line p-4">
              {sec.rows.map((row) => {
                const tt = ticketTypes[row.seats[0].ticketTypeId];
                return (
                  <fieldset key={row.label}>
                    <legend className="mb-2 text-small">
                      <span className="font-semibold">Row {row.label}</span>
                      <span className="text-fg-muted">
                        {" "}
                        · {tt.name} · {formatMoney(tt.price)}
                      </span>
                    </legend>
                    <div className="flex flex-wrap gap-1.5">
                      {row.seats.map((seat) => {
                        const isSel = selected.has(seat.id);
                        const can = seat.state === "available";
                        return (
                          <button
                            key={seat.id}
                            type="button"
                            aria-pressed={isSel}
                            aria-disabled={!can || undefined}
                            aria-label={`${sec.name}, row ${row.label}, seat ${seat.number}, ${tt.name}, ${formatMoney(tt.price)}, ${isSel ? "selected" : stateText[seat.state]}${seat.accessible ? ", wheelchair or companion seat" : ""}`}
                            onClick={() => can && onToggle(seat.id)}
                            className={cn(
                              "relative grid h-10 min-w-10 place-items-center rounded-md border px-1 text-small font-semibold tabular transition-colors",
                              isSel && "border-transparent bg-[var(--seat-selected)] text-[var(--seat-selected-fg)]",
                              !isSel && can && "border-line-strong bg-surface hover:border-primary",
                              !can && "cursor-not-allowed border-dashed border-line bg-surface-muted text-fg-subtle line-through",
                            )}
                          >
                            {isSel ? <Check className="size-4" aria-hidden /> : seat.accessible ? <Accessibility className="size-4" aria-hidden /> : seat.number}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}
