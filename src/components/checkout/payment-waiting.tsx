"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import {
  Ban,
  Check,
  ChevronDown,
  CircleX,
  CreditCard,
  Hourglass,
  Loader2,
  RefreshCw,
  Smartphone,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, errorMessage, networkName, type Payment } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { spring } from "@/lib/motion";

const ghs = (amountMinor: number) => formatMoney({ amountMinor, currency: "GHS" });
const POLL_MS = 2000;

function mmss(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * What happens after "Pay": waiting for the customer to approve the MoMo
 * prompt (or finish on the card page), then success, failure, timeout or
 * cancellation. The page asks the server for the payment's status; it never
 * decides on its own that a payment worked.
 */
export function PaymentWaiting({
  initial,
  onPaid,
  onRetry,
  onPayAnotherWay,
  onHoldExpired,
}: {
  initial: Payment;
  onPaid: (orderRef: string) => void;
  /** Send a fresh prompt with the same details (a new payment attempt). */
  onRetry: () => void;
  onPayAnotherWay: () => void;
  onHoldExpired: () => void;
}) {
  const [p, setP] = useState(initial);
  const [offset] = useState(() => initial.serverTime - Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState<"resend" | "cancel" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const paidOnce = useRef(false);

  // Ask the server for the status every two seconds while it's pending.
  useEffect(() => {
    if (p.status !== "pending") return;
    const id = window.setInterval(() => {
      api.checkout
        .getPayment(p.id)
        .then(setP)
        .catch(() => {
          /* a dropped poll is fine: the next one tries again */
        });
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [p.id, p.status]);

  // Clock for the countdowns.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (p.status === "paid" && p.orderRef && !paidOnce.current) {
      paidOnce.current = true;
      const t = window.setTimeout(() => onPaid(p.orderRef!), 1100);
      return () => window.clearTimeout(t);
    }
    if (p.status === "expired") onHoldExpired();
  }, [p.status, p.orderRef, onPaid, onHoldExpired]);

  const serverNow = now + offset;
  const resendIn = p.resendAvailableAt - serverNow;
  const promptLeft = p.promptExpiresAt - serverNow;
  const promptTotal = p.promptExpiresAt - p.promptSentAt;
  const isCard = p.method === "card" || p.method === "free";
  const where = p.network ? `${networkName[p.network]} ${p.phoneMasked}` : "";

  const resend = async () => {
    setBusy("resend");
    setActionError(null);
    try {
      setP(await api.checkout.resendPrompt(p.id));
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };
  const cancel = async () => {
    setBusy("cancel");
    setActionError(null);
    try {
      setP(await api.checkout.cancelPayment(p.id));
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  /* ---------------- Outcome screens ---------------- */
  const outcome = (() => {
    if (p.status === "paid")
      return {
        tone: "success" as const,
        icon: Check,
        title: "Payment approved",
        body: "Issuing your tickets…",
      };
    if (p.status === "cancelled")
      return {
        tone: "neutral" as const,
        icon: Ban,
        title: "Payment cancelled",
        body: "No money was taken. Your tickets are still held, so you can try again.",
      };
    if (p.status === "failed" && p.reason === "declined")
      return {
        tone: "danger" as const,
        icon: CircleX,
        title: "Payment declined",
        body: "The payment was declined on your phone, so no money was taken. If that was a mistake, try again.",
      };
    if (p.status === "failed" && p.reason === "insufficient-funds")
      return {
        tone: "danger" as const,
        icon: Wallet,
        title: "Not enough money in this wallet",
        body: `Top up and try again, or pay from another number or by card. Nothing was taken from ${where}.`,
      };
    if (p.status === "failed")
      return {
        tone: "warning" as const,
        icon: Hourglass,
        title: "We didn't get an approval",
        body: "The prompt expired before it was approved, so no money was taken. Send a new one when you're ready.",
      };
    return null;
  })();

  if (outcome) {
    const ring = {
      success: "bg-success text-white",
      neutral: "bg-surface-muted text-fg",
      danger: "bg-danger-soft text-danger-fg",
      warning: "bg-warning-soft text-warning-fg",
    }[outcome.tone];
    return (
      <m.div
        key={p.status + (p.reason ?? "")}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring.smooth}
        className="grid justify-items-center px-2 py-6 text-center"
        role={outcome.tone === "success" ? "status" : "alert"}
      >
        <m.span
          initial={{ scale: 0.4, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={spring.pop}
          className={cn("grid size-16 place-items-center rounded-full", ring)}
        >
          <outcome.icon className="size-8" aria-hidden strokeWidth={2.25} />
        </m.span>
        <h2 className="mt-5 text-h2">{outcome.title}</h2>
        <p className="mt-2 max-w-sm text-body text-fg-muted">{outcome.body}</p>
        {p.status !== "paid" && (
          <div className="mt-7 grid w-full max-w-sm gap-2">
            <Button size="lg" onClick={onRetry} icon={<RefreshCw className="size-5" />}>
              {p.method === "momo" ? "Send a new prompt" : "Try again"}
            </Button>
            <Button size="lg" variant="secondary" onClick={onPayAnotherWay}>
              Pay another way
            </Button>
          </div>
        )}
        {p.status === "paid" && <Loader2 className="mt-6 size-6 animate-spin text-fg-muted" aria-hidden />}
      </m.div>
    );
  }

  /* ---------------- Waiting ---------------- */
  return (
    <div className="grid justify-items-center px-2 py-4 text-center">
      {/* A phone with a slow pulse: something is on its way to it. */}
      <div className="relative grid size-36 place-items-center" aria-hidden>
        {[0, 1, 2].map((i) => (
          <m.span
            key={i}
            className="absolute inset-0 rounded-full border-2 border-primary"
            initial={{ scale: 0.45, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 0 }}
            transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }}
          />
        ))}
        <span className="relative grid size-20 place-items-center rounded-[1.4rem] bg-primary text-primary-fg shadow-e2">
          {isCard ? <CreditCard className="size-9" /> : <Smartphone className="size-9" />}
        </span>
      </div>

      <h2 className="mt-4 text-h2" aria-live="polite">
        {p.method === "free"
          ? "Reserving your tickets…"
          : isCard
            ? `Finish paying ${ghs(p.amountMinor)} on the secure card page`
            : `Approve the ${ghs(p.amountMinor)} payment on your phone`}
      </h2>
      {!isCard && (
        <p className="mt-2 max-w-sm text-body text-fg-muted">
          We sent a prompt to <span className="font-semibold whitespace-nowrap text-fg">{where}</span>. Enter your MoMo PIN to approve it.
        </p>
      )}
      {isCard && p.method === "card" && (
        <p className="mt-2 max-w-sm text-body text-fg-muted">
          {/* MOCK: the real flow opens Paystack's page, then comes back here. */}
          Your card details go straight to the payment provider. Vesrace never sees them.
        </p>
      )}

      {/* Progress through the three stages */}
      <ol className="mt-6 grid w-full max-w-sm gap-3 text-left text-small">
        {[
          { label: isCard ? "Payment started" : "Prompt sent", state: "done" },
          { label: isCard ? "Waiting for your bank" : "Waiting for your approval", state: "active" },
          { label: "Issuing your tickets", state: "todo" },
        ].map((s) => (
          <li key={s.label} className="flex items-center gap-3">
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full",
                s.state === "done" && "bg-primary text-primary-fg",
                s.state === "active" && "bg-primary-soft text-primary-ink",
                s.state === "todo" && "border border-line-strong",
              )}
            >
              {s.state === "done" && <Check className="size-3.5" aria-hidden strokeWidth={3} />}
              {s.state === "active" && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
            </span>
            <span className={cn(s.state === "todo" ? "text-fg-muted" : "font-semibold")}>{s.label}</span>
          </li>
        ))}
      </ol>

      {!isCard && (
        <>
          <div className="mt-6 w-full max-w-sm">
            <div className="flex justify-between text-caption text-fg-muted">
              <span>Prompt expires in</span>
              <span className="font-semibold tabular text-fg">{mmss(promptLeft)}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500 ease-linear"
                style={{ width: `${Math.max(0, Math.min(100, (promptLeft / promptTotal) * 100))}%` }}
              />
            </div>
          </div>

          <div className="mt-6 w-full max-w-sm rounded-lg border border-line text-left">
            <button
              type="button"
              onClick={() => setHelpOpen((o) => !o)}
              aria-expanded={helpOpen}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-small font-semibold"
            >
              No prompt on your phone?
              <m.span animate={{ rotate: helpOpen ? 180 : 0 }} transition={spring.snappy}>
                <ChevronDown className="size-4" aria-hidden />
              </m.span>
            </button>
            <AnimatePresence initial={false}>
              {helpOpen && (
                <m.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={spring.smooth}
                  className="overflow-hidden"
                >
                  <ol className="grid list-decimal gap-1.5 px-4 pb-4 pl-8 text-small text-fg-muted">
                    <li>Check the phone with {p.phoneMasked} is on and has signal.</li>
                    <li>
                      Open your MoMo menu and look for pending approvals
                      {p.network === "mtn" ? " (dial *170#, then My Wallet, then My Approvals)" : ""}.
                    </li>
                    <li>Still nothing? Send a new prompt below.</li>
                  </ol>
                </m.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-5 grid w-full max-w-sm gap-2">
            <Button
              variant="secondary"
              onClick={resend}
              loading={busy === "resend"}
              disabled={resendIn > 0}
              icon={<RefreshCw className="size-4" />}
            >
              {resendIn > 0 ? `Resend prompt in ${mmss(resendIn)}` : "Resend prompt"}
            </Button>
            <div className="flex justify-center gap-1">
              <Button variant="ghost" size="sm" onClick={onPayAnotherWay}>
                Use a different number
              </Button>
              <Button variant="ghost" size="sm" onClick={cancel} loading={busy === "cancel"}>
                Cancel payment
              </Button>
            </div>
            {actionError && (
              <p role="alert" className="text-small text-danger">
                {actionError}
              </p>
            )}
          </div>
        </>
      )}
      <p className="mt-6 max-w-sm text-caption text-fg-subtle">
        Keep this page open. If it closes, your tickets still arrive by SMS once the payment goes through.
      </p>
    </div>
  );
}
