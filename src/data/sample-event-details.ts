import type { EventDetail } from "@/lib/types";
import { sampleEvents } from "./sample-events";

/**
 * MOCK DATA: event detail and ticket types for design review.
 * Everything here is fictional. In production this comes from
 * GET /api/v1/events/{slug} and GET /api/v1/events/{id}/ticket-types,
 * and the server decides prices, availability and limits.
 */

const GHS = (cedis: number) => ({ amountMinor: cedis * 100, currency: "GHS" as const });
const BOOKING_FEE = GHS(5); // proposed flat fee per paid ticket

type Detail = Omit<EventDetail, keyof (typeof sampleEvents)[number]>;

const details: Record<string, Detail> = {
  evt_sundown_labadi: {
    endsAt: "2026-10-24T23:00:00Z",
    address: "Black Star Square, Castle Road, Osu, Accra",
    description: [
      "An open-air evening of Afrobeats, highlife and amapiano on Black Star Square, from golden hour until late. Six acts across one stage, food vendors from around Accra, and the sea breeze for free.",
      "Bring your friends, bring your dancing shoes, and come early for the best spot as the sun goes down.",
    ],
    goodToKnow: [
      { label: "Gates open", value: "3:00 PM" },
      { label: "Age", value: "16+ (under 18s with an adult)" },
      { label: "Bags", value: "Small bags only, searched at entry" },
      { label: "Getting there", value: "Limited parking on Castle Road; ride-hailing drop-off at the main gate" },
    ],
    ticketTypes: [
      { id: "tt_sd_ga", name: "General admission", includes: ["Entry to the square", "Access to food court"], price: GHS(150), remaining: 18, maxPerOrder: 6 },
      { id: "tt_sd_vip", name: "VIP deck", includes: ["Raised viewing deck", "Fast-track entry", "Two drinks"], price: GHS(400), remaining: null, maxPerOrder: 4 },
    ],
    bookingFeePerTicket: BOOKING_FEE,
    organiser: { name: "Coastline Live", about: "Open-air concerts and festivals along Ghana's coast since 2019.", eventsHosted: 34 },
  },
  evt_highlife_sessions: {
    endsAt: "2026-10-24T23:00:00Z",
    address: "Alliance Française, Liberation Link, Airport Residential, Accra",
    description: [
      "The fourth Highlife Sessions brings a ten-piece live band back to the Alliance Française garden for an evening of classics and new highlife, played the way it was meant to be heard.",
      "Expect palm-wine guitar, horn sections and a dance floor that fills up by the second set.",
    ],
    goodToKnow: [
      { label: "Doors", value: "6:30 PM" },
      { label: "Seating", value: "Free seating and standing in the garden" },
      { label: "Food and drink", value: "Bar and kitchen open all evening" },
    ],
    ticketTypes: [
      { id: "tt_hs_ga", name: "Standard", includes: ["Entry to the garden"], price: GHS(120), remaining: null, maxPerOrder: 8 },
    ],
    bookingFeePerTicket: BOOKING_FEE,
    organiser: { name: "Palmwine Collective", about: "Keeping live highlife on stage in Accra, one session at a time.", eventsHosted: 12 },
  },
  evt_adowa_night: {
    endsAt: "2026-10-25T20:00:00Z",
    address: "National Theatre of Ghana, Liberia Road, Accra",
    description: [
      "Kente Stage Company presents an evening of Adowa, Agbadza and Kpanlogo, with drummers and dancers from across Ghana in a two-act performance at the National Theatre.",
      "A celebration of rhythm, costume and storytelling for all ages.",
    ],
    goodToKnow: [
      { label: "Doors", value: "4:15 PM" },
      { label: "Running time", value: "About 2 hours with one interval" },
      { label: "Age", value: "All ages welcome" },
      { label: "Accessibility", value: "Wheelchair spaces in row A; ask staff at the main entrance" },
    ],
    ticketTypes: [
      { id: "tt_ad_prem", name: "Premium", includes: ["Rows A–F, centre", "Programme included"], price: GHS(200), remaining: 9, maxPerOrder: 6, tier: 1 },
      { id: "tt_ad_std", name: "Standard", includes: ["Rows G–T"], price: GHS(80), remaining: null, maxPerOrder: 10, tier: 2 },
    ],
    bookingFeePerTicket: BOOKING_FEE,
    organiser: { name: "Kente Stage Company", about: "Traditional dance and drama, staged for today's audiences.", eventsHosted: 21 },
  },
  evt_community_league: {
    endsAt: "2026-10-25T17:00:00Z",
    address: "Baba Yara Sports Stadium, Amakom, Kumasi",
    description: [
      "The Kumasi Community League final: Asafo United against Bantama Stars, after a season of forty matches across the city. Come and back your side.",
    ],
    goodToKnow: [
      { label: "Gates open", value: "1:30 PM" },
      { label: "Kick-off", value: "3:00 PM" },
      { label: "Not allowed", value: "Glass bottles, flares, vuvuzelas inside the covered stand" },
    ],
    ticketTypes: [
      { id: "tt_cl_pop", name: "Popular stand", includes: ["Uncovered seating"], price: GHS(30), remaining: null, maxPerOrder: 10 },
      { id: "tt_cl_cov", name: "Covered stand", includes: ["Covered seating", "Closer to the halfway line"], price: GHS(80), remaining: 40, maxPerOrder: 6, salesEndText: "Sales end Sat 24 Oct, 6:00 PM" },
    ],
    bookingFeePerTicket: BOOKING_FEE,
    organiser: { name: "Ashanti Grassroots FA", about: "Community football across the Ashanti Region.", eventsHosted: 58 },
  },
  evt_harmattan: {
    endsAt: "2026-12-12T23:30:00Z",
    address: "Osu Arts Hall, Oxford Street, Osu, Accra",
    description: [
      "Harmattan Sounds Live closes the year with a seated, full-band show at Osu Arts Hall: new songs, old favourites and special guests, under a light show built for the room.",
      "Seats are allocated. Choose yours on the seat map, and you'll keep them for 10 minutes while you pay.",
    ],
    goodToKnow: [
      { label: "Doors", value: "6:00 PM" },
      { label: "Show", value: "7:00 PM until about 10:30 PM" },
      { label: "Age", value: "13+" },
      { label: "Accessibility", value: "Wheelchair and companion seats in row J; choose them on the map" },
    ],
    ticketTypes: [
      { id: "tt_hm_vip", name: "VIP", includes: ["Rows A–D", "Meet-and-greet after the show", "Lanyard"], price: GHS(500), remaining: 14, maxPerOrder: 4, tier: 1 },
      { id: "tt_hm_reg", name: "Regular", includes: ["Rows E–T"], price: GHS(200), remaining: 214, maxPerOrder: 8, tier: 2 },
    ],
    bookingFeePerTicket: BOOKING_FEE,
    organiser: { name: "Coastline Live", about: "Open-air concerts and festivals along Ghana's coast since 2019.", eventsHosted: 34 },
  },
  evt_kumasi_summit: {
    endsAt: "2026-11-19T17:00:00Z",
    address: "Garden City Conference Centre, Harper Road, Kumasi",
    description: [
      "A one-day summit for founders, operators and investors building in Ghana. Twelve talks, two panels and an afternoon of workshops on payments, logistics and growing beyond Accra.",
      "Lunch and refreshments are included. Bring business cards: the networking hour is the busiest part of the day.",
    ],
    goodToKnow: [
      { label: "Registration", value: "8:00 AM" },
      { label: "Finishes", value: "5:00 PM, networking until 6:30 PM" },
      { label: "Dress code", value: "Business casual" },
      { label: "Wi-Fi", value: "Provided in all halls" },
    ],
    ticketTypes: [
      { id: "tt_ks_std", name: "Delegate", includes: ["All talks and workshops", "Lunch and refreshments", "Certificate of attendance"], price: GHS(350), remaining: null, maxPerOrder: 5, salesEndText: "Sales end in 2 days" },
    ],
    bookingFeePerTicket: BOOKING_FEE,
    organiser: { name: "Ashanti Founders Network", about: "Meetups and summits for builders in Kumasi and beyond.", eventsHosted: 9 },
  },
  evt_thanksgiving: {
    endsAt: "2026-11-27T22:00:00Z",
    address: "Grace Chapel Auditorium, Community 6, Tema",
    description: [
      "Join Grace Chapel Tema and guest choirs for a night of thanksgiving, praise and worship to close the year. Everyone is welcome.",
      "Entry is free, but please reserve a place so we can plan seating and ushering.",
    ],
    goodToKnow: [
      { label: "Doors", value: "5:30 PM" },
      { label: "Parking", value: "Free parking on the church grounds" },
      { label: "Children", value: "Children's church runs alongside the service" },
    ],
    ticketTypes: [
      { id: "tt_tg_free", name: "Free reservation", includes: ["Reserved entry", "Seating on arrival"], price: GHS(0), remaining: null, maxPerOrder: 6 },
    ],
    bookingFeePerTicket: GHS(0),
    organiser: { name: "Grace Chapel Tema", about: "A family church in the heart of Tema.", eventsHosted: 17 },
  },
  evt_laughs_coast: {
    endsAt: "2026-12-05T22:30:00Z",
    address: "Cape Coast Civic Hall, Commercial Street, Cape Coast",
    description: [
      "Five of Ghana's sharpest stand-ups take the stage in Cape Coast for one night only, hosted by the Fante Funnybones crew. Expect jokes in English, Fante and somewhere in between.",
    ],
    goodToKnow: [
      { label: "Doors", value: "7:00 PM" },
      { label: "Age", value: "18+ (strong language)" },
      { label: "Seating", value: "Allocated seats; front rows may be part of the show" },
    ],
    ticketTypes: [
      { id: "tt_lc_front", name: "Front rows", includes: ["Rows A–C", "Priority entry"], price: GHS(250), remaining: 6, maxPerOrder: 4, tier: 1 },
      { id: "tt_lc_std", name: "Standard", includes: ["Rows D–Q"], price: GHS(120), remaining: null, maxPerOrder: 8, tier: 2 },
    ],
    bookingFeePerTicket: BOOKING_FEE,
    organiser: { name: "Fante Funnybones", about: "Comedy nights across the Central Region.", eventsHosted: 15 },
  },
  evt_basketball: {
    endsAt: "2026-11-21T18:00:00Z",
    address: "East Legon Sports Complex, East Legon, Accra",
    description: [
      "The Inter-Schools Basketball Final: the two best senior high school teams in Greater Accra meet for the trophy. Halftime show by the schools' cheer squads.",
    ],
    goodToKnow: [
      { label: "Doors", value: "1:30 PM" },
      { label: "Tip-off", value: "3:00 PM" },
      { label: "Students", value: "School ID may be checked at the door" },
    ],
    ticketTypes: [
      { id: "tt_bb_ga", name: "General admission", includes: ["Bleacher seating"], price: GHS(50), remaining: 0, maxPerOrder: 6 },
    ],
    bookingFeePerTicket: BOOKING_FEE,
    organiser: { name: "Accra Schools Sports Council", about: "School sport in Greater Accra.", eventsHosted: 26 },
  },
  evt_acoustic_takoradi: {
    endsAt: "2026-11-08T20:00:00Z",
    address: "Harbour View Gardens, Beach Road, Takoradi",
    description: [
      "A relaxed Sunday evening of acoustic sets in a garden overlooking the harbour. Three singer-songwriters, one guitar each, and a sunset.",
    ],
    goodToKnow: [
      { label: "Doors", value: "4:30 PM" },
      { label: "Bring", value: "Something to sit on if you like the grass" },
    ],
    ticketTypes: [
      { id: "tt_at_ga", name: "Garden entry", includes: ["Entry", "One soft drink"], price: GHS(60), remaining: null, maxPerOrder: 8 },
    ],
    bookingFeePerTicket: BOOKING_FEE,
    organiser: { name: "Western Strings", about: "Acoustic music nights in the Western Region.", eventsHosted: 7 },
  },
};

export function getEventBySlug(slug: string): EventDetail | null {
  const summary = sampleEvents.find((e) => e.slug === slug);
  if (!summary) return null;
  const detail = details[summary.id];
  return detail ? { ...summary, ...detail } : null;
}

export function getAllEventSlugs() {
  return sampleEvents.map((e) => e.slug);
}

/** Up to `n` other events, same category first, then same city. */
export function getRelatedEvents(event: EventDetail, n = 4) {
  const others = sampleEvents.filter((e) => e.id !== event.id && e.status !== "Sold out");
  const score = (e: (typeof others)[number]) =>
    (e.category === event.category ? 2 : 0) + (e.city === event.city ? 1 : 0);
  return [...others].sort((a, b) => score(b) - score(a) || a.startsAt.localeCompare(b.startsAt)).slice(0, n);
}
