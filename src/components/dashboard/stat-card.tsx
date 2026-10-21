"use client";

import { useState } from "react";
import { Info, TrendingDown, TrendingUp } from "lucide-react";
import { RollingNumber } from "@/components/ui/rolling-number";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

/**
 * One headline figure. The caption always says what the figure covers
 * (time range, which events), because a bare number can't be trusted.
 * The trend only shows when there's a previous period to compare with.
 */
export function StatCard({
  label,
  value,
  numeric,
  caption,
  trend,
  trendLabel,
  info,
  children,
  className,
}: {
  label: string;
  value: string;
  /** Used to decide whether the rolling digits go up or down. */
  numeric: number;
  caption: React.ReactNode;
  trend?: number | null;
  trendLabel?: string;
  info?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const [last, setLast] = useState(numeric);
  const [direction, setDirection] = useState<1 | -1>(1);
  if (numeric !== last) {
    setDirection(numeric >= last ? 1 : -1);
    setLast(numeric);
  }

  return (
    <section className={cn("flex flex-col rounded-lg border border-line bg-surface p-5 shadow-e1", className)} aria-label={label}>
      <div className="flex items-center gap-1.5">
        <h2 className="text-small font-medium text-fg-muted">{label}</h2>
        {info && (
          <Tooltip content={info} side="top">
            <Info className="size-3.5 text-fg-subtle" aria-label={`About ${label.toLowerCase()}`} />
          </Tooltip>
        )}
      </div>
      <RollingNumber value={value} direction={direction} className="mt-2 text-[1.75rem] leading-tight font-semibold tracking-tight" />
      <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-3 text-caption text-fg-muted">
        {trend !== undefined && trend !== null && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-semibold",
              trend >= 0 ? "bg-success-soft text-success-fg" : "bg-danger-soft text-danger-fg",
            )}
          >
            {trend >= 0 ? <TrendingUp className="size-3.5" aria-hidden /> : <TrendingDown className="size-3.5" aria-hidden />}
            {trend >= 0 ? "+" : "−"}
            {Math.abs(trend)}%<span className="sr-only"> {trendLabel}</span>
          </span>
        )}
        <span>{caption}</span>
      </div>
      {children}
    </section>
  );
}
