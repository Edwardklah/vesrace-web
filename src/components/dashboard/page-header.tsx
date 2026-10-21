import { cn } from "@/lib/cn";

/**
 * Header every dashboard page starts with: the title (the only place the
 * dashboard uses the display face), key context underneath, and the main
 * actions on the right.
 */
export function PageHeader({
  title,
  context,
  actions,
  className,
}: {
  title: string;
  context?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-h1 italic">{title}</h1>
        {context && <div className="mt-1.5 text-small text-fg-muted">{context}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div>}
    </header>
  );
}
