"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { Menu, X } from "lucide-react";
import { LogoLockup } from "@/components/brand/logo";
import { organiser } from "@/data/sample-dashboard";
import { spring } from "@/lib/motion";
import { Sidebar } from "./sidebar";

/**
 * Frame for every dashboard page.
 *   desktop (1280+)  full sidebar with labels
 *   tablet (768+)    icon rail
 *   phone            top bar with a menu button that opens the sidebar as a drawer
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  // Close the drawer after navigating (adjusting state during render, not in an effect).
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  // While the drawer is open: lock page scroll, close on Escape.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="min-h-dvh bg-bg">
      <a
        href="#dash-main"
        className="fixed top-2 left-2 z-[80] -translate-y-20 rounded-md bg-primary px-4 py-2 font-semibold text-primary-fg focus:translate-y-0"
      >
        Skip to content
      </a>

      {/* Tablet rail and desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[4.75rem] md:block xl:hidden">
        <Sidebar variant="rail" />
      </aside>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 xl:block">
        <Sidebar variant="full" />
      </aside>

      {/* Phone top bar */}
      <header className="glass sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line px-2 md:hidden">
        <m.button
          type="button"
          whileTap={{ scale: 0.9 }}
          transition={spring.press}
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="grid size-11 place-items-center rounded-full text-fg"
        >
          <Menu className="size-5" aria-hidden />
        </m.button>
        <Link href="/dashboard" className="text-fg">
          <LogoLockup className="h-5" />
        </Link>
        <span className="ml-auto mr-1 grid size-9 place-items-center rounded-full bg-surface-muted text-caption font-semibold" aria-label={organiser.user.name}>
          {organiser.user.initials}
        </span>
      </header>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <m.div
              className="absolute inset-0 bg-ink-1000/55"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <m.div
              className="absolute inset-y-0 left-0 w-[min(18rem,85vw)] shadow-e3"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={spring.smooth}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0.4, right: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60 || info.velocity.x < -400) setOpen(false);
              }}
            >
              <Sidebar variant="full" onNavigate={() => setOpen(false)} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="absolute top-4 right-3 grid size-10 place-items-center rounded-full text-ink-300 hover:bg-white/10"
              >
                <X className="size-5" aria-hidden />
              </button>
            </m.div>
          </div>
        )}
      </AnimatePresence>

      <main id="dash-main" className="md:pl-[4.75rem] xl:pl-64">
        <div className="mx-auto max-w-[90rem] px-4 pt-6 pb-16 md:px-8 md:pt-8 xl:px-10">{children}</div>
      </main>
    </div>
  );
}
