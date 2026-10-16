"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform, type Variants } from "framer-motion";
import { ArrowUpRight, Check, CircleCheck, Copy, Landmark, Lock } from "lucide-react";
import { BANK_ACCOUNT, POSITIONS, type PositionId } from "@/lib/fees";
import { formatNaira } from "@/lib/tickets";
import { ReceiptCheck, type ReceiptVerdict } from "./ReceiptCheck";

function CopyButton({ value, label, tone = "light" }: { value: string; label: string; tone?: "light" | "dark" }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 2000); } catch { /* clipboard blocked: the value stays selectable */ }
      }}
      className={`-my-2 inline-flex min-h-[44px] shrink-0 items-center gap-1.5 px-2 text-xs font-semibold uppercase tracking-[0.14em] ${tone === "dark" ? "text-[#9DB2FF] hover:text-white" : "text-royal hover:text-navy"}`}
      aria-label={`Copy ${label}`}
    >
      {done ? <><Check size={14} aria-hidden="true" /> Copied</> : <><Copy size={14} aria-hidden="true" /> Copy</>}
    </button>
  );
}

const EASE = [0.16, 1, 0.3, 1] as const;
const list: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.15 } } };
const row: Variants = { hidden: { opacity: 0, x: -24 }, show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE } } };

/** Counts up to the selected amount (in naira). */
function AnimatedAmount({ naira }: { naira: number }) {
  const reduce = useReducedMotion();
  const v = useMotionValue(0);
  const text = useTransform(v, (x) => `₦${Math.round(x).toLocaleString("en-NG")}`);
  useEffect(() => {
    if (reduce) { v.set(naira); return; }
    const c = animate(v, naira, { duration: 0.9, ease: EASE });
    return () => c.stop();
  }, [naira, reduce, v]);
  return <motion.span>{text}</motion.span>;
}

/**
 * Registration page flow: fee by position and the official account are shown first.
 * The link to the official registration form is unlocked only after the visitor has chosen
 * a position and uploaded receipt(s) that, read on their device, add up to the fee paid into
 * the official account. This catches honest mistakes; the team still verifies every payment.
 */
