"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, m, useDragControls } from "motion/react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";

export interface SelectMenuOption<T extends string> {
  value: T;
  label: string;
  /** Small text on the right, e.g. "4 events". */
  meta?: string;
  icon?: React.ReactNode;
}

/* Phones get a bottom sheet; larger screens get a popover under the field. */
const mobileQuery = "(max-width: 767px)";
function subscribeMedia(cb: () => void) {
  const m = window.matchMedia(mobileQuery);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}
const useIsMobile = () =>
  useSyncExternalStore(
    subscribeMedia,
    () => window.matchMedia(mobileQuery).matches,
    () => false,
  );

/**
 * Custom select: a listbox in a springy popover (desktop) or a draggable
 * bottom sheet (phones). Keyboard: Up/Down to move, Enter/Space to choose,
 * Escape to close, type a letter to jump.
 */
export function SelectMenu<T extends string>({
  options,
  value,
  onChange,
  label,
  title,
  leadingIcon,
  className,
}: {
  options: SelectMenuOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name, e.g. "City". */
  label: string;
  /** Heading shown inside the menu, e.g. "Choose a city". */
  title?: string;
  leadingIcon?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const isMobile = useIsMobile();
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) ?? options[0];

  const openMenu = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };
  const choose = (v: T) => {
    onChange(v);
    close();
  };

  // Move focus into the list when it opens.
  useEffect(() => {
    if (open) requestAnimationFrame(() => listRef.current?.focus());
  }, [open]);

  // Desktop: close when clicking anywhere outside.
  useEffect(() => {
    if (!open || isMobile) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, isMobile]);

  // Phones: stop the page scrolling behind the sheet.
  useEffect(() => {
    if (!open || !isMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isMobile]);

  const onListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(options[active].value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      close(false);
    } else if (e.key.length === 1) {
      // Type-ahead: jump to the next option starting with that letter.
      const k = e.key.toLowerCase();
      const start = (active + 1) % options.length;
      const order = [...options.slice(start), ...options.slice(0, start)];
      const hit = order.find((o) => o.label.toLowerCase().startsWith(k));
      if (hit) setActive(options.indexOf(hit));
    }
  };

  const list = (
    <ul
      ref={listRef}
      id={`${id}-list`}
      role="listbox"
      tabIndex={-1}
      aria-label={label}
      aria-activedescendant={`${id}-opt-${active}`}
      onKeyDown={onListKeyDown}
      className="grid gap-0.5 outline-none"
    >
      {options.map((o, i) => {
        const isSelected = o.value === value;
        const isActive = i === active;
        return (
          <li
            key={o.value}
            id={`${id}-opt-${i}`}
            role="option"
            aria-selected={isSelected}
            onPointerMove={() => setActive(i)}
            onClick={() => choose(o.value)}
            className={cn(
              "relative isolate flex h-12 cursor-pointer items-center gap-3 rounded-md px-3 select-none",
              isSelected ? "text-primary-ink" : "text-fg",
            )}
          >
            {/* The highlight glides between rows instead of jumping. */}
            {isActive && (
              <m.span
                layoutId={`${id}-highlight`}
                transition={spring.snappy}
                className="absolute inset-0 -z-10 rounded-md bg-ink-950/[0.05] dark:bg-white/[0.08]"
              />
            )}
            <span className={cn("grid size-8 shrink-0 place-items-center rounded-sm", isSelected ? "bg-primary-soft text-primary-soft-fg" : "text-fg-muted")}>
              {o.icon}
            </span>
            <span className="flex-1 truncate font-semibold">{o.label}</span>
            {o.meta && <span className="text-caption text-fg-muted tabular">{o.meta}</span>}
            <span className="grid w-5 place-items-center">
              <AnimatePresence initial={false}>
                {isSelected && (
                  <m.span
                    initial={{ scale: 0.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.3, opacity: 0 }}
                    transition={spring.pop}
                    className="inline-flex"
                  >
                    <Check className="size-4" strokeWidth={3} aria-hidden />
                  </m.span>
                )}
              </AnimatePresence>
            </span>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <m.button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-label={`${label}: ${selected.label}`}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            openMenu();
          }
        }}
        whileTap={{ scale: 0.98 }}
        transition={spring.press}
        className={cn(
          "flex h-14 w-full items-center gap-3 rounded-md bg-surface-muted pr-3 pl-4 text-left text-body font-semibold text-fg transition-shadow",
          "focus-visible:shadow-[0_0_0_2px_var(--primary)] focus-visible:outline-none",
          open && "shadow-[0_0_0_2px_var(--primary)]",
        )}
      >
        <span className="text-fg-muted">{leadingIcon}</span>
        <span className="flex-1 truncate">{selected.label}</span>
        <m.span animate={{ rotate: open ? 180 : 0 }} transition={spring.snappy} className="inline-flex text-fg-muted">
          <ChevronDown className="size-5" aria-hidden />
        </m.span>
      </m.button>

      {/* Desktop popover */}
      <AnimatePresence>
        {open && !isMobile && (
          <m.div
            key="popover"
            initial={{ opacity: 0, scale: 0.94, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4, transition: { duration: 0.12 } }}
            transition={spring.snappy}
            style={{ transformOrigin: "top right" }}
            className="absolute top-[calc(100%+0.5rem)] right-0 z-50 w-full min-w-72 rounded-lg border border-line bg-surface-raised p-1.5 shadow-e3"
          >
            {title && <p className="px-3 pt-2 pb-2 text-overline text-fg-muted">{title}</p>}
            {list}
          </m.div>
        )}
      </AnimatePresence>

      {/* Phone bottom sheet, rendered at the end of <body>. */}
      {isMobile && typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && <MobileSheet title={title} onClose={() => close()}>{list}</MobileSheet>}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

function MobileSheet({
  title,
  onClose,
  children,
}: {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const controls = useDragControls();
  return (
    <div className="fixed inset-0 z-[60]">
      <m.div
        className="absolute inset-0 bg-ink-1000/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={spring.smooth}
        onClick={onClose}
        aria-hidden
      />
      <m.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        drag="y"
        dragListener={false}
        dragControls={controls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.05, bottom: 0.9 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 90 || info.velocity.y > 500) onClose();
        }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={spring.smooth}
        className="absolute inset-x-0 bottom-0 rounded-t-[1.5rem] bg-surface-raised px-3 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-e3"
      >
        <div
          onPointerDown={(e) => controls.start(e)}
          className="mx-auto flex h-7 w-full cursor-grab touch-none items-center justify-center"
          aria-hidden
        >
          <span className="h-1.5 w-10 rounded-full bg-line-strong" />
        </div>
        {title && <p className="px-3 pb-3 text-h3">{title}</p>}
        {children}
      </m.div>
    </div>
  );
}
