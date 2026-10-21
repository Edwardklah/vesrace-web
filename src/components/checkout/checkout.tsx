"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  CreditCard,
  Lock,
  Pencil,
  ShieldCheck,
  Smartphone,
  TimerOff,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { HoldTimer } from "@/components/ui/hold-timer";
import { PhoneField } from "@/components/ui/phone-field";
import { Stepper } from "@/components/ui/stepper";
import { TextField } from "@/components/ui/text-field";
import {
  api,
  ApiError,
  errorMessage,
  networkFromPhone,
  networkName,
  type Network,
  type Payment,
  type Quote,
} from "@/lib/api";
import { holdSession } from "@/lib/api/hold-session";
import { cn } from "@/lib/cn";
import { formatEventDate, formatGhanaPhone, formatMoney } from "@/lib/format";
import { spring } from "@/lib/motion";
import type { EventDetail } from "@/lib/types";
import { useOnline } from "@/lib/use-online";
import { MobileSummary, SummaryLines } from "./order-summary";
import { PaymentWaiting } from "./payment-waiting";

const ghs = (amountMinor: number) =>
  formatMoney({ amountMinor, currency: "GHS" });

type Phase = "loading" | "ready" | "paying" | "no-hold" | "expired";
type Step = 1 | 2 | 3;

/* ---------------- Validation (plain messages, shown beside the field) ---------------- */

function validName(v: string) {
  return v.trim().length >= 2
    ? undefined
    : "Enter the name for the tickets. Staff may ask for it at the gate.";
}
function validPhone(v: string) {
  if (v.length === 0)
    return "Enter a phone number so we can text you the tickets.";
  if (v.length !== 10 || !/^0[235]\d{8}$/.test(v))
    return "Enter a 10-digit Ghana number, like 024 123 4567.";
  return undefined;
}
function validEmail(v: string) {
  if (!v.trim()) return undefined;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
    ? undefined
    : "Check the email address. It looks incomplete.";
}

const networks: { id: Network; dot: string }[] = [
  { id: "mtn", dot: "bg-[#ffcb05]" },
  { id: "telecel", dot: "bg-[#e60000]" },
  { id: "airteltigo", dot: "bg-[#0055a5]" },
];

/**
 * Checkout: one focused page with three steps (tickets, your details,
 * payment), the hold countdown always in view and the order summary one
 * tap away. No site navigation, so nothing pulls people out mid-purchase.
 */
