"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Download, FileText, Loader2, Mail, MessageCircle } from "lucide-react";
import { sponsorship } from "@/lib/site";
import { buildSponsorPdf, proposalFileName, summary, type SponsorAnswers } from "@/lib/sponsor-pdf";

const OPTIONS: SponsorAnswers["option"][] = ["Headline Partner", "Showcase Partner", "Gift Partner", "Not sure yet"];
const ITEMS = ["Tote bags", "Power banks", "Earpieces"];
const SPEAK: SponsorAnswers["speak"][] = ["Yes", "Maybe", "No"];

const empty: SponsorAnswers = { brand: "", contactName: "", role: "", phone: "", email: "", business: "", option: "Showcase Partner", items: [], otherItems: "", quantity: "", speak: "Yes", message: "" };

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function SponsorForm() {
  const [v, setV] = useState<SponsorAnswers>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ blob: Blob; answers: SponsorAnswers } | null>(null);
  const [fail, setFail] = useState("");

  const set = <K extends keyof SponsorAnswers>(k: K, val: SponsorAnswers[K]) => setV((p) => ({ ...p, [k]: val }));
  const aria = (k: string) => ({ "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${k}-err` : undefined });
  const err = (k: string) => errors[k] ? <p id={`${k}-err`} className="field-error">{errors[k]}</p> : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const a = { ...v, brand: v.brand.trim(), contactName: v.contactName.trim(), phone: v.phone.trim(), email: v.email.trim() };
    const next: Record<string, string> = {};
    if (!a.brand) next.brand = "Please enter your brand or business name.";
    if (!a.contactName) next.contactName = "Please enter the contact person's name.";
    if (a.phone.replace(/\D/g, "").length < 10) next.phone = "Please enter a valid phone / WhatsApp number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email)) next.email = "Please enter a valid email address.";
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(`s-${Object.keys(next)[0]}`)?.focus();
      return;
    }
    setBusy(true); setFail("");
    try {
      const blob = await buildSponsorPdf(a);
      save(blob, proposalFileName(a.brand));
      setDone({ blob, answers: a });
      setTimeout(() => document.getElementById("sponsor-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch {
      setFail("Sorry, the PDF could not be created on this device. Please try again or contact us on WhatsApp.");
    } finally { setBusy(false); }
  }

  if (done) {
    const text = summary(done.answers);
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="min-w-0 bg-white p-6 text-navy shadow-[0_10px_30px_-18px_rgba(11,30,63,.4)] sm:p-10" role="status">
        <CheckCircle2 size={40} className="text-royal" aria-hidden="true" />
        <h3 className="mt-4 font-display text-3xl">Your proposal is ready, {done.answers.contactName.split(" ")[0]}.</h3>
        <p className="mt-3 text-ink/75">The PDF <b className="break-all">{proposalFileName(done.answers.brand)}</b> has been downloaded with everything you filled in. <b>Last step:</b> send your details to our team on WhatsApp or by email so we can confirm your partnership.</p>
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <a href={`https://wa.me/2348115774517?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className="btn btn-red w-full"><MessageCircle size={16} aria-hidden="true" /> Send on WhatsApp</a>
          <a href={`mailto:${sponsorship.email}?subject=${encodeURIComponent(`Sponsorship: ${done.answers.brand} x Accelerators Events 2026`)}&body=${encodeURIComponent(text + "\n\n(Please attach the downloaded PDF.)")}`} className="btn btn-ghost-dark w-full"><Mail size={16} aria-hidden="true" /> Email us</a>
          <button type="button" onClick={() => save(done.blob, proposalFileName(done.answers.brand))} className="btn btn-ghost-dark w-full"><Download size={16} aria-hidden="true" /> Download again</button>
        </div>
        <p className="mt-5 text-sm text-slate">Tip: attach the PDF in your WhatsApp chat or email so our team has it on file.</p>
        <button type="button" onClick={() => { setDone(null); setV(empty); }} className="mt-6 min-h-[44px] text-sm font-semibold text-royal underline-offset-4 hover:underline">Fill the form for another brand</button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="min-w-0 bg-white p-6 text-navy shadow-[0_10px_30px_-18px_rgba(11,30,63,.4)] sm:p-10">
      <fieldset className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <legend className="mb-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-red">1 · Your brand</legend>
        <div><label htmlFor="s-brand" className="field-label">Brand / business name *</label><input id="s-brand" value={v.brand} onChange={(e) => set("brand", e.target.value)} autoComplete="organization" className="field" {...aria("brand")} />{err("brand")}</div>
        <div><label htmlFor="s-contactName" className="field-label">Contact person *</label><input id="s-contactName" value={v.contactName} onChange={(e) => set("contactName", e.target.value)} autoComplete="name" className="field" {...aria("contactName")} />{err("contactName")}</div>
        <div><label htmlFor="s-role" className="field-label">Role / title</label><input id="s-role" value={v.role} onChange={(e) => set("role", e.target.value)} autoComplete="organization-title" placeholder="e.g. CEO, Brand Manager" className="field" /></div>
        <div><label htmlFor="s-phone" className="field-label">Phone / WhatsApp *</label><input id="s-phone" type="tel" inputMode="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" className="field" {...aria("phone")} />{err("phone")}</div>
        <div className="sm:col-span-2"><label htmlFor="s-email" className="field-label">Email *</label><input id="s-email" type="email" value={v.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" className="field" {...aria("email")} />{err("email")}</div>
        <div className="sm:col-span-2"><label htmlFor="s-business" className="field-label">What does your business sell or do?</label><input id="s-business" value={v.business} onChange={(e) => set("business", e.target.value)} placeholder="e.g. phones & accessories, music, laptops" className="field" /></div>
      </fieldset>

      <fieldset className="mt-10">
        <legend className="mb-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-red">2 · Partnership option</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {OPTIONS.map((o) => (
            <label key={o} className={`relative flex min-h-[52px] cursor-pointer items-center gap-3 border-[1.5px] px-4 py-3 font-semibold transition-colors ${v.option === o ? "border-royal bg-royal/5" : "border-sand hover:border-royal/50"}`}>
              <input type="radio" name="option" value={o} checked={v.option === o} onChange={() => set("option", o)} className="h-5 w-5 accent-[var(--color-royal)]" />{o}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-10">
        <legend className="mb-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-red">3 · Items for our guests</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {ITEMS.map((it) => {
            const on = v.items.includes(it);
            return (
              <label key={it} className={`flex min-h-[52px] cursor-pointer items-center gap-3 border-[1.5px] px-4 py-3 font-semibold transition-colors ${on ? "border-royal bg-royal/5" : "border-sand hover:border-royal/50"}`}>
                <input type="checkbox" checked={on} onChange={() => set("items", on ? v.items.filter((x) => x !== it) : [...v.items, it])} className="h-5 w-5 accent-[var(--color-royal)]" />{it}
              </label>
            );
          })}
        </div>
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div><label htmlFor="s-other" className="field-label">Other items</label><input id="s-other" value={v.otherItems} onChange={(e) => set("otherItems", e.target.value)} placeholder="e.g. branded T-shirts, vouchers" className="field" /></div>
          <div><label htmlFor="s-qty" className="field-label">Approximate quantity</label><input id="s-qty" value={v.quantity} onChange={(e) => set("quantity", e.target.value)} placeholder="e.g. 200 tote bags" className="field" /></div>
        </div>
      </fieldset>

      <fieldset className="mt-10">
        <legend className="mb-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-red">4 · Speak on stage?</legend>
        <div className="flex flex-wrap gap-3">
          {SPEAK.map((s) => (
            <label key={s} className={`flex min-h-[48px] min-w-[96px] cursor-pointer items-center gap-3 border-[1.5px] px-4 font-semibold transition-colors ${v.speak === s ? "border-royal bg-royal/5" : "border-sand hover:border-royal/50"}`}>
              <input type="radio" name="speak" value={s} checked={v.speak === s} onChange={() => set("speak", s)} className="h-5 w-5 accent-[var(--color-royal)]" />{s}
            </label>
          ))}
        </div>
        <div className="mt-5"><label htmlFor="s-msg" className="field-label">Anything else we should know?</label><textarea id="s-msg" rows={4} value={v.message} onChange={(e) => set("message", e.target.value)} className="field" /></div>
      </fieldset>

      <AnimatePresence>{fail && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="field-error mt-6" role="alert">{fail}</motion.p>}</AnimatePresence>
      <button type="submit" disabled={busy} className="btn btn-red mt-8 w-full sm:w-auto">
        {busy ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Creating your PDF…</> : <><FileText size={16} aria-hidden="true" /> Submit &amp; get my proposal PDF</>}
      </button>
      <p className="mt-4 text-sm text-slate">Your PDF is created on your device and downloads straight away. You then send it to us on WhatsApp or by email.</p>
    </form>
  );
}
