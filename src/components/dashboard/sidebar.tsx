"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { m } from "motion/react";
import { ChevronsUpDown } from "lucide-react";
import { LogoLockup, LogoMark } from "@/components/brand/logo";
import { Tooltip } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { organiser } from "@/data/sample-dashboard";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";
import { adminNav, forRole, isActive, mainNav, toolNav, type NavItem } from "./nav";
import { roleLabel, useRole } from "./use-role";

/**
 * The dashboard's left navigation.
 *
 * - `full`: labels and icons (desktop, and inside the phone drawer).
 * - `rail`: icons only with a tooltip for each (tablets).
 *
 * It's dark in both themes so the work area stays the brightest thing on
 * screen, and the active item has the logo's slanted mark.
 */
export function Sidebar({ variant, onNavigate }: { variant: "full" | "rail"; onNavigate?: () => void }) {
  const pathname = usePathname();
  const role = useRole();
  const rail = variant === "rail";
  // Keep the review switch on while moving between pages.
  const suffix = role === "manager" ? "?role=manager" : "";

  const item = (n: NavItem) => {
    const active = isActive(pathname, n.href);
    const link = (
      <Link
        href={n.href + suffix}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        aria-label={rail ? n.label : undefined}
        className={cn(
          "relative isolate flex h-10 items-center gap-3 rounded-md text-small font-medium transition-colors",
          rail ? "w-11 justify-center" : "px-3",
          active ? "text-white" : "text-ink-300 hover:bg-white/[0.05] hover:text-white",
        )}
      >
        {active && (
          <m.span
            layoutId={`dash-nav-${variant}`}
            transition={spring.snappy}
            className="absolute inset-0 -z-10 rounded-md bg-white/[0.09]"
          >
            <span className="absolute top-2 bottom-2 left-0 w-[3px] -skew-x-12 rounded-full bg-teal-400" />
          </m.span>
        )}
        <n.icon className={cn("size-[1.125rem] shrink-0", active && "text-teal-300")} aria-hidden />
        {!rail && <span className="truncate">{n.label}</span>}
      </Link>
    );
    return (
      <li key={n.href}>
        {rail ? (
          <Tooltip content={n.label} side="right" asChild touch={false}>
            {link}
          </Tooltip>
        ) : (
          link
        )}
      </li>
    );
  };

  const group = (items: NavItem[], title?: string) => {
    const visible = forRole(items, role);
    if (visible.length === 0) return null;
    return (
      <div className="grid gap-1">
        {title && !rail && <p className="px-3 pb-1 text-overline text-ink-500">{title}</p>}
        {title && rail && <div className="mx-auto my-1 h-px w-6 bg-white/10" aria-hidden />}
        <ul className={cn("grid gap-0.5", rail && "justify-items-center")}>{visible.map(item)}</ul>
      </div>
    );
  };

  return (
    <div className={cn("flex h-full flex-col bg-ink-950 text-ink-100", rail ? "items-center px-2 py-5" : "px-3 py-5")}>
      <Link href={"/dashboard" + suffix} onClick={onNavigate} className={cn("flex h-9 items-center text-white", !rail && "px-3")}>
        {rail ? <LogoMark className="h-6" /> : <LogoLockup className="h-6" />}
      </Link>

      {/* Organisation switcher. MOCK: one organisation for now. */}
      <button
        type="button"
        className={cn(
          "mt-6 flex items-center gap-3 rounded-md border border-white/10 text-left transition-colors hover:bg-white/[0.05]",
          rail ? "size-11 justify-center" : "p-2",
        )}
        aria-label={`Organisation: ${organiser.name}. Switch organisation`}
      >
        <span className="grid size-8 shrink-0 -skew-x-12 place-items-center rounded-sm bg-teal-500 text-caption font-bold text-ink-950">
          <span className="skew-x-12">{organiser.initials}</span>
        </span>
        {!rail && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-small font-semibold text-white">{organiser.name}</span>
              <span className="block text-caption text-ink-400">{roleLabel[role]}</span>
            </span>
            <ChevronsUpDown className="size-4 text-ink-400" aria-hidden />
          </>
        )}
      </button>

      <nav aria-label="Dashboard" className={cn("mt-6 grid flex-1 content-start gap-5 overflow-y-auto", rail && "w-full")}>
        {group(mainNav)}
        {group(adminNav, "Organisation")}
        {group(toolNav, "Event day")}
      </nav>

      <div className={cn("mt-4 flex items-center gap-3 border-t border-white/10 pt-4", rail ? "flex-col" : "px-1")}>
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-caption font-semibold text-white" aria-hidden>
          {organiser.user.initials}
        </span>
        {!rail && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-small font-semibold text-white">{organiser.user.name}</span>
            <span className="block truncate text-caption text-ink-400">Signed in</span>
          </span>
        )}
        <ThemeToggle className="size-9 border-white/10 bg-transparent text-ink-200 hover:bg-white/[0.06]" />
      </div>
    </div>
  );
}
