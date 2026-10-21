import {
  Armchair,
  CalendarDays,
  ChartColumn,
  LayoutDashboard,
  ReceiptText,
  ScanLine,
  Settings,
  Store,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/data/sample-dashboard";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Roles that see it. Hidden (not disabled) for everyone else. */
  roles: Role[];
}

const all: Role[] = ["owner", "manager"];

export const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, roles: all },
  { href: "/dashboard/events", label: "Events", icon: CalendarDays, roles: all },
  { href: "/dashboard/orders", label: "Orders", icon: ReceiptText, roles: all },
  { href: "/dashboard/attendees", label: "Attendees", icon: Users, roles: all },
  { href: "/dashboard/venues", label: "Venues & seat maps", icon: Armchair, roles: all },
  { href: "/dashboard/reports", label: "Reports", icon: ChartColumn, roles: all },
];

export const adminNav: NavItem[] = [
  { href: "/dashboard/payouts", label: "Payouts", icon: Wallet, roles: ["owner"] },
  { href: "/dashboard/team", label: "Team", icon: UserCog, roles: ["owner"] },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, roles: ["owner"] },
];

/** The two tools door and box-office staff use; organisers open them on event day. */
export const toolNav: NavItem[] = [
  { href: "/dashboard/box-office", label: "Box office", icon: Store, roles: all },
  { href: "/dashboard/scanner", label: "Scanner", icon: ScanLine, roles: all },
];

/** Every section that has a page (built or placeholder). */
export const allSections = [...mainNav, ...adminNav, ...toolNav].filter((n) => n.href !== "/dashboard");

export const forRole = (items: NavItem[], role: Role) => items.filter((i) => i.roles.includes(role));

export function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname === href || pathname.startsWith(href + "/");
}
