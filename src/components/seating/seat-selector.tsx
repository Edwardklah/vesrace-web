"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, m, useAnimationControls } from "motion/react";
import {
  Accessibility,
  ArrowLeft,
  ArrowRight,
  ChevronUp,
  Copy,
  Info,
  List,
  Map as MapIcon,
  Maximize,
  Minus,
  Plus,
  TimerOff,
  Trash2,
  WifiOff,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HoldTimer } from "@/components/ui/hold-timer";
import { RollingNumber } from "@/components/ui/rolling-number";
import { Segmented } from "@/components/ui/segmented";
import { Stepper } from "@/components/ui/stepper";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Tooltip } from "@/components/ui/tooltip";
import { api, ApiError, errorMessage, HOLD_CHANNEL, type Hold, type HoldBroadcast } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatEventDate, formatMoney, formatPriceFrom, type Money } from "@/lib/format";
import { spring } from "@/lib/motion";
import type { EventDetail, MapSeat, MapZone, SeatMap as SeatMapData, TicketType } from "@/lib/types";
import { useOnline } from "@/lib/use-online";
import { Seat } from "./seat";
import { SeatList } from "./seat-list";
import { SeatMap, type SeatMapHandle } from "./seat-map";

const money = (amountMinor: number): Money => ({ amountMinor, currency: "GHS" });
const holdKey = (eventId: string) => `vesrace-hold-${eventId}`;

type Preview = { kind: "seat"; id: string } | { kind: "zone"; zone: MapZone } | null;

/**
 * Seat selection for an assigned-seating event.
 *
 * Every change goes through `api.holds` (currently a MOCK that imitates the
 * server rules in docs/edge-cases.md). The page:
 * - shows each request as pending and ignores repeat taps meanwhile
 * - handles "seat just taken", per-type and per-order limits, cooldowns,
 *   rate limits, cancelled/closed sales, offline
 * - keeps the hold if you refresh or come back from the event page
 * - notices when another tab takes over your hold (one hold per customer)
 * - times the countdown from the server's clock, not the phone's
 *
 * Review switches: ?hold=30, ?simulate=taken, ?simulate=rate, ?skew=120.
 */
