"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CircleCheck, Download, FileSignature, Loader2, MessageCircle } from "lucide-react";
import { BALANCE_LAST_DATE, buildPartPaymentLetter, letterFileName, longDate, naira, newRef, partPaymentSummary, type PartPayment } from "@/lib/part-payment";

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Shown when the receipts are valid but add up to less than the fee. The member signs a balance
 * commitment letter (PDF) and the record goes to the organisers' sheet; the form then unlocks.
 */
export function PartPaymentLetter({ position, feeNaira, paidNaira, receipts, onSigned }: {
  position: string; feeNaira: number; paidNaira: number; receipts: number; onSigned: (p: PartPayment | null) => void;
}) {
  const [f, setF] = useState({ fullName: "", phone: "", email: "", balanceDate: "", agree: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ p: PartPayment; blob: Blob; saved: boolean } | null>(null);
  const balance = feeNaira - paidNaira;
  const min = useMemo(today, []);

  // If the amounts change after signing (another receipt added or removed), the letter is no longer valid.
  useEffect(() => {
    if (done && (done.p.paidNaira !== paidNaira || done.p.feeNaira !== feeNaira)) { setDone(null); onSigned(null); }
  }, [done, paidNaira, feeNaira, onSigned]);

  const aria = (k: string) => ({ "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `pp-${k}-err` : undefined });
  const err = (k: string) => errors[k] ? <p id={`pp-${k}-err`} className="mt-1.5 text-xs text-[#FFB4B9]">{errors[k]}</p> : null;
  const field = "w-full min-h-[48px] border border-white/25 bg-white/5 px-3 py-2 text-base text-white placeholder:text-white/40 focus:border-[#9DB2FF] focus:outline-none";

  async function sign(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (f.fullName.trim().split(/\s+/).length < 2) next.fullName = "Enter your full name (first and last name).";
    if (f.phone.replace(/\D/g, "").length < 10) next.phone = "Enter a valid phone / WhatsApp number.";
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) next.email = "Enter a valid email or leave it empty.";
    if (!f.balanceDate || f.balanceDate < min || f.balanceDate > BALANCE_LAST_DATE) next.balanceDate = `Choose a date between today and ${longDate(BALANCE_LAST_DATE)}.`;
    if (!f.agree) next.agree = "Tick the box to sign the letter.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    const p: PartPayment = {
      ref: newRef(), fullName: f.fullName.trim().replace(/\s+/g, " "), phone: f.phone.trim(), email: f.email.trim(), position,
      feeNaira, paidNaira, balanceNaira: balance, receipts, balanceDate: f.balanceDate, signedAt: new Date().toISOString(),
    };
    try {
      const [blob, saved] = await Promise.all([
        buildPartPaymentLetter(p),
        fetch("/api/part-payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) })
          .then((r) => r.json()).then((j) => Boolean(j?.saved)).catch(() => false),
      ]);
      save(blob, letterFileName(p));
      setDone({ p, blob, saved });
      onSigned(p);
    } catch {
      setErrors({ form: "The letter could not be created on this device. Please try again." });
    } finally { setBusy(false); }
  }

  if (done) {
    const wa = `https://wa.me/2348115774517?text=${encodeURIComponent(partPaymentSummary(done.p))}`;
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5 border border-[#7CE0A3]/50 bg-[#7CE0A3]/10 p-4" role="status">
        <p className="flex items-start gap-2 text-sm"><CircleCheck size={18} className="mt-0.5 shrink-0 text-[#7CE0A3]" aria-hidden="true" />
          <span>Letter signed and downloaded (ref <b>{done.p.ref}</b>). Balance of <b>{naira(done.p.balanceNaira)}</b> due on or before <b>{longDate(done.p.balanceDate)}</b>.{done.saved ? " Your commitment has been recorded." : ""}</span>
        </p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-ghost-light w-full whitespace-normal text-center"><MessageCircle size={16} aria-hidden="true" /> {done.saved ? "Also send on WhatsApp" : "Send letter on WhatsApp"}</a>
          <button type="button" onClick={() => save(done.blob, letterFileName(done.p))} className="btn btn-ghost-light w-full"><Download size={16} aria-hidden="true" /> Download again</button>
        </div>
        <p className="mt-3 text-xs text-mist">Attach this letter and your receipt(s) to the registration form below.</p>
      </motion.div>
    );
  }

  return (
    <motion.form onSubmit={sign} noValidate initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5 border border-white/20 bg-white/[0.04] p-4 sm:p-5">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9DB2FF]"><FileSignature size={15} aria-hidden="true" /> Paying in parts?</p>
      <p className="mt-2 text-sm text-mist">You can still register with your part payment of <b className="text-white">{naira(paidNaira)}</b>. Sign a commitment letter to pay the balance of <b className="text-white">{naira(balance)}</b> by a date you choose.</p>

      <div className="mt-4 grid grid-cols-1 gap-3">
        <div><label htmlFor="pp-name" className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-white/80">Full name *</label><input id="pp-name" autoComplete="name" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} className={field} {...aria("fullName")} />{err("fullName")}</div>
        <div><label htmlFor="pp-phone" className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-white/80">Phone / WhatsApp *</label><input id="pp-phone" type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={field} {...aria("phone")} />{err("phone")}</div>
        <div><label htmlFor="pp-email" className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-white/80">Email (optional)</label><input id="pp-email" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={field} {...aria("email")} />{err("email")}</div>
        <div><label htmlFor="pp-date" className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-white/80">I will pay the balance on or before *</label><input id="pp-date" type="date" min={min} max={BALANCE_LAST_DATE} value={f.balanceDate} onChange={(e) => setF({ ...f, balanceDate: e.target.value })} className={`${field} [color-scheme:dark]`} {...aria("balanceDate")} />{err("balanceDate")}</div>
        <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-sm text-mist">
          <input type="checkbox" checked={f.agree} onChange={(e) => setF({ ...f, agree: e.target.checked })} className="mt-1 h-5 w-5 shrink-0 accent-[#E11E2D]" {...aria("agree")} />
          <span>I commit to paying the balance of <b className="text-white">{naira(balance)}</b> into the official account by the date above. My registration is complete only when the full fee is paid.</span>
        </label>
        {err("agree")}{err("form")}
      </div>
      <button type="submit" disabled={busy} className="btn btn-red mt-4 w-full whitespace-normal text-center">
        {busy ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Creating your letter…</> : <><FileSignature size={16} aria-hidden="true" /> Sign &amp; download my letter</>}
      </button>
    </motion.form>
  );
}
