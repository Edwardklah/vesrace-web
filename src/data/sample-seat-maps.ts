import type { MapSection, MapSeat, MapZone, PriceTier, SeatMap } from "@/lib/types";

/**
 * MOCK DATA: seat maps for the sample seated events.
 *
 * In production a seat map comes from the published seat-map version
 * (GET /api/v1/events/{id}/seat-map) and live seat states from
 * GET /api/v1/events/{id}/seat-status. Here we generate theatre-style
 * layouts so the numbers line up with the ticket types on the event page.
 */

/* Small deterministic random generator, so the "sold" seats don't change
   between page loads. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PITCH = 30; // distance between seat centres
const ROW_GAP = 34;
const AISLE = 52;
const SIDE = 64; // room for row letters on each side
const TOP = 150; // room for the stage

interface TierRule {
  /** Row indexes, inclusive. */
  from: number;
  to: number;
  ticketTypeId: string;
  tier: PriceTier;
  /** How many seats in these rows are still for sale. */
  available: number;
  held: number;
}

interface TheatreConfig {
  eventId: string;
  rows: number;
  blocks: { id: string; name: string; seats: number }[];
  tiers: TierRule[];
  /** Seat ids the organiser removed from sale (camera, sound desk). */
  blocked?: string[];
  /** Row index whose aisle-end seats are wheelchair / companion spaces. */
  accessibleRow?: number;
  zone?: Omit<MapZone, "x" | "y" | "width" | "height">;
  stageLabel?: string;
  seed: number;
}

const rowLabel = (i: number) => String.fromCharCode(65 + (i >= 8 ? i + 1 : i)); // skips "I"

function buildTheatre(cfg: TheatreConfig): SeatMap {
  const random = rng(cfg.seed);
  const blocksWidth =
    cfg.blocks.reduce((w, b) => w + b.seats * PITCH, 0) + AISLE * (cfg.blocks.length - 1);
  const width = blocksWidth + SIDE * 2;
  const centreX = width / 2;

  const sections: MapSection[] = [];
  const all: MapSeat[] = [];
  let x0 = SIDE;

  for (const block of cfg.blocks) {
    const section: MapSection = {
      id: block.id,
      name: block.name,
      labelX: x0 + (block.seats * PITCH) / 2,
      labelY: TOP - 14,
      rows: [],
    };
    for (let r = 0; r < cfg.rows; r++) {
      const label = rowLabel(r);
      const rule = cfg.tiers.find((t) => r >= t.from && r <= t.to)!;
      const seats: MapSeat[] = [];
      for (let s = 0; s < block.seats; s++) {
        const x = x0 + s * PITCH + PITCH / 2;
        // Rows curve gently around the stage, like a real auditorium.
        const y = TOP + r * ROW_GAP + 0.00007 * (x - centreX) ** 2;
        const seat: MapSeat = {
          id: `${block.id}-${label}-${s + 1}`,
          number: s + 1,
          x,
          y,
          state: "sold",
          ticketTypeId: rule.ticketTypeId,
          tier: rule.tier,
        };
        seats.push(seat);
        all.push(seat);
      }
      section.rows.push({ label, seats });
    }
    sections.push(section);
    x0 += block.seats * PITCH + AISLE;
  }

  // Accessible seats: the aisle ends of the outer blocks in one row.
  if (cfg.accessibleRow !== undefined) {
    const label = rowLabel(cfg.accessibleRow);
    const first = sections[0].rows.find((r) => r.label === label)!.seats;
    const last = sections[sections.length - 1].rows.find((r) => r.label === label)!.seats;
    [...first.slice(0, 2), ...last.slice(-2)].forEach((s) => (s.accessible = true));
  }

  // Blocked seats.
  const blocked = new Set(cfg.blocked ?? []);
  all.forEach((s) => blocked.has(s.id) && (s.state = "blocked"));

  // Within each tier: seats nearest the centre-front sell first, with some
  // randomness. The rest stay available, a few are held by other buyers.
  for (const rule of cfg.tiers) {
    const pool = all
      .filter((s) => s.ticketTypeId === rule.ticketTypeId && s.state !== "blocked")
      .map((s) => ({
        s,
        score: Math.abs(s.x - centreX) / width + (s.y - TOP) / (cfg.rows * ROW_GAP) + random() * 0.9,
      }))
      .sort((a, b) => b.score - a.score); // least desirable first
    const accessibleFirst = [...pool.filter((p) => p.s.accessible), ...pool.filter((p) => !p.s.accessible)];
    accessibleFirst.slice(0, rule.available).forEach((p) => (p.s.state = "available"));
    accessibleFirst.slice(rule.available, rule.available + rule.held).forEach((p) => (p.s.state = "held"));
  }

  const rowsHeight = TOP + cfg.rows * ROW_GAP + 0.00007 * (SIDE - centreX) ** 2;
  let zones: MapZone[] = [];
  let height = rowsHeight + 40;
  if (cfg.zone) {
    zones = [
      { ...cfg.zone, x: SIDE + 40, y: rowsHeight + 30, width: blocksWidth - 80, height: 110 },
    ];
    height = rowsHeight + 30 + 110 + 40;
  }

  return {
    eventId: cfg.eventId,
    width,
    height,
    stage: { label: cfg.stageLabel ?? "Stage", x: centreX - 260, y: 24, width: 520, height: 64 },
    sections,
    zones,
  };
}

