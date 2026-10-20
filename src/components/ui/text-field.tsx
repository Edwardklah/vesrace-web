"use client";

import { forwardRef, useId } from "react";
import { AnimatePresence, m } from "motion/react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";

export interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  id: string;
  children: React.ReactNode;
}

/**
 * Label, hint and error around any control. The error appears beside the
 * field (not only in a toast) and is announced to screen readers.
 */
export function FieldShell({ label, hint, error, optional, id, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex items-baseline gap-2 text-small font-semibold text-fg">
        {label}
        {optional && <span className="font-normal text-fg-muted">Optional</span>}
      </label>
      {children}
      <AnimatePresence initial={false} mode="popLayout">
        {error ? (
          <m.p
            key="error"
            id={`${id}-error`}
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={spring.snappy}
            className="flex items-center gap-1.5 text-small text-danger"
          >
            <CircleAlert className="size-4 shrink-0" aria-hidden />
            {error}
          </m.p>
        ) : hint ? (
          <p key="hint" id={`${id}-hint`} className="text-small text-fg-muted">
            {hint}
          </p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export const inputBase = cn(
  "h-12 w-full rounded-sm border bg-surface px-3.5 text-body text-fg",
  "placeholder:text-fg-subtle transition-[border-color,box-shadow] duration-150",
  "hover:border-line-strong focus-visible:outline-none focus-visible:border-primary",
  "focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_25%,transparent)]",
  "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-fg-muted",
);

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, optional, id, className, ...props },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional} id={fieldId}>
      <input
        ref={ref}
        id={fieldId}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        className={cn(inputBase, error ? "border-danger" : "border-line", className)}
        {...props}
      />
    </FieldShell>
  );
});
