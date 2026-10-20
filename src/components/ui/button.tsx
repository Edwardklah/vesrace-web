"use client";

import { forwardRef } from "react";
import { m, type HTMLMotionProps } from "motion/react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { pressScale, spring } from "@/lib/motion";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "xl";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-fg hover:bg-primary-hover shadow-e1",
  secondary:
    "bg-surface text-fg border border-line-strong hover:bg-surface-muted",
  ghost: "bg-transparent text-fg hover:bg-surface-muted",
  danger: "bg-danger text-white hover:brightness-110 dark:text-ink-1000",
};

// md and up meet the 44px minimum touch target. xl is for POS/scanner.
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-small gap-1.5 rounded-sm",
  md: "h-11 px-5 text-body gap-2 rounded-md",
  lg: "h-13 px-6 text-body-lg gap-2 rounded-md",
  xl: "h-16 px-8 text-h3 gap-3 rounded-lg",
};

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: Variant;
  size?: Size;
  /** Shows a spinner, blocks repeat taps and announces "busy". */
  loading?: boolean;
  /** Icon element (from lucide-react) before the label. */
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, icon, disabled, className, children, onClick, ...props },
  ref,
) {
  const inactive = disabled || loading;
  return (
    <m.button
      ref={ref}
      // Springy press: shrinks under the finger, bounces back on release.
      whileTap={inactive ? undefined : { scale: pressScale.button }}
      transition={spring.press}
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-disabled={inactive || undefined}
      // While loading, swallow taps so an order or sale can't be sent twice.
      onClick={inactive ? (e) => e.preventDefault() : onClick}
      className={cn(
        "relative inline-flex select-none items-center justify-center font-semibold whitespace-nowrap",
        "transition-[background-color,border-color,color,filter] duration-150",
        "disabled:cursor-not-allowed disabled:opacity-45",
        loading && "cursor-progress",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {/* Keep the label in place while loading so the button doesn't resize. */}
      <span className={cn("inline-flex items-center gap-[inherit]", loading && "invisible")}>
        {icon}
        {children}
      </span>
      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <LoaderCircle className="size-5 animate-spin" aria-hidden />
          <span className="sr-only">Working…</span>
        </span>
      )}
    </m.button>
  );
});
