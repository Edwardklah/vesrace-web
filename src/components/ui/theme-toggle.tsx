"use client";

import { useSyncExternalStore } from "react";
import { AnimatePresence, m } from "motion/react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";

/* The theme lives on <html class="dark">. We read it as an external store so
   React stays in sync without an effect, and the server renders a neutral state. */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
const getSnapshot = () => document.documentElement.classList.contains("dark");
const getServerSnapshot = () => null;

/** Switches light/dark and remembers the choice on this device. */
export function ThemeToggle({ className }: { className?: string }) {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const root = document.documentElement;
    const next = !root.classList.contains("dark");
    // Briefly enable colour transitions so the switch feels smooth.
    root.classList.add("theme-transition");
    root.classList.toggle("dark", next);
    window.setTimeout(() => root.classList.remove("theme-transition"), 350);
    try {
      localStorage.setItem("vesrace-theme", next ? "dark" : "light");
    } catch {
      /* storage blocked: the toggle still works for this visit */
    }
  }

  return (
    <m.button
      type="button"
      onClick={toggle}
      whileTap={{ scale: 0.9 }}
      transition={spring.press}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className={cn(
        "relative grid size-11 place-items-center overflow-hidden rounded-full border border-line bg-surface text-fg hover:bg-surface-muted",
        className,
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {dark !== null && (
          <m.span
            key={dark ? "moon" : "sun"}
            initial={{ y: 18, rotate: -45, opacity: 0 }}
            animate={{ y: 0, rotate: 0, opacity: 1 }}
            exit={{ y: -18, rotate: 45, opacity: 0 }}
            transition={spring.pop}
            className="grid place-items-center"
          >
            {dark ? <Moon className="size-5" aria-hidden /> : <Sun className="size-5" aria-hidden />}
          </m.span>
        )}
      </AnimatePresence>
    </m.button>
  );
}
