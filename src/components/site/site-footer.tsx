import Link from "next/link";
import { LogoLockup } from "@/components/brand/logo";

const columns = [
  {
    title: "Discover",
    links: [
      ["Events in Accra", "/#discover"],
      ["Events in Kumasi", "/#discover"],
      ["This weekend", "/#discover"],
    ],
  },
  {
    title: "Your tickets",
    links: [
      ["Find my tickets", "/tickets/find"],
      ["Help with an order", "/help"],
    ],
  },
  {
    title: "Organisers",
    links: [
      ["Sell tickets", "/organisers"],
      ["Organiser dashboard", "/dashboard"],
    ],
  },
] as const;

export function SiteFooter({ photoCredits }: { photoCredits?: string[] }) {
  return (
    <footer className="border-t border-line bg-surface-muted">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)] md:px-8">
        <div className="max-w-xs">
          <LogoLockup className="h-7 text-fg" />
          <p className="mt-4 text-small text-fg-muted">
            Tickets for concerts, conferences, church conventions, sport and more across Ghana.
            Pay with mobile money or card.
          </p>
        </div>
        {columns.map((c) => (
          <div key={c.title}>
            <p className="text-overline text-fg-muted">{c.title}</p>
            <ul className="mt-4 grid gap-2.5">
              {c.links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="text-small text-fg hover:text-primary-ink">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto max-w-7xl border-t border-line px-4 py-6 text-caption text-fg-muted md:px-8">
        <p>Design review build. Events, organisers and prices are fictional.</p>
        {photoCredits && photoCredits.length > 0 && (
          <p className="mt-1">Photos on Unsplash by {photoCredits.join(", ")}.</p>
        )}
      </div>
    </footer>
  );
}
