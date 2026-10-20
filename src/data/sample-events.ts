import type { EventCategory, EventSummary } from "@/lib/types";

/**
 * MOCK DATA: fictional events for design review only.
 * Names, organisers and prices are invented. Photos are free-licence
 * Unsplash images, mostly by Ghanaian photographers, credited in `imageCredit`.
 *
 * "Night of Thanksgiving & Praise" deliberately has no artwork, to show
 * the branded fallback cover. "Inter-Schools Basketball Final" is sold out.
 */

const unsplash = (id: string) => `https://images.unsplash.com/${id}`;
const GHS = (cedis: number) => ({ amountMinor: cedis * 100, currency: "GHS" as const });

export const sampleEvents: EventSummary[] = [
  // ---- This weekend (Sat 24 – Sun 25 Oct 2026) ----
  {
    id: "evt_sundown_labadi",
    slug: "accra-sundown-festival",
    name: "Accra Sundown Festival",
    category: "Concert",
    startsAt: "2026-10-24T16:00:00Z",
    timeZone: "Africa/Accra",
    venueName: "Black Star Square",
    city: "Accra",
    imageUrl: unsplash("photo-1727023663928-1772e2c7e679"),
    imageCredit: "Nana Kwandoh",
    prices: [GHS(150), GHS(400)],
    seating: "general",
    status: "On sale",
    urgency: { kind: "few-left" },
    organiserName: "Coastline Live",
  },
  {
    id: "evt_highlife_sessions",
    slug: "highlife-sessions-vol-4",
    name: "Highlife Sessions Vol. 4",
    category: "Concert",
    startsAt: "2026-10-24T19:30:00Z",
    timeZone: "Africa/Accra",
    venueName: "Alliance Française",
    city: "Accra",
    imageUrl: unsplash("photo-1678214024599-633e687b6a23"),
    imageCredit: "Ato Aikins",
    prices: [GHS(120)],
    seating: "general",
    status: "On sale",
    organiserName: "Palmwine Collective",
  },
  {
    id: "evt_adowa_night",
    slug: "adowa-and-agbadza-a-night-of-dance",
    name: "Adowa & Agbadza: A Night of Dance",
    category: "Theatre",
    startsAt: "2026-10-25T17:00:00Z",
    timeZone: "Africa/Accra",
    venueName: "National Theatre",
    city: "Accra",
    imageUrl: unsplash("photo-1660675133223-c293889b9fb8"),
    imageCredit: "Emmanuel Yeboah Okine",
    prices: [GHS(80), GHS(200)],
    seating: "assigned",
    status: "On sale",
    organiserName: "Kente Stage Company",
  },
  {
    id: "evt_community_league",
    slug: "kumasi-community-league-final",
    name: "Kumasi Community League Final",
    category: "Sport",
    startsAt: "2026-10-25T15:00:00Z",
    timeZone: "Africa/Accra",
    venueName: "Baba Yara Sports Stadium",
    city: "Kumasi",
    imageUrl: unsplash("photo-1787536042975-8ff60e86f761"),
    imageCredit: "Barnabas Lartey-Odoi Tetteh",
    prices: [GHS(30), GHS(80)],
    seating: "general",
    status: "On sale",
    organiserName: "Ashanti Grassroots FA",
  },

  // ---- Later (brief v2 sample events) ----
  {
    id: "evt_harmattan",
    slug: "harmattan-sounds-live",
    name: "Harmattan Sounds Live",
    category: "Concert",
    startsAt: "2026-12-12T19:00:00Z",
    timeZone: "Africa/Accra",
    venueName: "Osu Arts Hall",
    city: "Accra",
    imageUrl: unsplash("photo-1689864727821-e47577e88226"),
    imageCredit: "Ato Aikins",
    prices: [GHS(200), GHS(500)],
    seating: "assigned",
    status: "On sale",
    urgency: { kind: "few-left" },
    organiserName: "Coastline Live",
  },
  {
    id: "evt_kumasi_summit",
    slug: "kumasi-tech-business-summit",
    name: "Kumasi Tech & Business Summit",
    category: "Conference",
    startsAt: "2026-11-19T09:00:00Z",
    timeZone: "Africa/Accra",
    venueName: "Garden City Conference Centre",
    city: "Kumasi",
    imageUrl: unsplash("photo-1744149108463-3531c5054fd7"),
    imageCredit: "Alfred Quartey",
    prices: [GHS(350)],
    seating: "general",
    status: "On sale",
    urgency: { kind: "sales-end", text: "Sales end in 2 days" },
    organiserName: "Ashanti Founders Network",
  },
  {
    id: "evt_thanksgiving",
    slug: "night-of-thanksgiving-and-praise",
    name: "Night of Thanksgiving & Praise",
    category: "Faith",
    startsAt: "2026-11-27T18:30:00Z",
    timeZone: "Africa/Accra",
    venueName: "Grace Chapel Auditorium",
    city: "Tema",
    imageUrl: null,
    prices: [GHS(0)],
    seating: "general",
    status: "On sale",
    organiserName: "Grace Chapel Tema",
  },
  {
    id: "evt_laughs_coast",
    slug: "laughs-on-the-coast",
    name: "Laughs on the Coast",
    category: "Comedy",
    startsAt: "2026-12-05T20:00:00Z",
    timeZone: "Africa/Accra",
    venueName: "Cape Coast Civic Hall",
    city: "Cape Coast",
    imageUrl: unsplash("photo-1700720711254-602cb6b8468d"),
    imageCredit: "Alex Cooper",
    prices: [GHS(120), GHS(250)],
    seating: "assigned",
    status: "On sale",
    organiserName: "Fante Funnybones",
  },
  {
    id: "evt_basketball",
    slug: "inter-schools-basketball-final",
    name: "Inter-Schools Basketball Final",
    category: "Sport",
    startsAt: "2026-11-21T15:00:00Z",
    timeZone: "Africa/Accra",
    venueName: "East Legon Sports Complex",
    city: "Accra",
    imageUrl: unsplash("photo-1725114930682-fab4c3f78a96"),
    imageCredit: "Kingsley Hemans",
    prices: [GHS(50)],
    seating: "general",
    status: "Sold out",
    organiserName: "Accra Schools Sports Council",
  },
  {
    id: "evt_acoustic_takoradi",
    slug: "acoustic-sundays-takoradi",
    name: "Acoustic Sundays",
    category: "Concert",
    startsAt: "2026-11-08T17:00:00Z",
    timeZone: "Africa/Accra",
    venueName: "Harbour View Gardens",
    city: "Takoradi",
    imageUrl: unsplash("photo-1661243036338-68615ae7a2a3"),
    imageCredit: "Ato Aikins",
    prices: [GHS(60)],
    seating: "general",
    status: "On sale",
    organiserName: "Western Strings",
  },
];

/** Curated homepage collections (the backend will supply these). */
export const collections = {
  thisWeekend: ["evt_sundown_labadi", "evt_highlife_sessions", "evt_adowa_night", "evt_community_league"],
  featured: ["evt_harmattan", "evt_kumasi_summit", "evt_laughs_coast"],
};

export const heroImage = {
  url: unsplash("photo-1778847871641-88da4f4082aa"),
  credit: "Bemnet Mesfin",
};

export const cities = ["Accra", "Kumasi", "Tema", "Takoradi", "Cape Coast"] as const;

export const categories: { value: EventCategory; label: string }[] = [
  { value: "Concert", label: "Concerts" },
  { value: "Nightlife", label: "Nightlife" },
  { value: "Conference", label: "Conferences" },
  { value: "Faith", label: "Faith" },
  { value: "Comedy", label: "Comedy" },
  { value: "Sport", label: "Sport" },
  { value: "Theatre", label: "Theatre" },
];

export function eventsById(ids: string[]) {
  return ids
    .map((id) => sampleEvents.find((e) => e.id === id))
    .filter((e): e is EventSummary => Boolean(e));
}