export function RegisterFlow({ formUrl }: { formUrl: string }) {
  const [positionId, setPositionId] = useState<PositionId | null>(null);
  const [verdict, setVerdict] = useState<ReceiptVerdict>({ ok: false, totalNaira: 0 });
  const onVerdict = useCallback((v: ReceiptVerdict) => setVerdict((old) => (old.ok === v.ok && old.totalNaira === v.totalNaira ? old : v)), []);
  const position = POSITIONS.find((p) => p.id === positionId) ?? null;
  const amount = position ? formatNaira(position.feeKobo) ?? "" : null;
  const ready = Boolean(position && verdict.ok);
  const payRef = useRef<HTMLDivElement>(null);
  const firstPick = useRef(true);

  const choose = (id: PositionId) => {
    setPositionId(id);
    // On phones the payment card sits below the list: bring it into view after the first choice.
    if (firstPick.current && window.matchMedia("(max-width: 1023px)").matches) {
      firstPick.current = false;
      setTimeout(() => payRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 250);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
      {/* Step 1: fees */}
      <motion.div className="min-w-0 lg:col-span-7" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }}>
        <div className="flex min-w-0 items-baseline gap-3 sm:gap-4">
          <span className="shrink-0 font-display text-3xl italic text-red sm:text-4xl">01</span>
          <div>
            <h2 className="display-md text-navy">Choose your position</h2>
            <p className="mt-1 text-sm text-ink/70">Your registration fee depends on your membership position.</p>
          </div>
        </div>

        <fieldset className="mt-8 bg-white p-4 shadow-[0_1px_0_rgba(11,30,63,.06)] md:p-6">
          <legend className="sr-only">Membership position</legend>
          <div className="grid grid-cols-[1fr_auto] border-b-2 border-navy px-3 pb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate">
            <span>Membership position</span><span>Fee</span>
          </div>
          <motion.ol variants={list} initial="hidden" animate="show">
            {POSITIONS.map((p, i) => {
              const on = p.id === positionId;
              return (
                <motion.li key={p.id} variants={row} className="relative">
                  {on && <motion.span layoutId="position-highlight" className="absolute inset-0 bg-navy" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
                  <label className={`relative grid cursor-pointer grid-cols-[1fr_auto] items-center gap-4 border-b px-3 py-3.5 transition-colors duration-300 ${on ? "border-navy text-white" : "border-sand text-navy hover:bg-cream"}`}>
                    <span className="flex items-center gap-4">
                      <input type="radio" name="position" value={p.id} checked={on} onChange={() => choose(p.id)} className="sr-only" />
                      <span aria-hidden="true" className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-white" : "border-navy/40"}`}>
                        {on && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="h-2 w-2 rounded-full bg-white" />}
                      </span>
                      <span className={`w-6 font-display text-sm italic ${on ? "text-[#9DB2FF]" : "text-red"}`}>{String(i + 1).padStart(2, "0")}</span>
                      <span className="font-display text-lg md:text-xl">{p.name}</span>
                    </span>
                    <span className="font-display text-lg tabular-nums md:text-xl">{formatNaira(p.feeKobo)}</span>
                  </label>
                </motion.li>
              );
            })}
          </motion.ol>
        </fieldset>
      </motion.div>

      {/* Steps 2 and 3: pay, then submit */}
      <motion.div ref={payRef} className="min-w-0 scroll-mt-24 lg:col-span-5" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15, ease: EASE }}>
        <div className="space-y-6 lg:sticky lg:top-28">
          <div className="flex min-w-0 items-baseline gap-3 sm:gap-4">
            <span className="shrink-0 font-display text-3xl italic text-red sm:text-4xl">02</span>
            <div>
              <h2 className="display-md text-navy">Pay by bank transfer</h2>
              <p className="mt-1 text-sm text-ink/70">Use your <b>full name</b> as the narration and keep your receipt.</p>
            </div>
          </div>

          <div className="border-2 border-navy bg-white">
            <div className="flex items-center gap-3 bg-navy px-5 py-4 text-white">
              <Landmark size={20} aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-[0.2em]">Official payment account</p>
            </div>

            <div className={`flex flex-wrap items-center justify-between gap-3 px-5 py-5 transition-colors duration-500 ${position ? "bg-red text-white" : "bg-cream text-navy"}`} aria-live="polite">
              <div>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${position ? "text-white/80" : "text-slate"}`}>Amount to pay</p>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p key={position?.id ?? "none"} className="mt-1 text-sm" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                    {position ? position.name : "Choose your position to see your amount"}
                  </motion.p>
                </AnimatePresence>
              </div>
              <p className="font-display text-4xl tabular-nums">{position ? <AnimatedAmount naira={position.feeKobo / 100} /> : "₦ —"}</p>
            </div>

            <dl className="divide-y divide-sand">
              {([["Bank", BANK_ACCOUNT.bank, false], ["Account number", BANK_ACCOUNT.accountNumber, true], ["Account name", BANK_ACCOUNT.accountName, true]] as const).map(([k, v, copy]) => (
                <div key={k} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <dt className="text-sm text-slate">{k}</dt>
                  <dd className="flex items-center gap-4">
                    <span className={`select-all font-semibold text-navy ${k === "Account number" ? "font-display text-2xl tabular-nums tracking-wide sm:text-3xl" : ""}`}>{v}</span>
                    {copy && <CopyButton value={v} label={k} />}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="text-xs text-slate">Pay only into this official account. Never send money to an account shared any other way.</p>

          <div className="bg-navy p-6 text-white md:p-8">
            <div className="flex min-w-0 items-baseline gap-3 sm:gap-4">
              <span className="shrink-0 font-display text-3xl italic text-red sm:text-4xl">03</span>
              <h2 className="font-display text-3xl">Check your receipt</h2>
            </div>
            <p className="mt-3 text-sm text-mist">Upload your transfer receipt. We check that it shows <b className="text-white">{amount ?? "your fee"}</b> paid into the official account before the registration form opens. Your receipt is read on your device and is not uploaded to us.</p>

            <div className="mt-6">
              {position ? (
                <ReceiptCheck feeNaira={position.feeKobo / 100} onVerdict={onVerdict} />
              ) : (
                <p className="border border-dashed border-white/25 px-4 py-6 text-center text-sm text-mist">Choose your position first.</p>
              )}
            </div>

            <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-mist">Then</p>
            <p className="mt-1 text-sm text-mist">Fill in the official registration form and attach the same receipt(s). Your place is confirmed once the team verifies your payment.</p>

            <AnimatePresence mode="wait" initial={false}>
              {ready ? (
                <motion.a
                  key="open"
                  href={formUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-red glow-pulse mt-6 w-full whitespace-normal text-center"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 380, damping: 22 }}
                >
                  Click here to submit your registration <ArrowUpRight size={16} aria-hidden="true" />
                </motion.a>
              ) : (
                <motion.button
                  key="locked"
                  type="button"
                  disabled
                  className="btn mt-6 w-full cursor-not-allowed whitespace-normal border border-white/20 bg-white/5 text-center text-white/60"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Lock size={16} aria-hidden="true" /> Click here to submit your registration
                </motion.button>
              )}
            </AnimatePresence>
            <p className="mt-3 flex items-center gap-2 text-xs text-mist">
              {ready ? <><CircleCheck size={14} className="text-[#9DB2FF]" aria-hidden="true" /> Opens the official form in a new tab.</> : "The form link unlocks once your receipt matches your fee."}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
