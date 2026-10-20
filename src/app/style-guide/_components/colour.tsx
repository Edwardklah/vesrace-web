import { cn } from "@/lib/cn";
import { Label } from "./section";

const teal = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];
const ink = ["0", "50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950", "1000"];

function Scale({ name, stops, highlight }: { name: string; stops: string[]; highlight: string }) {
  return (
    <div>
      <Label>{name}</Label>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(3.5rem,1fr))] overflow-hidden rounded-md border border-line">
        {stops.map((s) => (
          <div key={s} className="flex flex-col">
            <div
              className={cn("h-16", s === highlight && "relative")}
              style={{ background: `var(--${name}-${s})` }}
            >
              {s === highlight && (
                <span className="absolute inset-x-0 bottom-1 text-center text-[0.625rem] font-semibold text-white">
                  BRAND
                </span>
              )}
            </div>
            <span className="px-1.5 py-1.5 text-caption text-fg-muted tabular">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Semantic tokens shown in both themes at once: each column forces a theme
   by setting the `.light` / `.dark` class on its own container. */
const semantic: { token: string; use: string; text?: string }[] = [
  { token: "bg", use: "Page canvas" },
  { token: "surface", use: "Cards" },
  { token: "surface-muted", use: "Sunken areas" },
  { token: "line", use: "Borders" },
  { token: "fg", use: "Text" },
  { token: "fg-muted", use: "Secondary text" },
  { token: "primary", use: "Primary action", text: "primary-fg" },
  { token: "primary-soft", use: "Selected, tags", text: "primary-soft-fg" },
  { token: "success-soft", use: "Success", text: "success-fg" },
  { token: "warning-soft", use: "Warning", text: "warning-fg" },
  { token: "danger-soft", use: "Danger", text: "danger-fg" },
  { token: "info-soft", use: "Info", text: "info-fg" },
];

function ThemeColumn({ theme }: { theme: "light" | "dark" }) {
  return (
    <div className={cn(theme, "rounded-lg border border-line bg-bg p-4 text-fg")}>
      <p className="mb-4 text-overline text-fg-muted">{theme === "light" ? "Light" : "Dark"}</p>
      <ul className="grid gap-2">
        {semantic.map((s) => (
          <li key={s.token} className="flex items-center gap-3">
            <span
              className="grid size-10 shrink-0 place-items-center rounded-sm border border-line text-small font-bold"
              style={{
                background: `var(--${s.token})`,
                color: s.text ? `var(--${s.text})` : undefined,
              }}
            >
              {s.text ? "Aa" : ""}
            </span>
            <span className="min-w-0">
              <code className="block truncate font-mono text-small">--{s.token}</code>
              <span className="text-caption text-fg-muted">{s.use}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ColourSection() {
  return (
    <div className="grid gap-10">
      <Scale name="teal" stops={teal} highlight="700" />
      <Scale name="ink" stops={ink} highlight="950" />
      <div>
        <Label>Semantic tokens</Label>
        <div className="grid gap-4 sm:grid-cols-2">
          <ThemeColumn theme="light" />
          <ThemeColumn theme="dark" />
        </div>
        <p className="mt-4 max-w-2xl text-small text-fg-muted">
          Components only use semantic tokens. Organiser storefront branding can replace
          the primary set; status colours and seat states stay fixed so they always mean
          the same thing. Every text pair here passes WCAG AA in both themes.
        </p>
      </div>
    </div>
  );
}
