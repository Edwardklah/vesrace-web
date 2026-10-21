"use client";

import Link from "next/link";
import { m } from "motion/react";
import { ArrowRight, CircleAlert, CircleCheck, Info, type LucideIcon } from "lucide-react";
import type { AttentionItem } from "@/data/sample-dashboard";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";

const tone: Record<AttentionItem["tone"], { icon: LucideIcon; ring: string; label: string }> = {
  warning: { icon: CircleAlert, ring: "bg-warning-soft text-warning-fg", label: "Needs action" },
  info: { icon: Info, ring: "bg-info-soft text-info-fg", label: "To finish" },
  success: { icon: CircleCheck, ring: "bg-success-soft text-success-fg", label: "Done" },
};

/** "What do I need to do next?": the organiser's to-do list, most urgent first. */
export function AttentionList({ items }: { items: AttentionItem[] }) {
  const order = { warning: 0, info: 1, success: 2 };
  const sorted = [...items].sort((a, b) => order[a.tone] - order[b.tone]);
  const open = items.filter((i) => i.tone !== "success").length;

  return (
    <section aria-labelledby="todo-title" className="flex h-full flex-col rounded-lg border border-line bg-surface p-5 shadow-e1">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="todo-title" className="text-h3">
          Next up
        </h2>
        <span className="text-caption text-fg-muted">{open === 0 ? "All clear" : `${open} to do`}</span>
      </div>
      <ul className="mt-3 grid gap-1">
        {sorted.map((item, i) => {
          const t = tone[item.tone];
          return (
            <m.li
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring.smooth, delay: 0.15 + i * 0.05 }}
              className={cn("flex gap-3 rounded-md py-3", i > 0 && "border-t border-line")}
            >
              <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-full", t.ring)}>
                <t.icon className="size-4" aria-hidden />
                <span className="sr-only">{t.label}: </span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-small font-semibold">{item.title}</p>
                <p className="mt-0.5 text-caption leading-relaxed text-fg-muted">{item.body}</p>
                <Link
                  href={item.action.href}
                  className="group mt-1.5 inline-flex h-8 items-center gap-1 text-caption font-semibold text-primary-ink"
                >
                  {item.action.label}
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </div>
            </m.li>
          );
        })}
      </ul>
    </section>
  );
}