export function Checkout({
  event,
  seated,
}: {
  event: EventDetail;
  seated: boolean;
}) {
  const router = useRouter();
  const online = useOnline();
  const [phase, setPhase] = useState<Phase>("loading");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [offset, setOffset] = useState(0);
  const [step, setStep] = useState<Step>(2);
  const [qtyBusy, setQtyBusy] = useState(false);
  const [qtyError, setQtyError] = useState<string | null>(null);

  // Details
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [triedDetails, setTriedDetails] = useState(false);

  // Payment
  const [method, setMethod] = useState<"momo" | "card">("momo");
  const [network, setNetwork] = useState<Network | null>(null);
  const [networkTouched, setNetworkTouched] = useState(false);
  const [otherNumber, setOtherNumber] = useState(false);
  const [momoPhone, setMomoPhone] = useState("");
  const [triedPay, setTriedPay] = useState(false);
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const attemptKey = useRef<string | null>(null);

  const backHref = seated
    ? `/events/${event.slug}/seats`
    : `/events/${event.slug}`;
  const free = quote?.totalMinor === 0;

  const applyQuote = useCallback((q: Quote) => {
    setQuote(q);
    setOffset(q.serverTime - Date.now());
  }, []);

  // Load the hold this tab made on the event page or seat map.
  useEffect(() => {
    const id = holdSession.get(event.id);
    // No hold in this tab: the quote request fails the same way as an expired one.
    (id ? api.checkout.quote(id) : Promise.reject(new ApiError("UNKNOWN")))
      .then((q) => {
        if (q.ticketCount === 0) {
          setPhase("no-hold");
          return;
        }
        applyQuote(q);
        setPhase("ready");
      })
      .catch((e) => {
        if (e instanceof ApiError && e.code === "HOLD_EXPIRED") {
          holdSession.clear(event.id);
          setPhase("expired");
        } else setPhase("no-hold");
      });
  }, [event.id, applyQuote]);

  const onExpire = useCallback(() => {
    holdSession.clear(event.id);
    setPhase("expired");
  }, [event.id]);

  /* ---- Step 1: change quantities (general admission) ---- */
  const changeQty = async (ticketTypeId: string, n: number) => {
    if (!quote) return;
    setQtyBusy(true);
    setQtyError(null);
    const quantities = Object.fromEntries(
      quote.lines.map((l) => [l.ticketTypeId, l.qty]),
    );
    quantities[ticketTypeId] = n;
    try {
      const h = await api.holds.setTickets({
        eventId: event.id,
        holdId: quote.holdId,
        quantities,
      });
      const q = await api.checkout.quote(h.id);
      if (q.ticketCount === 0) {
        await api.holds.release(h.id);
        holdSession.clear(event.id);
        router.push(backHref);
        return;
      }
      applyQuote(q);
    } catch (e) {
      if (e instanceof ApiError && e.code === "HOLD_EXPIRED") onExpire();
      else setQtyError(errorMessage(e));
    } finally {
      setQtyBusy(false);
    }
  };

  /* ---- Step 2: details ---- */
  const errors = {
    name: validName(name),
    phone: validPhone(phone),
    email: validEmail(email),
  };
  const show = (k: keyof typeof errors) =>
    touched[k] || triedDetails ? errors[k] : undefined;
  const detailsOk = !errors.name && !errors.phone && !errors.email;

  const continueToPayment = () => {
    setTriedDetails(true);
    if (!detailsOk) {
      const first = (["name", "phone", "email"] as const).find(
        (k) => errors[k],
      );
      document
        .getElementById(`field-${first}`)
        ?.querySelector("input")
        ?.focus();
      return;
    }
    if (!networkTouched) setNetwork(networkFromPhone(phone));
    setStep(3);
  };

  /* ---- Step 3: pay ---- */
  const payPhone = otherNumber ? momoPhone : phone;
  const payErrors = {
    network:
      method === "momo" && !free && !network
        ? "Choose your mobile money network."
        : undefined,
    momoPhone:
      method === "momo" && !free && otherNumber
        ? validPhone(momoPhone)
        : undefined,
  };
  const payOk = !payErrors.network && !payErrors.momoPhone;

  const pay = async (retry = false) => {
    if (!quote || payBusy) return;
    setTriedPay(true);
    if (!payOk) return;
    if (!online) {
      setPayError(errorMessage(new ApiError("OFFLINE")));
      return;
    }
    setPayBusy(true);
    setPayError(null);
    // One key per attempt: double taps reuse it, so the server makes one payment.
    if (!attemptKey.current || retry) attemptKey.current = crypto.randomUUID();
    try {
      const p = await api.checkout.startPayment({
        holdId: quote.holdId,
        method: free ? "free" : method,
        network: method === "momo" && !free ? network! : undefined,
        phone: method === "momo" && !free ? payPhone : undefined,
        customer: {
          name: name.trim(),
          phone,
          email: email.trim() || undefined,
        },
        idempotencyKey: attemptKey.current,
      });
      setPayment(p);
      setPhase("paying");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      if (e instanceof ApiError && e.code === "HOLD_EXPIRED") onExpire();
      else setPayError(errorMessage(e));
    } finally {
      setPayBusy(false);
    }
  };

  const payAnotherWay = () => {
    if (payment?.status === "pending")
      void api.checkout.cancelPayment(payment.id).catch(() => {});
    attemptKey.current = null;
    setPayment(null);
    setPhase("ready");
    setStep(3);
  };

  const onPaid = useCallback(
    (ref: string) => {
      holdSession.clear(event.id);
      router.push(`/orders/${ref}?new=1`);
    },
    [event.id, router],
  );

  /* ---------------- Screens ---------------- */

  const header = (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-3 md:px-6">
        <Link
          href={backHref}
          aria-label={seated ? "Back to seats" : `Back to ${event.name}`}
          className="grid size-11 place-items-center rounded-full text-fg hover:bg-surface-muted"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <LogoMark className="h-5 text-fg" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-small font-semibold">
            <Lock className="size-3.5 text-success" aria-hidden /> Checkout
          </p>
          <p className="truncate text-caption text-fg-muted">{event.name}</p>
        </div>
        {quote && (phase === "ready" || phase === "paying") && (
          <HoldTimer
            expiresAt={quote.expiresAt - offset}
            onExpire={onExpire}
            compact
            label={seated ? "Seats held" : "Tickets held"}
            className="shrink-0 sm:hidden"
          />
        )}
        {quote && (phase === "ready" || phase === "paying") && (
          <HoldTimer
            expiresAt={quote.expiresAt - offset}
            onExpire={() => {}}
            label={seated ? "Seats held for you" : "Tickets held for you"}
            className="hidden shrink-0 sm:flex"
          />
        )}
      </div>
    </header>
  );

  if (phase === "loading")
    return (
      <>
        {header}
        <div
          className="mx-auto grid max-w-5xl gap-4 px-4 py-8 md:px-6"
          aria-busy="true"
          aria-label="Loading checkout"
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg bg-surface-muted"
            />
          ))}
        </div>
      </>
    );

  if (phase === "no-hold" || phase === "expired") {
    const expired = phase === "expired";
    return (
      <>
        {header}
        <m.main
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.smooth}
          className="mx-auto grid max-w-md justify-items-center px-6 py-16 text-center"
          role={expired ? "alert" : undefined}
        >
          <span
            className={cn(
              "grid size-16 place-items-center rounded-full",
              expired ? "bg-warning-soft text-warning-fg" : "bg-surface-muted",
            )}
          >
            {expired ? (
              <TimerOff className="size-8" aria-hidden />
            ) : (
              <Smartphone className="size-8" aria-hidden />
            )}
          </span>
          <h1 className="mt-5 text-h2">
            {expired ? "Your 10 minutes ran out" : "Nothing to check out yet"}
          </h1>
          <p className="mt-2 text-body text-fg-muted">
            {expired
              ? `We released your ${seated ? "seats" : "tickets"} so others can buy them. You weren't charged.`
              : `Choose your ${seated ? "seats" : "tickets"} first. They're held for 10 minutes while you pay.`}
          </p>
          <Link
            href={backHref}
            className="mt-7 inline-flex h-13 w-full items-center justify-center gap-2 rounded-md bg-primary px-6 text-body-lg font-semibold text-primary-fg shadow-e1 hover:bg-primary-hover"
          >
            {seated ? "Choose seats again" : "Choose tickets again"}
          </Link>
          <Link
            href={`/events/${event.slug}`}
            className="mt-3 inline-flex h-11 items-center text-small font-semibold text-primary-ink"
          >
            Back to the event
          </Link>
        </m.main>
      </>
    );
  }

  if (!quote) return null;

  const stepShell = (
    n: Step,
    title: string,
    summary: React.ReactNode,
    body: React.ReactNode,
    editable = true,
  ) => {
    const active = step === n;
    const done = step > n;
    return (
      <section
        aria-labelledby={`step-${n}`}
        className={cn(
          "rounded-lg border bg-surface transition-colors",
          active ? "border-line-strong shadow-e2" : "border-line",
        )}
      >
        <div className="flex items-center gap-3 p-4 md:p-5">
          <span
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-full text-small font-bold",
              done
                ? "bg-primary text-primary-fg"
                : active
                  ? "bg-fg text-bg"
                  : "bg-surface-muted text-fg-muted",
            )}
          >
            {done ? (
              <Check className="size-4" aria-hidden strokeWidth={3} />
            ) : (
              n
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={`step-${n}`} className="text-h3">
              {title}
            </h2>
            {done && (
              <div className="truncate text-small text-fg-muted">{summary}</div>
            )}
          </div>
          {done && editable && (
            <button
              type="button"
              onClick={() => setStep(n)}
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-small font-semibold text-primary-ink hover:bg-surface-muted"
            >
              <Pencil className="size-3.5" aria-hidden /> Edit
              <span className="sr-only"> {title.toLowerCase()}</span>
            </button>
          )}
        </div>
        <AnimatePresence initial={false}>
          {active && (
            <m.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={spring.smooth}
              className="overflow-hidden"
            >
              <div className="border-t border-line p-4 md:p-5">{body}</div>
            </m.div>
          )}
        </AnimatePresence>
      </section>
    );
  };

  /* Step 1: tickets */
  const ticketsBody = (
    <div className="grid gap-4">
      {quote.lines.map((l) => {
        const tt = event.ticketTypes.find((t) => t.id === l.ticketTypeId)!;
        const others = quote.ticketCount - l.qty;
        const max = Math.min(
          tt.maxPerOrder,
          tt.remaining ?? tt.maxPerOrder,
          event.maxTicketsPerOrder - others,
        );
        return (
          <div
            key={l.ticketTypeId}
            className="flex items-start justify-between gap-4"
          >
            <div className="min-w-0">
              <p className="font-semibold">{l.name}</p>
              <p className="text-small text-fg-muted">
                {l.unitMinor === 0 ? "Free" : `${ghs(l.unitMinor)} each`}
              </p>
              {l.seats.length > 0 && (
                <ul className="mt-1 grid gap-0.5 text-caption text-fg-muted">
                  {l.seats.map((s) => (
                    <li key={s.id}>{s.label}</li>
                  ))}
                </ul>
              )}
            </div>
            {seated ? (
              <span className="text-small font-semibold tabular">
                × {l.qty}
              </span>
            ) : (
              <Stepper
                value={l.qty}
                min={0}
                max={max}
                onChange={(v) => changeQty(l.ticketTypeId, v)}
                label={`${l.name} tickets`}
              />
            )}
          </div>
        );
      })}
      {qtyBusy && (
        <p className="text-caption text-fg-muted" role="status">
          Updating your hold…
        </p>
      )}
      {qtyError && (
        <p
          role="alert"
          className="flex items-center gap-1.5 text-small text-danger"
        >
          <CircleAlert className="size-4" aria-hidden /> {qtyError}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={backHref}
          className="text-small font-semibold text-primary-ink"
        >
          {seated ? "Change seats" : "Add another ticket type"}
        </Link>
        <Button onClick={() => setStep(2)}>Continue</Button>
      </div>
    </div>
  );

  /* Step 2: details */
  const errorList = (["name", "phone", "email"] as const).filter(
    (k) => errors[k],
  );
  const detailsBody = (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        continueToPayment();
      }}
      className="grid gap-5"
    >
      {triedDetails && errorList.length > 1 && (
        <div
          role="alert"
          className="rounded-md border border-danger/30 bg-danger-soft p-3 text-small text-danger-fg"
        >
          <p className="font-semibold">
            Check {errorList.length} things before you continue:
          </p>
          <ul className="mt-1 list-disc pl-5">
            {errorList.map((k) => (
              <li key={k}>
                {
                  { name: "Your name", phone: "Phone number", email: "Email" }[
                    k
                  ]
                }
              </li>
            ))}
          </ul>
        </div>
      )}
      <div id="field-name">
        <TextField
          label="Full name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          error={show("name")}
          hint="As it should appear on the tickets."
        />
      </div>
      <div
        id="field-phone"
        onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
      >
        <PhoneField value={phone} onChange={setPhone} error={show("phone")} />
      </div>
      <div id="field-email">
        <TextField
          label="Email"
          optional
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          error={show("email")}
          hint="We'll send a copy of your tickets here too."
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit">
          {free ? "Continue" : "Continue to payment"}
        </Button>
      </div>
    </form>
  );

  /* Step 3: payment */
  const methodCard = (
    id: "momo" | "card",
    icon: React.ReactNode,
    title: string,
    note: string,
  ) => (
    <button
      type="button"
      role="radio"
      aria-checked={method === id}
      onClick={() => setMethod(id)}
      className={cn(
        "relative flex flex-1 items-center gap-3 rounded-md border p-3.5 text-left transition-colors",
        method === id
          ? "border-primary bg-primary-soft/40 dark:bg-primary-soft/25"
          : "border-line hover:border-line-strong",
      )}
    >
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-full",
          method === id ? "bg-primary text-primary-fg" : "bg-surface-muted",
        )}
      >
        {icon}
      </span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-caption text-fg-muted">{note}</span>
      </span>
      {method === id && (
        <m.span
          layoutId="method-check"
          transition={spring.snappy}
          className="absolute top-2.5 right-2.5 text-primary-ink"
        >
          <Check className="size-4" aria-hidden strokeWidth={3} />
        </m.span>
      )}
    </button>
  );

  const detected = networkFromPhone(payPhone);
  const paymentBody = free ? (
    <div className="grid gap-4">
      <p className="text-body">
        These tickets are free, so there&apos;s nothing to pay.
      </p>
      <Button
        size="lg"
        onClick={() => pay()}
        loading={payBusy}
        className="w-full"
      >
        Get my tickets
      </Button>
      {payError && (
        <p role="alert" className="text-small text-danger">
          {payError}
        </p>
      )}
    </div>
  ) : (
    <div className="grid gap-5">
      <div
        role="radiogroup"
        aria-label="Payment method"
        className="flex flex-col gap-2 sm:flex-row"
      >
        {methodCard(
          "momo",
          <Smartphone className="size-5" aria-hidden />,
          "Mobile money",
          "MTN, Telecel, AirtelTigo",
        )}
        {methodCard(
          "card",
          <CreditCard className="size-5" aria-hidden />,
          "Card",
          "Visa or Mastercard",
        )}
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
        {method === "momo" ? (
          <m.div
            key="momo"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={spring.snappy}
            className="grid gap-5"
          >
            <fieldset>
              <legend className="text-small font-semibold">Network</legend>
              <div
                className="mt-2 grid grid-cols-3 gap-2"
                role="radiogroup"
                aria-label="Network"
              >
                {networks.map((n) => {
                  const on = network === n.id;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => {
                        setNetwork(n.id);
                        setNetworkTouched(true);
                      }}
                      className={cn(
                        "flex min-h-14 flex-col items-start justify-center gap-1 rounded-md border px-3 py-2 text-left text-small font-semibold transition-colors",
                        on
                          ? "border-primary bg-primary-soft/40 dark:bg-primary-soft/25"
                          : "border-line hover:border-line-strong",
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        <span
                          className={cn("size-2.5 rounded-full", n.dot)}
                          aria-hidden
                        />
                        {on && (
                          <Check
                            className="size-3.5 text-primary-ink"
                            aria-hidden
                            strokeWidth={3}
                          />
                        )}
                      </span>
                      <span className="leading-tight">{networkName[n.id]}</span>
                    </button>
                  );
                })}
              </div>
              {triedPay && payErrors.network ? (
                <p
                  role="alert"
                  className="mt-1.5 flex items-center gap-1.5 text-small text-danger"
                >
                  <CircleAlert className="size-4" aria-hidden />{" "}
                  {payErrors.network}
                </p>
              ) : (
                network &&
                detected === network &&
                !networkTouched && (
                  <p className="mt-1.5 text-caption text-fg-muted">
                    Picked from your number. Change it if you moved your number
                    to another network.
                  </p>
                )
              )}
            </fieldset>

            <div className="grid gap-2">
              <p className="text-small font-semibold">MoMo number</p>
              <div
                className="grid gap-2"
                role="radiogroup"
                aria-label="MoMo number"
              >
                {[
                  {
                    other: false,
                    label: `Pay from ${formatGhanaPhone(phone)}`,
                    note: "The number you gave above",
                  },
                  {
                    other: true,
                    label: "Use a different number",
                    note: "For example, a family member's wallet",
                  },
                ].map((o) => (
                  <button
                    key={String(o.other)}
                    type="button"
                    role="radio"
                    aria-checked={otherNumber === o.other}
                    onClick={() => setOtherNumber(o.other)}
                    className={cn(
                      "flex items-center gap-3 rounded-md border px-3.5 py-3 text-left transition-colors",
                      otherNumber === o.other
                        ? "border-primary"
                        : "border-line hover:border-line-strong",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-5 place-items-center rounded-full border-2",
                        otherNumber === o.other
                          ? "border-primary"
                          : "border-line-strong",
                      )}
                    >
                      {otherNumber === o.other && (
                        <m.span
                          layoutId="num-dot"
                          className="size-2.5 rounded-full bg-primary"
                        />
                      )}
                    </span>
                    <span>
                      <span className="block text-small font-semibold tabular">
                        {o.label}
                      </span>
                      <span className="block text-caption text-fg-muted">
                        {o.note}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              <AnimatePresence initial={false}>
                {otherNumber && (
                  <m.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={spring.smooth}
                    className="overflow-hidden"
                  >
                    <div className="pt-2">
                      <PhoneField
                        label="MoMo number to charge"
                        hint="The prompt goes to this phone."
                        value={momoPhone}
                        onChange={(v) => {
                          setMomoPhone(v);
                          if (!networkTouched) setNetwork(networkFromPhone(v));
                        }}
                        error={triedPay ? payErrors.momoPhone : undefined}
                      />
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          </m.div>
        ) : (
          <m.p
            key="card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={spring.snappy}
            className="flex gap-3 rounded-md bg-surface-muted p-3.5 text-small text-fg-muted"
          >
            <ShieldCheck className="size-5 shrink-0 text-success" aria-hidden />
            You&apos;ll enter your card on our payment provider&apos;s secure
            page, then come straight back here. Vesrace never sees your card
            number.
          </m.p>
        )}
      </AnimatePresence>

      <div className="grid gap-2">
        <Button
          size="lg"
          onClick={() => pay()}
          loading={payBusy}
          disabled={!online}
          icon={<Lock className="size-5" />}
          className="w-full"
        >
          Pay {ghs(quote.totalMinor)}
        </Button>
        {payError && (
          <p
            role="alert"
            className="flex items-center gap-1.5 text-small text-danger"
          >
            <CircleAlert className="size-4" aria-hidden /> {payError}
          </p>
        )}
        {!online && (
          <p className="text-small text-warning">
            You&apos;re offline. Reconnect to pay.
          </p>
        )}
        <p className="text-center text-caption text-fg-muted">
          {method === "momo"
            ? "You'll get a prompt on your phone. Approve it with your MoMo PIN."
            : "Your bank may ask you to confirm the payment."}
        </p>
      </div>
    </div>
  );

  const eventCard = (
    <div className="flex min-w-0 items-center gap-3">
      <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-teal-800">
        {event.imageUrl ? (
          <Image
            src={event.imageUrl}
            alt=""
            fill
            sizes="56px"
            className="object-cover"
          />
        ) : (
          <LogoMark className="absolute -right-2 -bottom-1 h-10 text-teal-600/70" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold">{event.name}</p>
        <p className="text-caption text-fg-muted">
          {formatEventDate(event.startsAt, event.timeZone)}
        </p>
        <p className="truncate text-caption text-fg-muted">
          {event.venueName}, {event.city}
        </p>
      </div>
    </div>
  );

  return (
    <>
      {header}
      <MobileSummary quote={quote} />
      <main className="mx-auto grid max-w-5xl gap-6 px-4 pt-6 pb-16 md:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10 lg:pt-10">
        <div className="min-w-0">
          <AnimatePresence mode="wait" initial={false}>
            {phase === "paying" && payment ? (
              <m.div
                key="waiting"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={spring.smooth}
                className="rounded-lg border border-line bg-surface p-4 shadow-e2 md:p-8"
              >
                <PaymentWaiting
                  key={payment.id}
                  initial={payment}
                  onPaid={onPaid}
                  onRetry={() => pay(true)}
                  onPayAnotherWay={payAnotherWay}
                  onHoldExpired={onExpire}
                />
              </m.div>
            ) : (
              <m.div
                key="steps"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid gap-3"
              >
                <div className="mb-2 lg:hidden">{eventCard}</div>
                {stepShell(
                  1,
                  seated ? "Seats" : "Tickets",
                  quote.lines.map((l) => `${l.qty} × ${l.name}`).join(", "),
                  ticketsBody,
                )}
                {stepShell(
                  2,
                  "Your details",
                  `${name.trim()} · ${formatGhanaPhone(phone)}`,
                  detailsBody,
                )}
                {stepShell(
                  3,
                  free ? "Confirm" : "Payment",
                  "",
                  paymentBody,
                  false,
                )}
              </m.div>
            )}
          </AnimatePresence>
        </div>

        <aside aria-label="Order summary" className="hidden lg:block">
          <div className="sticky top-24 grid grid-cols-[minmax(0,1fr)] gap-5 rounded-lg border border-line bg-surface-raised p-5 shadow-e2">
            {eventCard}
            <div className="border-t border-line" />
            <SummaryLines quote={quote} />
            <p className="flex items-start gap-2 text-caption text-fg-muted">
              <ShieldCheck
                className="mt-0.5 size-4 shrink-0 text-success"
                aria-hidden
              />
              The booking fee is per ticket and goes to Vesrace. Prices are
              confirmed by our server before you pay.
            </p>
          </div>
        </aside>
      </main>
    </>
  );
}
