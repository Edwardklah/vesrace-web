import { Label } from "./section";

const typeScale = [
  { cls: "text-display-xl", name: "Display XL", spec: "Archivo 850 italic · 44 → 88px", sample: "Harmattan Sounds" },
  { cls: "text-display", name: "Display", spec: "Archivo 850 italic · 36 → 64px", sample: "This weekend in Accra" },
  { cls: "text-h1", name: "Heading 1", spec: "Archivo 800 · 30 → 40px", sample: "Kumasi Tech & Business Summit" },
  { cls: "text-h2", name: "Heading 2", spec: "Geist 650 · 24 → 30px", sample: "Choose your tickets" },
  { cls: "text-h3", name: "Heading 3", spec: "Geist 600 · 18 → 20px", sample: "Regular admission" },
  { cls: "text-body-lg", name: "Body large", spec: "Geist 400 · 18/29px", sample: "Doors open at 6:00 PM. Bring your ticket on your phone." },
  { cls: "text-body", name: "Body", spec: "Geist 400 · 16/25px", sample: "Doors open at 6:00 PM. Bring your ticket on your phone." },
  { cls: "text-small", name: "Small", spec: "Geist 400 · 14/20px", sample: "Osu Arts Hall, Accra" },
  { cls: "text-caption", name: "Caption", spec: "Geist 500 · 12/16px", sample: "Sent by SMS and email" },
  { cls: "text-overline", name: "Overline", spec: "Geist 600 · 11px · tracked caps", sample: "Concert" },
];

export function TypeSection() {
  return (
    <div className="grid gap-12">
      <ul className="divide-y divide-line">
        {typeScale.map((t) => (
          <li key={t.cls} className="grid gap-2 py-5 md:grid-cols-[12rem_1fr] md:items-baseline">
            <div>
              <p className="text-small font-semibold">{t.name}</p>
              <p className="text-caption text-fg-muted">{t.spec}</p>
            </div>
            <p className={`${t.cls} min-w-0 text-balance`}>{t.sample}</p>
          </li>
        ))}
      </ul>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-line p-6">
          <Label>Tabular numerals</Label>
          <p className="text-h2 tabular">GH₵ 1,280.00</p>
          <p className="text-h2 tabular">GH₵ 98,400.00</p>
          <p className="mt-2 text-small text-fg-muted">Prices line up in tables and totals.</p>
        </div>
        <div className="rounded-lg border border-line p-6">
          <Label>Ticket codes</Label>
          <p className="font-mono text-h3 tracking-wider">VSR-7K2Q-94MD</p>
          <p className="mt-2 text-small text-fg-muted">Geist Mono for references and codes.</p>
        </div>
      </div>
    </div>
  );
}

const spacing = [1, 2, 3, 4, 6, 8, 12, 16, 24];
export function SpacingSection() {
  return (
    <div className="grid gap-12 lg:grid-cols-3">
      <div>
        <Label>Spacing · 4px base</Label>
        <ul className="grid gap-2">
          {spacing.map((s) => (
            <li key={s} className="flex items-center gap-3">
              <span className="w-10 text-caption text-fg-muted tabular">{s * 4}px</span>
              <span className="h-3 rounded-[2px] bg-primary" style={{ width: s * 4 }} />
            </li>
          ))}
        </ul>
      </div>
      <div>
        <Label>Radius</Label>
        <div className="grid grid-cols-2 gap-3">
          {[
            ["sm", "6px", "Inputs, badges"],
            ["md", "12px", "Cards, panels"],
            ["lg", "20px", "Sheets, dialogs"],
            ["full", "Pill", "Seats, toggles"],
          ].map(([k, v, use]) => (
            <div key={k} className="flex flex-col gap-2">
              <div
                className="h-16 border-2 border-primary bg-primary-soft"
                style={{ borderRadius: k === "full" ? 9999 : `var(--radius-${k})` }}
              />
              <p className="text-caption">
                <span className="font-semibold">{k}</span> · {v}
                <span className="block text-fg-muted">{use}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <Label>Elevation · 3 levels</Label>
        <div className="grid gap-4 rounded-lg bg-surface-muted p-5">
          {[
            ["e1", "Sticky bars, buttons", "shadow-e1"],
            ["e2", "Menus, popovers", "shadow-e2"],
            ["e3", "Dialogs, sheets", "shadow-e3"],
          ].map(([k, use, shadow]) => (
            <div key={k} className={`rounded-md bg-surface-raised p-4 ${shadow}`}>
              <p className="text-small font-semibold">{k}</p>
              <p className="text-caption text-fg-muted">{use}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
