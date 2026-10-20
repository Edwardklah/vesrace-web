"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { formatGhanaPhone } from "@/lib/format";
import { FieldShell, inputBase } from "./text-field";

export interface PhoneFieldProps {
  label?: string;
  hint?: string;
  error?: string;
  /** Digits only, local format, e.g. "0241234567". */
  value?: string;
  onChange?: (digits: string) => void;
  name?: string;
}

/**
 * Ghana phone number input. Fixed +233 prefix; the user types the local
 * number and we format it as they type: "024 123 4567".
 */
export function PhoneField({
  label = "Phone number",
  hint = "We'll send your tickets here by SMS.",
  error,
  value,
  onChange,
  name = "phone",
}: PhoneFieldProps) {
  const id = useId();
  const [internal, setInternal] = useState("");
  const digits = value ?? internal;

  return (
    <FieldShell label={label} hint={hint} error={error} id={id}>
      <div className="relative flex">
        <span
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 flex items-center gap-2 pl-3.5 pr-3",
            "border-r border-line text-body font-medium text-fg-muted",
          )}
          aria-hidden
        >
          +233
        </span>
        <input
          id={id}
          name={name}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="024 123 4567"
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
          value={formatGhanaPhone(digits)}
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, "").slice(0, 10);
            setInternal(next);
            onChange?.(next);
          }}
          className={cn(inputBase, "pl-[5.25rem] tabular", error ? "border-danger" : "border-line")}
        />
      </div>
    </FieldShell>
  );
}
