"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, m } from "motion/react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  Search,
  Smartphone,
  Store,
  X,
} from "lucide-react";
import { OrderStatusBadge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";
import type { Order } from "@/data/sample-dashboard";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";
import type { OrderStatus } from "@/lib/types";
import { money, whenPlaced } from "./dash-format";

const PAGE = 8;
type SortKey = "placedAt" | "amountMinor";
type Filter = "all" | OrderStatus;

const methodIcon = (m: Order["method"]) => (m === "Card" ? CreditCard : m === "Box office" ? Store : Smartphone);

/** CSV of the orders currently shown (filters and search applied, all pages). */
function downloadCsv(rows: Order[]) {
  const head = ["Order", "Placed (Africa/Accra)", "Customer", "Phone", "Event", "Tickets", "Amount (GHS)", "Payment", "Status"];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = rows.map((o) =>
    [
      o.id,
      o.placedAt,
      o.customer,
      o.phone,
      o.eventName,
      o.lines.map((l) => `${l.qty} x ${l.name}`).join("; "),
      (o.amountMinor / 100).toFixed(2),
      o.method,
      o.status,
    ]
      .map(esc)
      .join(","),
  );
  const blob = new Blob([[head.map(esc).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "vesrace-orders.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Most recent orders. Search, filter by status, sort by date or amount,
 * page through, and export what's shown as CSV.
 *
 * MOCK: done in the browser over sample data. With the real API these
 * become query parameters (search, status, sort, page) so the server does
 * the work and large organisers aren't sent every order.
 */
export function OrdersTable({ orders }: { orders: Order[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "placedAt", dir: -1 });
  const [page, setPage] = useState(0);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: orders.length, Paid: 0, Pending: 0, Failed: 0, Refunded: 0 };
    for (const o of orders) c[o.status]++;
    return c;
  }, [orders]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    return orders
      .filter((o) => filter === "all" || o.status === filter)
      .filter(
        (o) =>
          !q ||
          o.customer.toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q) ||
          o.eventName.toLowerCase().includes(q) ||
          (digits.length >= 3 && o.phone.replace(/\D/g, "").includes(digits)),
      )
      .sort((a, b) => {
        const d = sort.key === "placedAt" ? a.placedAt.localeCompare(b.placedAt) : a.amountMinor - b.amountMinor;
        return d * sort.dir;
      });
  }, [orders, query, filter, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const current = Math.min(page, pages - 1);
  const shown = rows.slice(current * PAGE, current * PAGE + PAGE);

  const toggleSort = (key: SortKey) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: -1 }));
    setPage(0);
  };

  const sortButton = (k: SortKey, children: React.ReactNode) => {
    const on = sort.key === k;
    const Icon = !on ? ArrowUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
    return (
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className={cn("inline-flex items-center gap-1 rounded-sm hover:text-fg", on && "text-fg")}
      >
        {children}
        <Icon className={cn("size-3.5", !on && "opacity-50")} aria-hidden />
      </button>
    );
  };
  const ariaSort = (k: SortKey) => (sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : "none");

  const filterOptions: { value: Filter; label: string }[] = [
    { value: "all", label: `All ${counts.all}` },
    { value: "Paid", label: `Paid ${counts.Paid}` },
    { value: "Pending", label: `Pending ${counts.Pending}` },
    { value: "Failed", label: `Failed ${counts.Failed}` },
    { value: "Refunded", label: `Refunded ${counts.Refunded}` },
  ];

  return (
    <section aria-labelledby="orders-title" className="rounded-lg border border-line bg-surface shadow-e1">
      <div className="flex flex-col gap-4 p-5 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="orders-title" className="text-h3">
              Recent orders
            </h2>
            <p className="text-caption text-fg-muted">Last 7 days, all events</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => downloadCsv(rows)}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-strong px-3 text-small font-semibold hover:bg-surface-muted"
            >
              <Download className="size-4" aria-hidden /> Export CSV
            </button>
            <Link href="/dashboard/orders" className="inline-flex h-9 items-center gap-1 px-2 text-small font-semibold text-primary-ink">
              All orders <ChevronRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block lg:w-80">
            <span className="sr-only">Search orders</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Name, phone, order or event"
              className="h-10 w-full rounded-md border border-line bg-surface-muted/60 pr-9 pl-9 text-small outline-none placeholder:text-fg-subtle focus:border-primary focus:bg-surface [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded-full text-fg-muted hover:bg-surface-muted"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            )}
          </label>
          <div className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] lg:mx-0 lg:px-0">
            <Segmented
              label="Filter by status"
              value={filter}
              onChange={(f) => {
                setFilter(f);
                setPage(0);
              }}
              options={filterOptions}
              className="[&_button]:h-8 [&_button]:px-3"
            />
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="border-t border-line px-5 py-14 text-center">
          <p className="text-small font-semibold">No orders match</p>
          <p className="mt-1 text-caption text-fg-muted">Try another name or phone number, or clear the filter.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
            className="mt-4 h-9 rounded-md border border-line-strong px-3 text-small font-semibold hover:bg-surface-muted"
          >
            Clear search and filter
          </button>
        </div>
      ) : (
        <>
          {/* Table (tablet and up) */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[52rem] text-left text-small">
              <thead className="border-y border-line bg-surface-muted/50 text-caption text-fg-muted">
                <tr>
                  <th scope="col" className="py-2.5 pr-3 pl-5 font-medium">
                    Order
                  </th>
                  <th scope="col" className="px-3 font-medium" aria-sort={ariaSort("placedAt")}>
                    {sortButton("placedAt", "Placed")}
                  </th>
                  <th scope="col" className="px-3 font-medium">
                    Customer
                  </th>
                  <th scope="col" className="px-3 font-medium">
                    Event · tickets
                  </th>
                  <th scope="col" className="px-3 text-right font-medium" aria-sort={ariaSort("amountMinor")}>
                    {sortButton("amountMinor", "Amount")}
                  </th>
                  <th scope="col" className="px-3 font-medium">
                    Payment
                  </th>
                  <th scope="col" className="py-2.5 pr-5 pl-3 font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false} mode="popLayout">
                  {shown.map((o) => {
                    const Icon = methodIcon(o.method);
                    return (
                      <m.tr
                        key={o.id}
                        layout="position"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={spring.snappy}
                        className="border-b border-line last:border-b-0 hover:bg-surface-muted/50"
                      >
                        <td className="py-3 pr-3 pl-5 font-mono text-caption">{o.id}</td>
                        <td className="px-3 whitespace-nowrap text-fg-muted tabular">{whenPlaced(o.placedAt)}</td>
                        <td className="px-3">
                          <span className="block font-medium">{o.customer}</span>
                          <span className="block text-caption text-fg-muted tabular">{o.phone}</span>
                        </td>
                        <td className="max-w-[16rem] px-3">
                          <span className="block truncate">{o.eventName}</span>
                          <span className="block text-caption text-fg-muted">
                            {o.lines.map((l) => `${l.qty} × ${l.name}`).join(", ")}
                          </span>
                        </td>
                        <td
                          className={cn(
                            "px-3 text-right font-semibold whitespace-nowrap tabular",
                            o.status !== "Paid" && "font-normal text-fg-muted",
                            (o.status === "Failed" || o.status === "Refunded") && "line-through decoration-fg-subtle",
                          )}
                        >
                          {money(o.amountMinor)}
                        </td>
                        <td className="px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-fg-muted">
                            <Icon className="size-4" aria-hidden /> {o.method}
                          </span>
                        </td>
                        <td className="py-3 pr-5 pl-3">
                          <OrderStatusBadge status={o.status} />
                        </td>
                      </m.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Cards (phones) */}
          <ul className="border-t border-line md:hidden">
            {shown.map((o) => (
              <li key={o.id} className="border-b border-line px-5 py-4 last:border-b-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{o.customer}</p>
                    <p className="truncate text-caption text-fg-muted">
                      {o.eventName} · {o.lines.map((l) => `${l.qty} × ${l.name}`).join(", ")}
                    </p>
                  </div>
                  <p className={cn("shrink-0 font-semibold whitespace-nowrap tabular", o.status !== "Paid" && "font-normal text-fg-muted")}>{money(o.amountMinor)}</p>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-caption text-fg-muted">
                    {whenPlaced(o.placedAt)} · {o.method}
                  </span>
                  <OrderStatusBadge status={o.status} />
                </div>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-caption text-fg-muted">
            <span className="tabular" aria-live="polite">
              {current * PAGE + 1}–{Math.min(rows.length, current * PAGE + PAGE)} of {rows.length}
            </span>
            <div className="flex items-center gap-1">
              <span className="mr-2 tabular">
                Page {current + 1} of {pages}
              </span>
              <button
                type="button"
                onClick={() => setPage(current - 1)}
                disabled={current === 0}
                aria-label="Previous page"
                className="grid size-9 place-items-center rounded-md border border-line hover:bg-surface-muted disabled:opacity-40"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setPage(current + 1)}
                disabled={current >= pages - 1}
                aria-label="Next page"
                className="grid size-9 place-items-center rounded-md border border-line hover:bg-surface-muted disabled:opacity-40"
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
