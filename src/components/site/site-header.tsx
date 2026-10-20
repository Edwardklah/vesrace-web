"use client";

import { useState } from "react";
import Link from "next/link";
import { m, useMotionValueEvent, useScroll } from "motion/react";
import { Ticket } from "lucide-react";
import { LogoLockup } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";

/**
 * Public site header. Over the hero it's transparent with white text; once
 * you scroll it settles into a solid, blurred bar (as iOS navigation bars do).
 */
export function SiteHeader({ overHero = false }: { overHero?: boolean }) {
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(!overHero);

  useMotionValueEvent(scrollY, "change", (y) => {
    if (overHero) setSolid(y > 24);
  });

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <m.div
        initial={false}
        animate={{ opacity: solid ? 1 : 0 }}
        transition={spring.snappy}
        className="glass absolute inset-0 border-b border-line"
        aria-hidden
      />
      <div
        className={cn(
          "relative mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 transition-colors duration-300 md:px-8",
          solid ? "text-fg" : "text-white",
        )}
      >
        <Link href="/" aria-label="Vesrace home" className="mr-auto rounded-sm">
          <LogoLockup className="h-6" title="Vesrace" />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          <Link href="/#discover" className="rounded-full px-3.5 py-2 text-small font-semibold opacity-85 hover:opacity-100">
            Browse events
          </Link>
          <Link href="/style-guide" className="rounded-full px-3.5 py-2 text-small font-semibold opacity-85 hover:opacity-100">
            For organisers
          </Link>
        </nav>

        <Link
          href="/tickets/find"
          aria-label="Find my tickets"
          className={cn(
            "inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full border px-3 text-small font-semibold transition-colors min-[400px]:px-4",
            solid
              ? "border-line-strong bg-surface hover:bg-surface-muted"
              : "border-white/35 bg-white/10 hover:bg-white/20",
          )}
        >
          <Ticket className="size-4" aria-hidden />
          <span className="hidden min-[400px]:inline">Find my tickets</span>
        </Link>
        <ThemeToggle
          className={cn(
            !solid && "border-white/35 bg-white/10 text-white hover:bg-white/20",
          )}
        />
      </div>
    </header>
  );
}
