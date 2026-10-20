import type { Metadata } from "next";
import { LogoAppIcon, LogoLockup, LogoMark, LogoWordmarkCaps } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ColourSection } from "./_components/colour";
import {
  BadgesDemo,
  ButtonsDemo,
  EventCardsDemo,
  InputsDemo,
  SeatsDemo,
} from "./_components/component-demos";
import { SpacingSection, TypeSection } from "./_components/foundations";
import { MotionSection } from "./_components/motion-demos";
import { Label, Section } from "./_components/section";

export const metadata: Metadata = { title: "Style guide" };

const nav = [
  ["brand", "Brand"],
  ["colour", "Colour"],
  ["type", "Type"],
  ["space", "Space"],
  ["motion", "Motion"],
  ["buttons", "Buttons"],
  ["inputs", "Inputs"],
  ["badges", "Badges"],
  ["event-cards", "Event cards"],
  ["seats", "Seats"],
];

export default function StyleGuidePage() {
  return (
    <>
      <header className="glass sticky top-0 z-40 border-b border-line">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 md:px-8">
          <LogoLockup className="h-6 text-fg" />
          <span className="hidden h-5 w-px bg-line sm:block" aria-hidden />
          <span className="hidden text-small font-semibold text-fg-muted sm:block">Style guide</span>
          <nav aria-label="Sections" className="ml-auto hidden lg:block">
            <ul className="flex gap-1">
              {nav.map(([id, label]) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="rounded-full px-3 py-1.5 text-small text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <ThemeToggle className="ml-auto lg:ml-2" />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 md:px-8">
        {/* Hero */}
        <div className="relative isolate overflow-hidden py-16 md:py-28">
          <LogoMark
            title=""
            className="pointer-events-none absolute top-6 -right-24 -z-10 h-[115%] text-primary/[0.07] md:-right-10"
          />
          <p className="text-overline text-primary-ink">Phase 1 · Review</p>
          <h1 className="mt-4 max-w-4xl text-display-xl text-balance">
            One brand, from the door to the dashboard.
          </h1>
          <p className="mt-6 max-w-2xl text-body-lg text-fg-muted text-pretty">
            The Vesrace foundations: colour, type, space, motion and the first components.
            Toggle the theme at the top to check every token in light and dark.
          </p>
        </div>

        <Section
          id="brand"
          index="01"
          title="Brand"
          intro="Traced to vector from the supplied artwork. The italic lockup leads; the mark works alone at small sizes; the caps wordmark is for marketing only."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col items-start justify-between gap-8 rounded-lg border border-line p-6">
              <LogoLockup className="h-10 text-fg" />
              <Label>Primary lockup · headers</Label>
            </div>
            <div className="flex flex-col items-start justify-between gap-8 rounded-lg bg-ink-950 p-6 text-white dark:ring-1 dark:ring-white/10">
              <LogoLockup className="h-10" />
              <p className="text-overline text-ink-400">On ink</p>
            </div>
            <div className="flex flex-col items-start justify-between gap-8 rounded-lg bg-primary p-6 text-primary-fg">
              <LogoLockup className="h-10" />
              <p className="text-overline opacity-80">On primary</p>
            </div>
            <div className="flex flex-col justify-between gap-8 rounded-lg border border-line p-6">
              <div className="flex items-end gap-5">
                <LogoAppIcon className="size-20" />
                <LogoAppIcon className="size-12" />
                <LogoAppIcon className="size-8" />
              </div>
              <Label>App icon · favicon</Label>
            </div>
            <div className="flex flex-col items-start justify-between gap-8 rounded-lg border border-line p-6 md:col-span-2">
              <LogoWordmarkCaps className="h-16 text-primary-ink md:h-20" />
              <Label>Caps wordmark · marketing and hero only</Label>
            </div>
          </div>
        </Section>

        <Section
          id="colour"
          index="02"
          title="Colour"
          intro="Deep teal from the brand decision, paired with the logo's ink. Teal keeps Vesrace clearly apart from crimson and orange competitors, and suits a church convention as well as a concert."
        >
          <ColourSection />
        </Section>

        <Section
          id="type"
          index="03"
          title="Type"
          intro="Archivo at heavy weight, narrowed and italic, picks up the wordmark's speed. Geist handles everything you read and tap. Both are free and have tabular numerals."
        >
          <TypeSection />
        </Section>

        <Section id="space" index="04" title="Space, radius, elevation" intro="A 4px grid, four radius steps and no more than three shadow levels.">
          <SpacingSection />
        </Section>

        <Section
          id="motion"
          index="05"
          title="Motion"
          intro="Springs instead of timed curves, so things settle the way iOS does. Everything you press gives a little under your finger."
        >
          <MotionSection />
        </Section>

        <Section id="buttons" index="06" title="Buttons" intro="One primary action per view. Medium and up meet the 44px touch target; XL is for POS and scanner screens.">
          <ButtonsDemo />
        </Section>

        <Section id="inputs" index="07" title="Inputs" intro="Phone first, with +233 fixed. Errors sit beside the field in words, never only in a toast. Leave Full name empty and tab away to see one.">
          <InputsDemo />
        </Section>

        <Section id="badges" index="08" title="Badges" intro="Fixed wording, colour and icon for every status, so the same state always looks the same.">
          <BadgesDemo />
        </Section>

        <Section id="event-cards" index="09" title="Event cards" intro="Image-led with the logo's slant on the crop and a skewed date badge. Prices as GH₵, with ‘From’ when tickets vary and ‘Free’ when they don't cost anything.">
          <EventCardsDemo />
        </Section>

        <Section id="seats" index="10" title="Seats" intro="Every state changes shape or icon as well as colour, so the map reads in greyscale too. Try selecting seats in the row below.">
          <SeatsDemo />
        </Section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-small text-fg-muted md:px-8">
          <LogoMark className="h-5 text-fg" />
          <p>Design review build · sample data only</p>
        </div>
      </footer>
    </>
  );
}
