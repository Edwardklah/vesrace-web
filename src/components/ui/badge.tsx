import {
  Ban,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleX,
  Clock,
  Flag,
  Globe,
  PauseCircle,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { EventDisplayStatus, OrderStatus } from "@/lib/types";

type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-muted text-fg-muted border-line",
  primary: "bg-primary-soft text-primary-soft-fg border-transparent",
  success: "bg-success-soft text-success-fg border-transparent",
  warning: "bg-warning-soft text-warning-fg border-transparent",
  danger: "bg-danger-soft text-danger-fg border-transparent",
  info: "bg-info-soft text-info-fg border-transparent",
};

export interface BadgeProps {
  tone?: Tone;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

/** Small status label. Always text + icon, never colour alone. */
export function Badge({ tone = "neutral", icon: Icon, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-sm border px-2 text-caption font-semibold whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {Icon && <Icon className="size-3.5" aria-hidden strokeWidth={2.25} />}
      {children}
    </span>
  );
}

/* One fixed wording/colour/icon per status, used everywhere. */
const eventStatus: Record<EventDisplayStatus, { tone: Tone; icon: LucideIcon }> = {
  Draft: { tone: "neutral", icon: CircleDashed },
  Published: { tone: "info", icon: Globe },
  "On sale": { tone: "success", icon: CircleDot },
  Paused: { tone: "warning", icon: PauseCircle },
  "Sold out": { tone: "danger", icon: Ban },
  Ended: { tone: "neutral", icon: Flag },
  Cancelled: { tone: "danger", icon: CircleX },
};

const orderStatus: Record<OrderStatus, { tone: Tone; icon: LucideIcon }> = {
  Paid: { tone: "success", icon: CircleCheck },
  Pending: { tone: "warning", icon: Clock },
  Failed: { tone: "danger", icon: CircleX },
  Refunded: { tone: "neutral", icon: RotateCcw },
};

export function EventStatusBadge({ status }: { status: EventDisplayStatus }) {
  const s = eventStatus[status];
  return <Badge tone={s.tone} icon={s.icon}>{status}</Badge>;
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const s = orderStatus[status];
  return <Badge tone={s.tone} icon={s.icon}>{status}</Badge>;
}
