# Vesrace web

Frontend for Vesrace, the event-ticketing platform. This is **phase 1**: the design foundations and the style guide. All data is mock data. There are no real APIs, payments or sign-in yet.

## Run it

You need Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000. It redirects to the style guide at `/style-guide` until the homepage is built.

Other commands:

| Command | What it does |
| --- | --- |
| `npm run build` | Production build. It should finish with no errors. |
| `npm start` | Serves the production build. |
| `npm run lint` | Checks the code with ESLint. |

## Stack

- **Next.js 16** (App Router) with React 19 and TypeScript.
- **Tailwind CSS v4.** Tokens are defined in `src/app/globals.css`; there is no `tailwind.config.js` in v4.
- **Motion** (`motion/react`): spring animations, gestures and shared-element transitions.
- **lucide-react**: the only icon set. No emoji are used as icons.
- **Fonts** are self-hosted, so builds never depend on Google Fonts:
  - Archivo for display headings. `src/fonts/archivo-display-*.woff2` are trimmed copies of `@fontsource-variable/archivo` that keep only weights 800–850 and widths 82–90, about 60% smaller. To use other weights or widths, re-cut them with fontTools (`instancer.instantiateVariableFont`).
  - Geist and Geist Mono (`geist`) for UI text and codes. Geist Mono isn't preloaded, because only ticket codes use it.
- `clsx` and `tailwind-merge`, combined in the `cn()` helper.

## Token system

Everything lives in `src/app/globals.css`, in three layers:

1. **Raw scales.** `--teal-50…950` is the brand colour, with `--teal-700` (#0F766E) as the primary. `--ink-0…1000` is a set of cool neutrals built around the logo's #111318.
2. **Semantic tokens.** These include `--bg`, `--surface`, `--line`, `--fg`, `--fg-muted`, `--primary`, the `--success`, `--warning`, `--danger` and `--info` sets, `--focus` and the `--seat-*` states. Each one has a light value (`:root, .light`) and a dark value (`.dark`).
3. **Tailwind mapping** (`@theme inline`). This is what lets you write classes such as `bg-surface`, `text-fg-muted`, `bg-primary`, `text-primary-fg`, `shadow-e2` and `rounded-md`.

Components only use semantic tokens. To change the brand colour, edit the teal scale, or point the `--primary*` tokens at a different scale. Status colours and seat states are kept separate on purpose, so organiser storefront branding can't change what they mean.

The type scale is defined as utilities: `text-display-xl`, `text-display`, `text-h1`, `text-h2`, `text-h3`, `text-body-lg`, `text-body`, `text-small`, `text-caption` and `text-overline`. Sizes are fluid, scaling from a 360px screen up to a 1440px one.

Dark mode is controlled by a `.dark` class on `<html>`. A small script in `layout.tsx` sets that class before the first paint, using the saved choice or the device setting, so the page doesn't flash.

All text pairs in both themes pass WCAG AA contrast.

## Motion

Spring presets are in `src/lib/motion.ts`: `press`, `snappy`, `smooth`, `hero` and `pop`. Use these instead of inventing new timings.

- **Use `m.div`, `m.button`, … from `motion/react`, not `motion.div`.** `LazyMotion` (in `motion-provider.tsx`) runs in strict mode and throws an error if `motion.*` is used.
- **Content visible on first load uses CSS entrances** (`animate-rise`, `animate-settle` in `globals.css`), not JavaScript. That way it shows before any script has loaded on slow connections. Don't hide above-the-fold content behind a JavaScript `initial={{ opacity: 0 }}`.
- **Low-powered devices** get a `lite` class on `<html>`. It's set when Chrome reports 4 GB of RAM or less, or when Data Saver is on. Effects that cost a lot, like the frosted `.glass` header, fall back to plain versions.

- Only `transform` and `opacity` are animated, to keep motion smooth on mid-range phones.
- `MotionConfig reducedMotion="user"` respects the device's reduce-motion setting.

## Components (phase 1)

| Path | Component |
| --- | --- |
| `components/brand/logo.tsx` | `LogoLockup`, `LogoMark`, `LogoWordmarkCaps`, `LogoAppIcon` |
| `components/ui/button.tsx` | Variants: primary, secondary, ghost, danger. Sizes: sm to xl. Has a loading state. |
| `components/ui/badge.tsx` | `Badge`, `EventStatusBadge`, `OrderStatusBadge` |
| `components/ui/text-field.tsx` | Text input with a label, hint and inline error |
| `components/ui/phone-field.tsx` | Ghana phone input with a +233 prefix |
| `components/ui/rolling-number.tsx` | iOS-style rolling digits for totals and counters |
| `components/ui/theme-toggle.tsx` | Light/dark switch |
| `components/events/event-card.tsx` | Event card |
| `components/events/date-badge.tsx` | Slanted date badge |
| `components/events/fallback-cover.tsx` | Branded cover for events without artwork |
| `components/seating/seat.tsx` | One seat, in every state |
| `components/seating/seat-legend.tsx` | Seat map legend |

Helpers:

- `src/lib/format.ts` formats money from integer minor units ("GH₵ 150.00", "From GH₵ 80", "Free"), event dates in the event's timezone ("Sat 12 Dec 2026, 7:00 PM") and Ghana phone numbers.
- `src/lib/types.ts` holds the proposed frontend models.

## Assumptions and mock-only parts

- **Logos** are vector traces of the supplied WhatsApp images. Replace them with official SVGs when available (`public/brand/` and `src/components/brand/logo-paths.ts`).
- **Sample events** in `src/data/sample-events.ts` are fictional and use `imageUrl: null`, so the fallback cover shows. Stock photography arrives with the homepage step.
- **Event statuses.** The UI uses the brief v2 labels (Draft, Published, On sale, Paused, Sold out, Ended, Cancelled). How the backend's statuses (`DRAFT`, `SALES_OPEN`, …) map onto them still needs agreeing. "Paused" has no backend status yet.
- **Payment provider.** None is named in the UI until it's decided.
- **Price tier colours** on seats (VIP violet, Regular teal, Student orange) are proposals.

## Next phase 1 steps

1. Homepage and discovery
2. Event detail with ticket selection
3. Seat selection
4. Organiser dashboard overview
5. Mobile checkout, MoMo waiting state and issued ticket
