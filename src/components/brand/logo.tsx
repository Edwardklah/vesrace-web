import { cn } from "@/lib/cn";
import { LOCKUP, MARK, WORDMARK_CAPS } from "./logo-paths";

/**
 * Vesrace logos as inline SVG. They use `currentColor`, so set colour with a
 * text class (e.g. `text-fg`, `text-primary`). Always pass a height class.
 *
 *   <LogoLockup className="h-7" />   main header logo
 *   <LogoMark className="h-6" />     compact headers, favicon, avatars
 *   <LogoWordmarkCaps className="h-16" />  marketing and hero use only
 */
type LogoProps = { className?: string; title?: string };

function Svg({
  art,
  className,
  title = "Vesrace",
}: LogoProps & { art: { viewBox: string; d: string } }) {
  return (
    <svg
      viewBox={art.viewBox}
      fill="currentColor"
      role="img"
      aria-label={title}
      className={cn("w-auto shrink-0", className)}
    >
      <path fillRule="evenodd" d={art.d} />
    </svg>
  );
}

export const LogoMark = (p: LogoProps) => <Svg art={MARK} {...p} />;
export const LogoLockup = (p: LogoProps) => <Svg art={LOCKUP} {...p} />;
export const LogoWordmarkCaps = (p: LogoProps) => <Svg art={WORDMARK_CAPS} {...p} />;

/** The square app icon: white mark on ink. */
export function LogoAppIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-grid aspect-square place-items-center rounded-[22%] bg-ink-950 text-white",
        className,
      )}
    >
      <LogoMark className="h-[46%]" />
    </span>
  );
}