export function SeatSelector({ event, map }: { event: EventDetail; map: SeatMapData }) {
  const ticketTypes = useMemo(
    () => Object.fromEntries(event.ticketTypes.map((t) => [t.id, t])) as Record<string, TicketType>,
    [event.ticketTypes],
  );

  const [hold, setHold] = useState<Hold | null>(null);
  /** server clock minus phone clock, measured on each response */
  const [clockOffset, setClockOffset] = useState(0);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Seats we learned were taken by someone else since the page loaded. */
  const [takenNow, setTakenNow] = useState<Set<string>>(() => new Set());
  const [draftZoneQty, setDraftZoneQty] = useState(1);
  const [preview, setPreview] = useState<Preview>(null);
  const [expired, setExpired] = useState(false);
  const [movedAway, setMovedAway] = useState(false);
  const [view, setView] = useState<"map" | "list">("map");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mockNote, setMockNote] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [lastTotal, setLastTotal] = useState(0);
  const mapRef = useRef<SeatMapHandle>(null);
  const shake = useAnimationControls();
  const online = useOnline();

  // The map as this customer sees it: seats found taken since load show as held.
  const liveMap = useMemo<SeatMapData>(() => {
    if (takenNow.size === 0) return map;
    return {
      ...map,
      sections: map.sections.map((sec) => ({
        ...sec,
        rows: sec.rows.map((row) => ({
          ...row,
          seats: row.seats.map((x) => (takenNow.has(x.id) ? { ...x, state: "held" as const } : x)),
        })),
      })),
    };
  }, [map, takenNow]);

  // Look-up of every seat with its block and row names.
  const seatIndex = useMemo(() => {
    const idx = new Map<string, { seat: MapSeat; section: string; row: string }>();
    liveMap.sections.forEach((sec) =>
      sec.rows.forEach((row) => row.seats.forEach((seat) => idx.set(seat.id, { seat, section: sec.name, row: row.label }))),
    );
    return idx;
  }, [liveMap]);

  const selected = useMemo(() => hold?.seatIds ?? [], [hold]);
  const zoneQty = useMemo(() => hold?.zones ?? {}, [hold]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  /* ---- Order lines (integer minor units only) ---- */
  const countByType: Record<string, number> = {};
  selected.forEach((id) => {
    const t = seatIndex.get(id)!.seat.ticketTypeId;
    countByType[t] = (countByType[t] ?? 0) + 1;
  });
  map.zones.forEach((z) => {
    if (zoneQty[z.id]) countByType[z.ticketTypeId] = (countByType[z.ticketTypeId] ?? 0) + zoneQty[z.id];
  });
  const lines = event.ticketTypes.filter((t) => countByType[t.id]).map((t) => ({ t, n: countByType[t.id] }));
  const count = lines.reduce((a, l) => a + l.n, 0);
  const subtotal = lines.reduce((a, l) => a + l.n * l.t.price.amountMinor, 0);
  const fees = lines.reduce((a, l) => a + (l.t.price.amountMinor > 0 ? l.n : 0), 0) * event.bookingFeePerTicket.amountMinor;
  const total = subtotal + fees;
  const direction: 1 | -1 = total >= lastTotal ? 1 : -1;

  /** Apply a server response: keep the hold, remember it for refreshes, sync clocks. */
  const accept = useCallback(
    (h: Hold | null) => {
      setHold(h);
      if (h) {
        setClockOffset(h.serverTime - Date.now());
        try {
          sessionStorage.setItem(holdKey(event.id), h.id);
        } catch {
          /* ignore */
        }
      } else {
        try {
          sessionStorage.removeItem(holdKey(event.id));
        } catch {
          /* ignore */
        }
      }
    },
    [event.id],
  );

  // Restore an existing hold after a refresh or coming back from the event page.
  useEffect(() => {
    let id: string | null = null;
    try {
      id = sessionStorage.getItem(holdKey(event.id));
    } catch {
      /* ignore */
    }
    if (!id) return;
    api.holds
      .get(id)
      .then((h) => {
        accept(h);
        if (!h) setExpired(true);
      })
      .catch(() => {
        /* offline on load: keep showing the map; the next action will retry */
      });
  }, [event.id, accept]);

  // Another tab can take over this customer's hold (one hold per customer).
  useEffect(() => {
    let ch: BroadcastChannel | null = null;
    try {
      ch = new BroadcastChannel(HOLD_CHANNEL);
    } catch {
      return;
    }
    ch.onmessage = (e: MessageEvent<HoldBroadcast>) => {
      const msg = e.data;
      if (msg.eventId !== event.id) return;
      setHold((current) => {
        if (!current || current.id !== msg.holdId) return current;
        if (msg.type === "hold-replaced") setMovedAway(true);
        try {
          sessionStorage.removeItem(holdKey(event.id));
        } catch {
          /* ignore */
        }
        return null;
      });
    };
    return () => ch?.close();
  }, [event.id]);

  const before = () => {
    setLastTotal(total);
    setMockNote(false);
    setNudge(false);
    setError(null);
  };

  /** Run one API request with a pending state and plain-language errors. */
  const run = async (key: string, req: () => Promise<Hold | null>, onTaken?: () => void) => {
    if (pending) return false; // one request at a time: no double taps
    before();
    if (!online) {
      setError(errorMessage(new ApiError("OFFLINE")));
      return false;
    }
    setPending(key);
    try {
      accept(await req());
      return true;
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "UNKNOWN";
      if (code === "SEAT_TAKEN") onTaken?.();
      if (code === "HOLD_EXPIRED") {
        accept(null);
        setExpired(true);
      }
      setError(errorMessage(e));
      return false;
    } finally {
      setPending(null);
    }
  };

  /* ---- Seat actions ---- */
  const addSeat = async (id: string) => {
    const ok = await run(
      `add:${id}`,
      () => api.holds.addSeat({ eventId: event.id, holdId: hold?.id ?? null, seatId: id }),
      () => setTakenNow((t) => new Set(t).add(id)),
    );
    if (ok) setPreview(null);
  };

  const removeSeat = async (id: string) => {
    if (!hold) return;
    const ok = await run(`remove:${id}`, () => api.holds.removeSeat({ holdId: hold.id, seatId: id }));
    if (ok) setPreview((p) => (p?.kind === "seat" && p.id === id ? null : p));
  };

  const applyZone = async (zone: MapZone, n: number) => {
    const ok = await run(`zone:${zone.id}`, () =>
      api.holds.setZone({ eventId: event.id, holdId: hold?.id ?? null, zoneId: zone.id, quantity: n }),
    );
    if (ok) setPreview(null);
  };

  /** Let go of every seat straight away, so others can have them. */
  const clearAll = async () => {
    if (!hold) return;
    await run("clear", async () => {
      await api.holds.release(hold.id);
      return null;
    });
  };

  const onSeatTap = useCallback(
    (id: string) => {
      if (!seatIndex.get(id)) return;
      setError(null);
      // Unavailable seats still get a preview, so people learn why.
      setPreview({ kind: "seat", id });
    },
    [seatIndex],
  );

  const onZoneTap = useCallback(
    (zone: MapZone) => {
      setError(null);
      setDraftZoneQty(zoneQty[zone.id] || 1);
      setPreview({ kind: "zone", zone });
    },
    [zoneQty],
  );

  const startOver = () => {
    accept(null);
    setExpired(false);
    setMovedAway(false);
    setPreview(null);
    setLastTotal(0);
    setError(null);
  };

  const onExpire = useCallback(() => {
    setExpired(true);
    setPreview(null);
    setHold(null);
    try {
      sessionStorage.removeItem(holdKey(event.id));
    } catch {
      /* ignore */
    }
  }, [event.id]);

  const onContinue = () => {
    if (count === 0) {
      setNudge(true);
      shake.start({ x: [0, -8, 8, -5, 5, 0], transition: { duration: 0.4 } });
      return;
    }
    if (!online) {
      setError(errorMessage(new ApiError("OFFLINE")));
      return;
    }
    setMockNote(true); // MOCK: checkout is built in a later step
  };

  /** Hold end time in this phone's clock. */
  const localExpiresAt = hold && count > 0 ? hold.expiresAt - clockOffset : null;

  const seatLabel = (id: string) => {
    const e = seatIndex.get(id)!;
    return { title: `Row ${e.row}, Seat ${e.seat.number}`, block: e.section, tt: ticketTypes[e.seat.ticketTypeId], seat: e.seat };
  };

  const zoneLabel = useCallback(
    (z: MapZone) => `${formatMoney(ticketTypes[z.ticketTypeId].price, { compact: true })} · ${z.remaining} left`,
    [ticketTypes],
  );

  /* ---------------------------------------------------------------------- */
  /* Preview card                                                            */
  /* ---------------------------------------------------------------------- */
  const previewCard = (() => {
    if (!preview) return null;
    if (preview.kind === "zone") {
      const z = preview.zone;
      const tt = ticketTypes[z.ticketTypeId];
      const current = zoneQty[z.id] ?? 0;
      const otherOfType = (countByType[tt.id] ?? 0) - current;
      const max = Math.max(1, Math.min(tt.maxPerOrder - otherOfType, z.remaining));
      return (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <Seat state="available" tier={3} label="" size={22} interactive={false} />
            <div className="flex-1">
              <p className="text-overline text-fg-muted">Standing area</p>
              <p className="text-h3">{z.name}</p>
              <p className="text-small text-fg-muted">
                {tt.name} · {formatMoney(tt.price)} each · {z.remaining} left
              </p>
            </div>
            <CloseButton onClick={() => setPreview(null)} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Stepper value={draftZoneQty} min={current > 0 ? 0 : 1} max={max} onChange={setDraftZoneQty} label="standing tickets" />
            <Button
              loading={pending === `zone:${z.id}`}
              onClick={() => applyZone(z, draftZoneQty)}
              icon={draftZoneQty === 0 ? <Trash2 className="size-4" /> : <Plus className="size-4" />}
            >
              {draftZoneQty === 0 ? "Remove" : current > 0 ? "Update" : `Add ${draftZoneQty}`}
            </Button>
          </div>
          <ErrorLine message={error} />
        </div>
      );
    }

    const { title, block, tt, seat } = seatLabel(preview.id);
    const isSel = selectedSet.has(seat.id);
    const unavailable = !isSel && seat.state !== "available";
    const reason = { held: "Someone else is checking out with this seat.", sold: "This seat has been sold.", blocked: "This seat isn't on sale.", available: "" }[seat.state];
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <Seat
            state={isSel ? "selected" : seat.state}
            tier={seat.tier}
            accessible={seat.accessible}
            label=""
            size={22}
            interactive={false}
          />
          <div className="min-w-0 flex-1">
            <p className="text-overline text-fg-muted">{block}</p>
            <p className="text-h3">{title}</p>
            <p className="text-small text-fg-muted">
              {tt.name} · <span className="font-semibold text-fg tabular">{formatMoney(tt.price)}</span>
            </p>
            {seat.accessible && (
              <p className="mt-1 flex items-start gap-1.5 text-small text-info">
                <Accessibility className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  Wheelchair or companion seat. Please choose it only if you or someone in your group needs it.
                </span>
              </p>
            )}
          </div>
          <CloseButton onClick={() => setPreview(null)} />
        </div>
        {unavailable ? (
          <p className="flex items-center gap-2 rounded-md bg-surface-muted px-3 py-2.5 text-small text-fg-muted">
            <Info className="size-4 shrink-0" aria-hidden /> {reason}
          </p>
        ) : isSel ? (
          <Button variant="secondary" loading={pending === `remove:${seat.id}`} onClick={() => removeSeat(seat.id)} icon={<Trash2 className="size-4" />}>
            Remove seat
          </Button>
        ) : (
          <Button loading={pending === `add:${seat.id}`} onClick={() => addSeat(seat.id)} icon={online ? <Plus className="size-4" /> : <WifiOff className="size-4" />}>
            {online ? `Add seat · ${formatMoney(tt.price)}` : "Reconnect to add this seat"}
          </Button>
        )}
        <ErrorLine message={error} />
      </div>
    );
  })();

  /* ---------------------------------------------------------------------- */
  /* Order summary (panel on desktop, sheet on phones)                       */
  /* ---------------------------------------------------------------------- */
  const selectedList = (
    <ul className="grid gap-2">
      <AnimatePresence initial={false}>
        {selected.map((id) => {
          const { title, block, tt, seat } = seatLabel(id);
          return (
            <m.li
              key={id}
              layout
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={spring.snappy}
              className="flex items-center gap-3 rounded-md border border-line bg-surface p-2.5 pl-3"
            >
              <Seat state="selected" accessible={seat.accessible} label="" size={20} interactive={false} />
              <button type="button" onClick={() => setPreview({ kind: "seat", id })} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-small font-semibold">{title}</span>
                <span className="block truncate text-caption text-fg-muted">
                  {block} · {tt.name}
                </span>
              </button>
              <span className="text-small font-semibold tabular">{formatMoney(tt.price)}</span>
              <button
                type="button"
                onClick={() => removeSeat(id)}
                aria-label={`Remove ${title}`}
                className="grid size-9 place-items-center rounded-full text-fg-muted hover:bg-surface-muted hover:text-danger"
              >
                <X className="size-4" aria-hidden />
              </button>
            </m.li>
          );
        })}
        {map.zones
          .filter((z) => zoneQty[z.id])
          .map((z) => (
            <m.li
              key={z.id}
              layout
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className="flex items-center gap-3 rounded-md border border-line bg-surface p-2.5 pl-3"
            >
              <Seat state="available" tier={3} label="" size={20} interactive={false} />
              <button type="button" onClick={() => onZoneTap(z)} className="min-w-0 flex-1 text-left">
                <span className="block text-small font-semibold">
                  {zoneQty[z.id]} × {z.name}
                </span>
                <span className="block text-caption text-fg-muted">{ticketTypes[z.ticketTypeId].name}</span>
              </button>
              <span className="text-small font-semibold tabular">
                {formatMoney(money(zoneQty[z.id] * ticketTypes[z.ticketTypeId].price.amountMinor))}
              </span>
              <button
                type="button"
                onClick={() => applyZone(z, 0)}
                aria-label={`Remove ${z.name} tickets`}
                className="grid size-9 place-items-center rounded-full text-fg-muted hover:bg-surface-muted hover:text-danger"
              >
                <X className="size-4" aria-hidden />
              </button>
            </m.li>
          ))}
      </AnimatePresence>
    </ul>
  );

  const totals = (
    <div className="grid gap-1.5 text-small">
      {lines.map((l) => (
        <div key={l.t.id} className="flex justify-between">
          <span className="text-fg-muted">
            {l.n} × {l.t.name}
          </span>
          <span className="tabular">{formatMoney(money(l.n * l.t.price.amountMinor))}</span>
        </div>
      ))}
      {fees > 0 && (
        <div className="flex justify-between text-fg-muted">
          <span>Booking fee</span>
          <span className="tabular">{formatMoney(money(fees))}</span>
        </div>
      )}
    </div>
  );

  const cta = (
    <m.div animate={shake}>
      <Button size="lg" className="w-full" onClick={onContinue} icon={<ArrowRight className="size-5" />}>
        {count === 0 ? "Choose seats to continue" : `Continue with ${count} ${count === 1 ? "ticket" : "tickets"}`}
      </Button>
    </m.div>
  );

  const mockMsg = (
    <AnimatePresence>
      {mockNote && (
        <m.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} role="status" className="overflow-hidden">
          <span className="mt-3 block rounded-sm bg-info-soft p-2.5 text-caption text-info-fg">
            Design preview: checkout is built in a later step.
          </span>
        </m.p>
      )}
    </AnimatePresence>
  );

  /* ---- Legend (the map key): price tiers, then states ----
   * Each item explains itself on hover, keyboard focus, or tap. */
  const tiers = event.ticketTypes.filter((t) => t.tier);
  const seatsLeft = (ticketTypeId: string) =>
    map.sections.reduce(
      (n, sec) => n + sec.rows.reduce((m2, r) => m2 + r.seats.filter((x) => x.ticketTypeId === ticketTypeId && x.state === "available").length, 0),
      0,
    ) + map.zones.filter((z) => z.ticketTypeId === ticketTypeId).reduce((n, z) => n + z.remaining, 0);

  const stateHelp: [st: "selected" | "held" | "sold" | "blocked", label: string, help: string][] = [
    ["selected", "Yours", "Seats you've chosen. They're held for you for 10 minutes while you check out."],
    ["held", "Held", "Someone else is checking out with this seat. If they don't finish, it becomes available again within 10 minutes."],
    ["sold", "Sold", "Already bought. This seat can't be chosen."],
    ["blocked", "Unavailable", "Removed from sale by the organiser, for example for the sound desk or a camera position."],
  ];

  const legend = (
    <div className="flex items-center gap-x-4 gap-y-2 overflow-x-auto px-4 py-2.5 text-caption whitespace-nowrap [scrollbar-width:none] lg:flex-wrap lg:px-0">
      {tiers.map((t) => (
        <Tooltip
          key={t.id}
          content={
            <>
              <span className="block font-semibold">
                {t.name} · {formatMoney(t.price)}
              </span>
              {t.includes.join(". ")}. {seatsLeft(t.id)} left.
            </>
          }
        >
          <Seat state="available" tier={t.tier} label="" size={16} interactive={false} />
          <span className="font-semibold">{t.name}</span>
          <span className="text-fg-muted tabular">{formatMoney(t.price, { compact: true })}</span>
        </Tooltip>
      ))}
      <span className="h-4 w-px shrink-0 bg-line" aria-hidden />
      {stateHelp.map(([st, label, help]) => (
        <Tooltip key={st} content={help}>
          <Seat state={st} label="" size={16} interactive={false} />
          <span className="text-fg-muted">{label}</span>
        </Tooltip>
      ))}
      <Tooltip content="Wheelchair space or companion seat. Choose it like any other seat; staff will meet you at the accessible entrance.">
        <Seat state="available" accessible label="" size={16} interactive={false} />
        <span className="text-fg-muted">Accessible</span>
      </Tooltip>
    </div>
  );

  const zoomButton = "grid size-11 place-items-center rounded-full border border-line bg-surface-raised text-fg shadow-e2 hover:bg-surface-muted";

  return (
    <div className="flex h-svh flex-col bg-bg">
      {/* ---- Top bar: focused task, no site navigation ---- */}
      <header className="z-30 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-bg px-3 md:px-6">
        <Link
          href={`/events/${event.slug}`}
          transitionTypes={["nav-back"]}
          aria-label={`Back to ${event.name}`}
          className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-surface-muted"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-body font-semibold">{event.name}</h1>
          <p className="truncate text-caption text-fg-muted">
            {formatEventDate(event.startsAt, event.timeZone)} · {event.venueName}
          </p>
        </div>
        <div className="hidden md:block">
          <Segmented
            label="View"
            value={view}
            onChange={(v) => {
              setView(v);
              setPreview(null);
            }}
            options={[
              { value: "map", label: "Map", icon: <MapIcon className="size-4" aria-hidden /> },
              { value: "list", label: "List", icon: <List className="size-4" aria-hidden /> },
            ]}
          />
        </div>
        <ThemeToggle />
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ---- Map / list area ---- */}
        <section aria-label="Choose seats" className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center border-b border-line lg:px-6">
            <div className="min-w-0 flex-1">{legend}</div>
            <div className="shrink-0 pr-3 md:hidden">
              <Segmented
                label="View"
                value={view}
                onChange={(v) => {
                  setView(v);
                  setPreview(null);
                }}
                options={[
                  { value: "map", label: "", icon: <MapIcon className="size-4" aria-label="Map" /> },
                  { value: "list", label: "", icon: <List className="size-4" aria-label="List" /> },
                ]}
              />
            </div>
          </div>

          <AnimatePresence initial={false}>
            {!online && (
              <m.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="shrink-0 overflow-hidden"
                role="status"
              >
                <p className="flex items-center gap-2 bg-warning-soft px-4 py-2.5 text-small text-warning-fg lg:px-6">
                  <WifiOff className="size-4 shrink-0" aria-hidden />
                  You&apos;re offline. You can look around, but seats can only be held once you&apos;re back online.
                </p>
              </m.div>
            )}
          </AnimatePresence>
          <div className="relative min-h-0 flex-1 bg-surface-muted/60">
            {view === "map" ? (
              <>
                <SeatMap
                  ref={mapRef}
                  map={liveMap}
                  selected={selectedSet}
                  previewId={preview?.kind === "seat" ? preview.id : preview?.kind === "zone" ? preview.zone.id : null}
                  zoneQty={zoneQty}
                  zoneLabel={zoneLabel}
                  onSeatTap={onSeatTap}
                  onZoneTap={onZoneTap}
                  onBackgroundTap={() => setPreview(null)}
                />
                {/* Zoom controls */}
                <div className="absolute top-3 right-3 flex flex-col gap-2">
                  <Tooltip asChild touch={false} side="left" content="Zoom in">
                  <m.button whileTap={{ scale: 0.9 }} transition={spring.press} className={zoomButton} onClick={() => mapRef.current?.zoomIn()} aria-label="Zoom in">
                      <Plus className="size-5" aria-hidden />
                    </m.button>
                  </Tooltip>
                  <Tooltip asChild touch={false} side="left" content="Zoom out">
                  <m.button whileTap={{ scale: 0.9 }} transition={spring.press} className={zoomButton} onClick={() => mapRef.current?.zoomOut()} aria-label="Zoom out">
                      <Minus className="size-5" aria-hidden />
                    </m.button>
                  </Tooltip>
                  <Tooltip asChild touch={false} side="left" content="Fit whole venue on screen">
                  <m.button whileTap={{ scale: 0.9 }} transition={spring.press} className={zoomButton} onClick={() => mapRef.current?.fit()} aria-label="Fit whole venue on screen">
                      <Maximize className="size-5" aria-hidden />
                    </m.button>
                  </Tooltip>
                </div>
                <p className="pointer-events-none absolute top-3 left-3 hidden rounded-full bg-surface-raised/90 px-3 py-1.5 text-caption text-fg-muted shadow-e1 sm:block">
                  Drag to move · scroll or pinch to zoom
                </p>
              </>
            ) : (
              <div className="h-full overflow-y-auto">
                <SeatList map={liveMap} selected={selectedSet} ticketTypes={ticketTypes} onToggle={(id) => (selectedSet.has(id) ? removeSeat(id) : addSeat(id))} />
              </div>
            )}

            {/* Preview card floats over the bottom of the map */}
            <AnimatePresence>
              {previewCard && (
                <m.div
                  key={preview?.kind === "seat" ? preview.id : "zone"}
                  initial={{ opacity: 0, y: 24, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.15 } }}
                  transition={spring.smooth}
                  className="absolute inset-x-3 bottom-3 z-20 mx-auto max-w-md rounded-lg border border-line bg-surface-raised p-4 shadow-e3"
                  role="dialog"
                  aria-label="Seat details"
                >
                  {previewCard}
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* ---- Desktop side panel ---- */}
        <aside aria-label="Your seats" className="hidden w-[24rem] shrink-0 flex-col border-l border-line bg-bg lg:flex">
          <div className="flex-1 overflow-y-auto p-6">
            <AnimatePresence>
              {localExpiresAt && !expired && (
                <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-5 overflow-hidden">
                  <HoldTimer expiresAt={localExpiresAt} onExpire={onExpire} />
                </m.div>
              )}
            </AnimatePresence>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-h3">Your seats</h2>
              {count > 0 && (
                <Button variant="ghost" size="sm" loading={pending === "clear"} onClick={clearAll} icon={<Trash2 className="size-4" />}>
                  Clear all
                </Button>
              )}
            </div>
            {count === 0 ? (
              <p className={cn("mt-2 text-small", nudge ? "font-semibold text-danger" : "text-fg-muted")} role={nudge ? "alert" : undefined}>
                {nudge ? "Choose at least one seat to continue." : "Tap a seat on the map to see its details and price."}
              </p>
            ) : (
              <div className="mt-4">{selectedList}</div>
            )}
            {!preview && <div className="mt-3"><ErrorLine message={error} /></div>}
          </div>
          <div className="border-t border-line p-6">
            {count > 0 && <div className="mb-4">{totals}</div>}
            <div className="mb-4 flex items-baseline justify-between">
              <span className="text-small text-fg-muted">Total</span>
              <RollingNumber value={formatMoney(money(total), { freeLabel: false })} direction={direction} className="text-h2" />
            </div>
            {cta}
            {mockMsg}
            <p className="mt-4 text-caption text-fg-muted">
              Seats are held for 10 minutes from your first choice. Final prices are confirmed at checkout.
            </p>
          </div>
        </aside>
      </div>

      {/* ---- Phone / tablet bottom sheet ---- */}
      <div className="z-30 shrink-0 rounded-t-[1.25rem] border-t border-line bg-surface-raised pb-[env(safe-area-inset-bottom)] shadow-e3 lg:hidden">
        <button
          type="button"
          onClick={() => setSheetOpen((o) => !o)}
          aria-expanded={sheetOpen}
          aria-controls="seat-sheet"
          className="flex w-full items-center justify-center gap-2 pt-2 pb-1 text-caption font-semibold text-fg-muted"
        >
          <span className="h-1.5 w-10 rounded-full bg-line-strong" aria-hidden />
          <span className="sr-only">{sheetOpen ? "Hide your seats" : "Show your seats"}</span>
        </button>
        <AnimatePresence initial={false}>
          {sheetOpen && (
            <m.div
              id="seat-sheet"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={spring.smooth}
              className="overflow-hidden"
            >
              <div className="max-h-[45svh] overflow-y-auto px-4 pt-2 pb-3">
                {count === 0 ? (
                  <p className="text-small text-fg-muted">No seats chosen yet.</p>
                ) : (
                  <>
                    {selectedList}
                    <Button variant="ghost" size="sm" className="mt-2" loading={pending === "clear"} onClick={clearAll} icon={<Trash2 className="size-4" />}>
                      Clear all seats
                    </Button>
                  </>
                )}
                {count > 0 && <div className="mt-4">{totals}</div>}
              </div>
            </m.div>
          )}
        </AnimatePresence>
        <div className="grid gap-3 px-4 pt-1 pb-3">
          {localExpiresAt && !expired && <HoldTimer expiresAt={localExpiresAt} onExpire={onExpire} compact />}
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setSheetOpen((o) => !o)} className="min-w-0 flex-1 text-left" aria-expanded={sheetOpen}>
              <span className={cn("flex items-center gap-1 text-caption", nudge && count === 0 ? "font-semibold text-danger" : "text-fg-muted")}>
                {count === 0 ? (nudge ? "Choose a seat first" : "Seats") : `${count} ${count === 1 ? "ticket" : "tickets"} · incl. fees`}
                <m.span animate={{ rotate: sheetOpen ? 180 : 0 }} transition={spring.snappy} className="inline-flex">
                  <ChevronUp className="size-3.5" aria-hidden />
                </m.span>
              </span>
              <RollingNumber
                value={count === 0 ? formatPriceFrom(event.ticketTypes.map((t) => t.price)) : formatMoney(money(total), { freeLabel: false })}
                direction={direction}
                className="text-h3"
              />
            </button>
            <m.div animate={shake}>
              <Button onClick={onContinue} className="h-12">
                Continue
              </Button>
            </m.div>
          </div>
          {mockMsg}
        </div>
      </div>

      {/* ---- Hold expired ---- */}
      <AnimatePresence>
        {expired && (
          <m.div className="fixed inset-0 z-50 grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-ink-1000/55" aria-hidden />
            <m.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="expired-title"
              aria-describedby="expired-body"
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={spring.smooth}
              className="relative w-full max-w-sm rounded-lg bg-surface-raised p-6 text-center shadow-e3"
            >
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-warning-soft text-warning-fg">
                <TimerOff className="size-7" aria-hidden />
              </span>
              <h2 id="expired-title" className="mt-4 text-h2">
                Your seats were released
              </h2>
              <p id="expired-body" className="mt-2 text-small text-fg-muted">
                Seats are held for 10 minutes so everyone gets a fair chance. Other buyers get the first go at the seats you had for the next 2 minutes, then you can try for them again. Every other seat is open to you now.
              </p>
              <Button autoFocus size="lg" className="mt-6 w-full" onClick={startOver}>
                Choose seats again
              </Button>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      {/* ---- Hold taken over by another tab ---- */}
      <AnimatePresence>
        {movedAway && !expired && (
          <m.div className="fixed inset-0 z-50 grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-ink-1000/55" aria-hidden />
            <m.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="moved-title"
              aria-describedby="moved-body"
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={spring.smooth}
              className="relative w-full max-w-sm rounded-lg bg-surface-raised p-6 text-center shadow-e3"
            >
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-info-soft text-info-fg">
                <Copy className="size-7" aria-hidden />
              </span>
              <h2 id="moved-title" className="mt-4 text-h2">
                Your seats moved to another tab
              </h2>
              <p id="moved-body" className="mt-2 text-small text-fg-muted">
                You started choosing seats for this event in another tab or window. Each person can hold one set of seats at a time, so this tab has let go of its seats. Carry on in the other tab, or choose here to move them back.
              </p>
              <Button autoFocus size="lg" className="mt-6 w-full" onClick={startOver}>
                Choose seats here
              </Button>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Inline error under an action, announced to screen readers. */
function ErrorLine({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <m.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          role="alert"
          className="text-small font-semibold text-danger"
        >
          {message}
        </m.p>
      )}
    </AnimatePresence>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close seat details"
      className="-mt-1 -mr-1 grid size-10 shrink-0 place-items-center rounded-full text-fg-muted hover:bg-surface-muted hover:text-fg"
    >
      <X className="size-5" aria-hidden />
    </button>
  );
}
