import { cn } from "@/lib/cn";

export function Section({
  id,
  index,
  title,
  intro,
  children,
  className,
}: {
  id: string;
  index: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-24 border-t border-line py-14 md:py-20", className)}>
      <header className="mb-10 grid gap-3 md:grid-cols-[8rem_1fr]">
        <span className="font-display text-h3 font-[850] italic text-primary-ink tabular">{index}</span>
        <div className="max-w-2xl">
          <h2 className="text-h1">{title}</h2>
          {intro && <p className="mt-3 text-body-lg text-fg-muted text-pretty">{intro}</p>}
        </div>
      </header>
      <div className="md:pl-32">{children}</div>
    </section>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-overline text-fg-muted">{children}</p>;
}
