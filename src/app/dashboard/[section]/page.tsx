import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { allSections } from "@/components/dashboard/nav";
import { PageHeader } from "@/components/dashboard/page-header";

/*
 * Placeholder for dashboard sections that are designed in later steps, so
 * every sidebar link goes somewhere real. Each one becomes its own route
 * folder when it's built.
 */
const find = (section: string) => allSections.find((s) => s.href === `/dashboard/${section}`);

export function generateStaticParams() {
  return allSections.map((s) => ({ section: s.href.replace("/dashboard/", "") }));
}

export async function generateMetadata({ params }: PageProps<"/dashboard/[section]">): Promise<Metadata> {
  const { section } = await params;
  return { title: find(section)?.label ?? "Not found" };
}

// The URL is read inside <Suspense> so navigation between sections is instant.
export default function SectionPage({ params }: PageProps<"/dashboard/[section]">) {
  return (
    <Suspense fallback={<div className="h-10 w-48 animate-pulse rounded-lg bg-surface-muted" />}>
      <SectionPlaceholder params={params} />
    </Suspense>
  );
}

async function SectionPlaceholder({ params }: { params: PageProps<"/dashboard/[section]">["params"] }) {
  const { section } = await params;
  const item = find(section);
  if (!item) notFound();
  const Icon = item.icon;
  return (
    <>
      <PageHeader title={item.label} />
      <div className="mt-8 grid place-items-center rounded-lg border border-dashed border-line-strong px-6 py-20 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-primary-soft text-primary-ink">
          <Icon className="size-6" aria-hidden />
        </span>
        <p className="mt-4 text-h3">{item.label} is designed in a later step</p>
        <p className="mt-1 max-w-sm text-small text-fg-muted">
          Phase 1 covers the dashboard overview. This page will follow the same layout and components.
        </p>
        <Link href="/dashboard" className="mt-6 inline-flex h-11 items-center gap-2 font-semibold text-primary-ink">
          <ArrowLeft className="size-4" aria-hidden /> Back to overview
        </Link>
      </div>
    </>
  );
}
