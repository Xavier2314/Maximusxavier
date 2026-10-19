"use client";

import { useState, useTransition, type CSSProperties } from "react";
import { submitFormAction } from "@/app/s/actions";
import type { FormDef, FormFieldDef } from "@/lib/forms";
import { rgba, tokens } from "@/lib/funnel-styles";

type Values = Record<string, string | string[]>;

/** The public form or survey. In the builder (`preview`) it looks real but sends nothing. */
export function FormView({ slug, title, def, preview }: { slug: string; title: string; def: FormDef; preview?: boolean }) {
  const t = tokens({ style: def.theme.style, accent: def.theme.accent, mode: def.theme.mode });
  const st = t.style;
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>({});
  const [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const steps = def.steps;
  const cur = steps[Math.min(step, steps.length - 1)];
  const last = step >= steps.length - 1;

  const set = (id: string, v: string | string[]) => { setValues((x) => ({ ...x, [id]: v })); setError(""); };
  const filled = (f: FormFieldDef) => { const v = values[f.id]; return Array.isArray(v) ? v.length > 0 : (v ?? "").trim() !== ""; };
  const missing = (fields: FormFieldDef[]) => fields.find((f) => f.required && !filled(f));

  const card: CSSProperties = { background: t.surface, border: `${st.card === "neo" ? 2 : 1}px solid ${t.line}`, borderRadius: st.radius, color: t.text };
  const input: CSSProperties = { width: "100%", background: t.bg, color: t.text, border: `${st.card === "neo" ? 2 : 1}px solid ${t.line}`, borderRadius: Math.min(st.radius, 14), padding: "0.75rem 0.9rem", fontSize: 16, outlineColor: t.accent };
  const btn: CSSProperties = { background: t.accent, color: t.onAccent, borderRadius: st.btnRadius, padding: "0.85rem 1.5rem", fontWeight: 700, fontSize: 16, border: st.btn === "neo" ? `2px solid ${t.text}` : 0 };

  function next() {
    const m = missing(cur.fields);
    if (m) { setError(`Please answer “${m.label}”.`); return; }
    setError(""); setStep((s) => s + 1); window.scrollTo?.({ top: 0 });
  }
  function submit() {
    const m = missing(cur.fields);
    if (m) { setError(`Please answer “${m.label}”.`); return; }
    if (def.consent && !consent) { setError("Please tick the box to agree before sending."); return; }
    if (preview) { setError("Preview only. Publish to collect real answers."); return; }
    start(async () => {
      const res = await submitFormAction(slug, JSON.stringify({ ...values, __consent: consent ? "on" : "" }), trap);
      if (!res.ok) { setError(res.message); return; }
      if (res.redirectUrl) { window.location.href = res.redirectUrl; return; }
      setDone(true);
    });
  }

  return (
    <main style={{ background: t.bg, color: t.text, fontFamily: st.body, minHeight: preview ? undefined : "100dvh" }} className="px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-xl space-y-5">
        {done ? (
          <div role="status" className="space-y-3 p-8 text-center" style={card}>
            <h1 style={{ fontFamily: st.heading, fontWeight: st.weight, fontSize: 28 }}>{def.successTitle}</h1>
            {def.successText && <p style={{ color: t.mute }}>{def.successText}</p>}
          </div>
        ) : (
          <>
            {(step === 0 || steps.length === 1) && (
              <header className="space-y-2 text-center">
                <h1 style={{ fontFamily: st.heading, fontWeight: st.weight, letterSpacing: st.tracking, fontSize: "clamp(1.6rem,5vw,2.2rem)", lineHeight: 1.1 }}>{def.intro.title || title}</h1>
                {def.intro.text && <p style={{ color: t.mute }}>{def.intro.text}</p>}
              </header>
            )}
            {steps.length > 1 && (
              <div aria-label={`Step ${step + 1} of ${steps.length}`} role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step + 1} className="h-2 overflow-hidden rounded-full" style={{ background: rgba(t.accent, 0.15) }}>
                <div className="h-full transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%`, background: t.accent }} />
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); if (last) submit(); else next(); }} className="space-y-5 p-5 sm:p-7" style={card} noValidate>
              <input type="text" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={trap} onChange={(e) => setTrap(e.target.value)} name="website" />
              {cur.title && <h2 style={{ fontFamily: st.heading, fontWeight: st.weight, fontSize: 20 }}>{cur.title}</h2>}
              {cur.fields.map((f) => <Field key={f.id} f={f} v={values[f.id]} set={(v) => set(f.id, v)} input={input} t={t} />)}
              {last && def.consent && (
                <label className="flex cursor-pointer items-start gap-3 text-sm" style={{ color: t.mute }}>
                  <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); setError(""); }} className="mt-0.5 size-5 shrink-0" style={{ accentColor: t.accent }} /><span>{def.consent}</span>
                </label>
              )}
              {error && <p role="alert" className="text-sm" style={{ color: "#dc2626" }}>{error}</p>}
              <div className="flex justify-between gap-3">
                {step > 0 ? <button type="button" onClick={() => { setStep((s) => s - 1); setError(""); }} style={{ ...btn, background: "transparent", color: t.text, border: `1px solid ${t.line}` }}>Back</button> : <span />}
                <button type="submit" disabled={pending} style={btn} className="disabled:opacity-60">{last ? (pending ? "Sending…" : def.submitText) : "Next"}</button>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

