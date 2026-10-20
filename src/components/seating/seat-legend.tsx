import { cn } from "@/lib/cn";
import { formatMoney, type Money } from "@/lib/format";
import type { PriceTier } from "@/lib/types";
import { Seat } from "./seat";

export interface LegendTier {
  tier: PriceTier;
  name: string;
  price: Money;
}

/** Always-visible key for the seat map: price tiers first, then states. */
export function SeatLegend({ tiers, className }: { tiers: LegendTier[]; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Price tiers">
        {tiers.map((t) => (
          <li key={t.tier} className="flex items-center gap-2 text-small">
            <Seat state="available" tier={t.tier} label="" size={18} interactive={false} />
            <span className="font-semibold">{t.name}</span>
            <span className="text-fg-muted tabular">{formatMoney(t.price)}</span>
          </li>
        ))}
      </ul>
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-small text-fg-muted" aria-label="Seat states">
        <li className="flex items-center gap-2">
          <Seat state="selected" label="" size={18} interactive={false} /> Your seats
        </li>
        <li className="flex items-center gap-2">
          <Seat state="held" label="" size={18} interactive={false} /> Held
        </li>
        <li className="flex items-center gap-2">
          <Seat state="sold" label="" size={18} interactive={false} /> Sold
        </li>
        <li className="flex items-center gap-2">
          <Seat state="blocked" label="" size={18} interactive={false} /> Unavailable
        </li>
        <li className="flex items-center gap-2">
          <Seat state="available" accessible label="" size={18} interactive={false} /> Accessible
        </li>
      </ul>
    </div>
  );
}
