"use client";

import { useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Check, Share2 } from "lucide-react";
import { spring } from "@/lib/motion";

/**
 * Opens the phone's share sheet (WhatsApp, SMS…) where supported;
 * otherwise copies the link and says so.
 */
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the person closed the share sheet: nothing to do */
    }
  }

  return (
    <m.button
      type="button"
      onClick={share}
      whileTap={{ scale: 0.95 }}
      transition={spring.press}
      className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-small font-semibold text-fg hover:bg-surface-muted"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <m.span
          key={copied ? "done" : "share"}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={spring.pop}
          className="inline-flex"
        >
          {copied ? <Check className="size-4 text-success" aria-hidden /> : <Share2 className="size-4" aria-hidden />}
        </m.span>
      </AnimatePresence>
      <span aria-live="polite">{copied ? "Link copied" : "Share"}</span>
    </m.button>
  );
}