function Field({ f, v, set, input, t }: { f: FormFieldDef; v: string | string[] | undefined; set: (v: string | string[]) => void; input: CSSProperties; t: ReturnType<typeof tokens> }) {
  const val = typeof v === "string" ? v : "";
  const arr = Array.isArray(v) ? v : [];
  const id = `f-${f.id}`;
  const chip = (on: boolean): CSSProperties => ({ border: `1px solid ${on ? t.accent : t.line}`, background: on ? rgba(t.accent, 0.12) : t.bg, borderRadius: 12, padding: "0.6rem 0.9rem", cursor: "pointer" });
  const body = (() => {
    switch (f.type) {
      case "long": return <textarea id={id} rows={4} maxLength={2000} value={val} onChange={(e) => set(e.target.value)} style={input} />;
      case "select": return <select id={id} value={val} onChange={(e) => set(e.target.value)} style={input}><option value="">Choose…</option>{f.options.map((o) => <option key={o} value={o}>{o}</option>)}</select>;
      case "radio": case "yesno": return (
        <div role="radiogroup" aria-labelledby={`${id}-l`} className="grid gap-2">{(f.type === "yesno" ? ["Yes", "No"] : f.options).map((o) => (
          <label key={o} style={chip(val === o)} className="flex items-center gap-2.5"><input type="radio" name={id} checked={val === o} onChange={() => set(o)} style={{ accentColor: t.accent }} />{o}</label>))}</div>);
      case "checkbox": return (
        <div className="grid gap-2">{f.options.map((o) => (
          <label key={o} style={chip(arr.includes(o))} className="flex items-center gap-2.5"><input type="checkbox" checked={arr.includes(o)} onChange={() => set(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o])} style={{ accentColor: t.accent }} />{o}</label>))}</div>);
      case "rating": return (
        <div role="radiogroup" aria-labelledby={`${id}-l`} className="flex gap-1.5">{[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={Number(val) >= n} aria-label={`${n} out of 5`} onClick={() => set(String(n))} className="text-3xl leading-none" style={{ color: Number(val) >= n ? t.accent : t.line }}>★</button>))}</div>);
      case "nps": return (
        <div role="radiogroup" aria-labelledby={`${id}-l`} className="grid grid-cols-6 gap-1.5 sm:grid-cols-11">{Array.from({ length: 11 }, (_, n) => (
          <button key={n} type="button" role="radio" aria-checked={val === String(n)} onClick={() => set(String(n))} className="py-2 text-sm font-semibold" style={{ ...chip(val === String(n)), textAlign: "center", padding: "0.5rem 0" }}>{n}</button>))}</div>);
      case "date": return <input id={id} type="date" value={val} onChange={(e) => set(e.target.value)} style={input} />;
      case "email": return <input id={id} type="email" autoComplete="email" maxLength={254} value={val} onChange={(e) => set(e.target.value)} style={input} />;
      case "phone": return <input id={id} type="tel" inputMode="tel" autoComplete="tel" maxLength={25} value={val} onChange={(e) => set(e.target.value)} style={input} />;
      case "number": return <input id={id} type="number" inputMode="decimal" value={val} onChange={(e) => set(e.target.value)} style={input} />;
      default: return <input id={id} type="text" maxLength={300} value={val} onChange={(e) => set(e.target.value)} style={input} />;
    }
  })();
  return (
    <div className="space-y-1.5">
      <label id={`${id}-l`} htmlFor={id} className="block text-sm font-semibold">{f.label}{f.required && <span aria-hidden style={{ color: t.accent }}> *</span>}</label>
      {f.help && <p className="text-xs" style={{ color: t.mute }}>{f.help}</p>}
      {body}
      {f.type === "nps" && <p className="flex justify-between text-[11px]" style={{ color: t.mute }}><span>Not likely</span><span>Very likely</span></p>}
    </div>
  );
}