const maps: Record<string, SeatMap> = {
  // Osu Arts Hall: 640 seats in three blocks, rows A–U (no I), plus standing at the back.
  evt_harmattan: buildTheatre({
    eventId: "evt_harmattan",
    rows: 20,
    blocks: [
      { id: "L", name: "Left block", seats: 8 },
      { id: "C", name: "Centre block", seats: 16 },
      { id: "R", name: "Right block", seats: 8 },
    ],
    tiers: [
      { from: 0, to: 3, ticketTypeId: "tt_hm_vip", tier: 1, available: 14, held: 3 },
      { from: 4, to: 19, ticketTypeId: "tt_hm_reg", tier: 2, available: 214, held: 4 },
    ],
    blocked: ["C-S-7", "C-S-8", "C-S-9", "C-S-10", "C-T-7", "C-T-8", "C-T-9", "C-T-10"], // sound desk
    accessibleRow: 8, // row J
    zone: { id: "Z-standing", name: "Standing", ticketTypeId: "tt_hm_std", remaining: 40 },
    seed: 12,
  }),
  // National Theatre (smaller layout for the sample).
  evt_adowa_night: buildTheatre({
    eventId: "evt_adowa_night",
    rows: 14,
    blocks: [
      { id: "L", name: "Left block", seats: 6 },
      { id: "C", name: "Centre block", seats: 12 },
      { id: "R", name: "Right block", seats: 6 },
    ],
    tiers: [
      { from: 0, to: 5, ticketTypeId: "tt_ad_prem", tier: 1, available: 9, held: 2 },
      { from: 6, to: 13, ticketTypeId: "tt_ad_std", tier: 2, available: 120, held: 3 },
    ],
    accessibleRow: 0,
    seed: 7,
  }),
  // Cape Coast Civic Hall: 442 seats.
  evt_laughs_coast: buildTheatre({
    eventId: "evt_laughs_coast",
    rows: 17,
    blocks: [
      { id: "L", name: "Left block", seats: 7 },
      { id: "C", name: "Centre block", seats: 12 },
      { id: "R", name: "Right block", seats: 7 },
    ],
    tiers: [
      { from: 0, to: 2, ticketTypeId: "tt_lc_front", tier: 1, available: 6, held: 2 },
      { from: 3, to: 16, ticketTypeId: "tt_lc_std", tier: 2, available: 190, held: 4 },
    ],
    accessibleRow: 8,
    seed: 3,
  }),
};

export function getSeatMap(eventId: string): SeatMap | null {
  return maps[eventId] ?? null;
}
