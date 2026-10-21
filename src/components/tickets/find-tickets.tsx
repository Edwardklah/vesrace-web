"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, m, useAnimationControls } from "motion/react";
import { ArrowLeft, ChevronRight, CircleAlert, Mail, RefreshCw, ShieldCheck, Smartphone, Ticket } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { PhoneField } from "@/components/ui/phone-field";
import { Segmented } from "@/components/ui/segmented";
import { TextField } from "@/components/ui/text-field";
import { api, errorMessage, MOCK_CODE, type CodeChallenge, type OrderView } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatEventDate } from "@/lib/format";
import { spring } from "@/lib/motion";

type Stage = "enter" | "code" | "results";
type Channel = "phone" | "email";

const validPhone = (v: string) =>
  v.length === 0 ? "Enter the phone number you used." : /^0[235]\d{8}$/.test(v) ? undefined : "Enter a 10-digit Ghana number, like 024 123 4567.";
const validEmail = (v: string) =>
  !v.trim() ? "Enter the email you used." : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? undefined : "Check the email address. It looks incomplete.";

/**
 * Find my tickets for guests: phone number (or email) → one-time code →
 * their orders, split into upcoming and past. No account needed.
 */
export function FindTickets() {
  const [stage, setStage] = useState<Stage>("enter");
  const [channel, setChannel] = useState<Channel>("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<CodeChallenge | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  // Set from the code response and a ticking clock; 0 during prerendering.
  const [now, setNow] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  const shake = useAnimationControls();

  useEffect(() => {
    if (stage !== "code") return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [stage]);

  const fieldError = channel === "phone" ? validPhone(phone) : validEmail(email);

  const send = async () => {
    setTried(true);
    if (fieldError) return;
    setBusy(true);
    setError(null);
    try {
      const c = await api.tickets.sendCode({ channel, value: channel === "phone" ? phone : email });
      setChallenge(c);
      setNow(c.serverTime);
      setCode("");
      setCodeError(null);
      setLocked(false);
      setStage("code");
    } catch (e) {
      if (stage === "code") setCodeError(errorMessage(e));
      else setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value: string) => {
    if (!challenge || busy) return;
    setBusy(true);
    setCodeError(null);
    try {
      const res = await api.tickets.verifyCode({ challengeId: challenge.id, code: value });
      setOrders(res.orders);
      const at = Date.now();
      setNow(at);
      const anyUpcoming = res.orders.some((o) => Date.parse(o.endsAt) >= at);
      setTab(anyUpcoming || res.orders.length === 0 ? "upcoming" : "past");
      setStage("results");
    } catch (e) {
      setCodeError(errorMessage(e));
      const code = (e as { code?: string }).code;
      setLocked(code === "CODE_LOCKED" || code === "CODE_EXPIRED");
      setCode("");
      shake.start({ x: [0, -8, 8, -5, 5, 0], transition: { duration: 0.4 } });
      codeRef.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  const resendIn = challenge ? Math.max(0, Math.ceil((challenge.resendAvailableAt - now) / 1000)) : 0;

  /* ---------------- Results ---------------- */
  if (stage === "results") {
    const upcoming = orders.filter((o) => Date.parse(o.endsAt) >= now);
    const past = orders.filter((o) => Date.parse(o.endsAt) < now).reverse();
    const list = tab === "upcoming" ? upcoming : past;
    return (
      <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring.smooth}>
        <h1 className="text-display">Your tickets</h1>
        <p className="mt-2 flex items-center gap-1.5 text-small text-fg-muted">
          <ShieldCheck className="size-4 text-success" aria-hidden /> Verified as {challenge?.sentTo} for this visit
        </p>
        <Segmented
          label="Show"
          value={tab}
          onChange={setTab}
          options={[
            { value: "upcoming", label: `Upcoming ${upcoming.length}` },
            { value: "past", label: `Past ${past.length}` },
          ]}
          className="mt-6"
        />
        {list.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-line-strong px-6 py-12 text-center">
            <Ticket className="mx-auto size-8 text-fg-subtle" aria-hidden />
            <p className="mt-3 text-h3">{tab === "upcoming" ? "No upcoming tickets" : "No past tickets"}</p>
            <p className="mx-auto mt-1 max-w-sm text-small text-fg-muted">
              {orders.length === 0
                ? `We couldn't find any orders for ${challenge?.sentTo}. If someone else bought them for you, ask them to forward the SMS, or try the ${channel === "phone" ? "email" : "phone number"} you used.`
                : "Switch tabs to see your other tickets."}
            </p>
            <Link href="/" className="mt-5 inline-flex h-11 items-center gap-1 font-semibold text-primary-ink">
              Browse events <ChevronRight className="size-4" aria-hidden />
            </Link>
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-3">
            {list.map((o, i) => (
              <m.li key={o.ref} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.smooth, delay: i * 0.05 }}>
                <Link
                  href={`/orders/${o.ref}`}
                  className="group flex items-center gap-4 rounded-lg border border-line bg-surface p-3 pr-4 shadow-e1 transition-colors hover:border-line-strong"
                >
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-teal-800">
                    {o.imageUrl ? (
                      <Image src={o.imageUrl} alt="" fill sizes="64px" className="object-cover" />
                    ) : (
                      <LogoMark className="absolute -right-2 -bottom-1 h-11 text-teal-600/70" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{o.eventName}</p>
                    <p className="text-caption text-fg-muted">{formatEventDate(o.startsAt, o.timeZone)}</p>
                    <p className="truncate text-caption text-fg-muted">
                      {o.tickets.length} {o.tickets.length === 1 ? "ticket" : "tickets"} · {o.venueName} · {o.ref}
                    </p>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </m.li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => {
            setStage("enter");
            setChallenge(null);
          }}
          className="mt-8 text-small font-semibold text-primary-ink"
        >
          Look up a different number or email
        </button>
      </m.div>
    );
  }

  /* ---------------- Enter / code ---------------- */
  return (
    <AnimatePresence mode="wait" initial={false}>
      {stage === "enter" ? (
        <m.div key="enter" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={spring.smooth}>
          <h1 className="text-display">Find my tickets</h1>
          <p className="mt-3 text-body-lg text-fg-muted">
            Use the phone number or email you gave when you bought them. We&apos;ll send a code to check it&apos;s you.
          </p>
          <form
            noValidate
            className="mt-8 grid gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <Segmented
              label="Find by"
              value={channel}
              onChange={(c) => {
                setChannel(c);
                setTried(false);
                setError(null);
              }}
              fill
              options={[
                { value: "phone", label: "Phone number", icon: <Smartphone className="size-4" aria-hidden /> },
                { value: "email", label: "Email", icon: <Mail className="size-4" aria-hidden /> },
              ]}
            />
            {channel === "phone" ? (
              <PhoneField value={phone} onChange={setPhone} error={tried ? fieldError : undefined} hint="We'll text a 6-digit code to this number." />
            ) : (
              <TextField
                label="Email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={tried ? fieldError : undefined}
                hint="We'll email a 6-digit code."
              />
            )}
            {error && (
              <p role="alert" className="flex items-start gap-1.5 text-small text-danger">
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
              </p>
            )}
            <Button type="submit" size="lg" loading={busy}>
              Send code
            </Button>
          </form>
        </m.div>
      ) : (
        <m.div key="code" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={spring.smooth}>
          <button
            type="button"
            onClick={() => setStage("enter")}
            className="mb-6 inline-flex h-10 items-center gap-1.5 rounded-full pr-3 text-small font-semibold text-fg-muted hover:text-fg"
          >
            <ArrowLeft className="size-4" aria-hidden /> Change {channel === "phone" ? "number" : "email"}
          </button>
          <h1 className="text-display">Enter your code</h1>
          <p className="mt-3 text-body-lg text-fg-muted">
            We sent a 6-digit code to <span className="font-semibold whitespace-nowrap text-fg">{challenge?.sentTo}</span>. It lasts 10 minutes.
          </p>

          {/* One real input (so paste and SMS autofill work), drawn as six boxes. */}
          <m.label animate={shake} className="group relative mt-8 block">
            <span className="sr-only">6-digit code</span>
            <input
              ref={codeRef}
              autoFocus
              value={code}
              disabled={locked}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(v);
                setCodeError(null);
                if (v.length === 6) void verify(v);
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-invalid={!!codeError || undefined}
              aria-describedby="code-help"
              className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
            />
            <span className="grid grid-cols-6 gap-2" aria-hidden>
              {Array.from({ length: 6 }, (_, i) => {
                const filled = i < code.length;
                const caret = i === code.length;
                return (
                  <span
                    key={i}
                    className={cn(
                      "relative grid h-14 place-items-center rounded-md border bg-surface text-h2 tabular transition-colors sm:h-16",
                      codeError ? "border-danger" : caret ? "border-line-strong group-focus-within:border-primary group-focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_25%,transparent)]" : "border-line",
                      locked && "opacity-50",
                    )}
                  >
                    <AnimatePresence>
                      {filled && (
                        <m.span key={code[i]} initial={{ y: 8, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={spring.pop}>
                          {code[i]}
                        </m.span>
                      )}
                    </AnimatePresence>
                  </span>
                );
              })}
            </span>
          </m.label>
          <div id="code-help" className="mt-3 min-h-6">
            {codeError ? (
              <p role="alert" className="flex items-start gap-1.5 text-small text-danger">
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {codeError}
              </p>
            ) : busy ? (
              <p role="status" className="text-small text-fg-muted">
                Checking…
              </p>
            ) : null}
          </div>

          <p className="mt-2 rounded-sm bg-info-soft p-2.5 text-caption text-info-fg">
            {/* MOCK: nothing is really sent in the design preview. */}
            Design preview: no message is sent. Use code {MOCK_CODE}.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={send} disabled={resendIn > 0 || busy} icon={<RefreshCw className="size-4" />}>
              {resendIn > 0 ? `Send a new code in 0:${String(resendIn).padStart(2, "0")}` : "Send a new code"}
            </Button>
          </div>
          <p className="mt-6 text-small text-fg-muted">
            No code? Check the {channel === "phone" ? "number is right and the phone has signal" : "spam folder"}, or{" "}
            <button
              type="button"
              onClick={() => {
                setChannel(channel === "phone" ? "email" : "phone");
                setStage("enter");
                setTried(false);
              }}
              className="font-semibold text-primary-ink"
            >
              use your {channel === "phone" ? "email" : "phone number"} instead
            </button>
            .
          </p>
        </m.div>
      )}
    </AnimatePresence>
  );
}
