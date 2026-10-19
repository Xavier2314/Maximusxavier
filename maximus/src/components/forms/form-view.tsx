"use client";

import { useState, useTransition, type CSSProperties } from "react";
import { submitFormAction } from "@/app/s/actions";
import type { FormDef, FormFieldDef } from "@/lib/forms";
import { mix, onColor, rgba, tokens } from "@/lib/funnel-styles";

type Values = Record<string, string | string[]>;

/** The public form or survey. In the builder (`preview`) it looks real but sends nothing. */
export function FormView({ slug, title, def, preview }: { slug: string; title: string; def: FormDef; preview?: boolean }) {
  const dz = def.design;
  const base = tokens({ style: def.theme.style, accent: def.theme.accent, mode: def.theme.mode, ...(dz.headingFont ? { headingFont: dz.headingFont } : {}), ...(dz.bodyFont ? { bodyFont: dz.bodyFont } : {}) });
  // The seller's own colours win over the look's.
  const custom = !!(dz.cardColor || dz.textColor);
  const t = {
    ...base, bg: dz.pageColor || base.bg, surface: dz.cardColor || base.surface, text: dz.textColor || base.text, onAccent: onColor(base.accent),
    // With the seller's own colours, soft text and borders are derived from them so they always stay readable.
    ...(custom ? { mute: rgba(dz.textColor || base.text, 0.72), line: rgba(dz.textColor || base.text, 0.22) } : {}),
  };
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

  const R = { look: st.radius, none: 0, small: 8, medium: 14, large: 24, pill: 28 }[dz.radius];
  const fieldR = dz.radius === "pill" ? 999 : Math.min(R, 16);
  const btnR = dz.radius === "pill" ? 999 : dz.radius === "look" ? st.btnRadius : Math.min(R, 16);
  const cardKind = dz.card === "look" ? st.card : dz.card;
  const gap = { compact: 14, comfortable: 20, spacious: 28 }[dz.density];
  const pad = { compact: "1.1rem", comfortable: "1.6rem", spacious: "2.2rem" }[dz.density];
  const maxW = { narrow: "28rem", medium: "36rem", wide: "48rem" }[dz.width];
  const shadow = { none: "none", soft: "0 6px 24px rgba(15,23,42,.08)", strong: "0 18px 48px rgba(15,23,42,.22)" }[dz.shadow];
  const onImage = dz.bg === "image" && !!dz.bgImage;
  const headColor = onImage ? "#ffffff" : t.text;
  const fs = { sm: { fontSize: 14, padding: "0.55rem 0.75rem" }, md: { fontSize: 16, padding: "0.75rem 0.9rem" }, lg: { fontSize: 18, padding: "0.95rem 1.1rem" } }[dz.fieldSize];

  const card: CSSProperties = cardKind === "none" ? { color: t.text }
    : cardKind === "glass" ? { background: rgba(t.surface, 0.72), backdropFilter: "blur(14px)", border: `1px solid ${rgba(t.text, 0.12)}`, borderRadius: R, color: t.text, boxShadow: shadow }
    : cardKind === "flat" ? { background: t.surface, borderRadius: R, color: t.text }
    : cardKind === "neo" ? { background: t.surface, border: `2px solid ${t.text}`, borderRadius: R, color: t.text, boxShadow: `5px 5px 0 ${t.text}` }
    : { background: t.surface, border: `1px solid ${t.line}`, borderRadius: R, color: t.text, boxShadow: shadow };
  const fieldBase: CSSProperties = { width: "100%", color: t.text, fontSize: fs.fontSize, padding: fs.padding, outlineColor: t.accent };
  const input: CSSProperties = dz.fieldStyle === "underline"
    ? { ...fieldBase, background: "transparent", border: 0, borderBottom: `2px solid ${t.line}`, borderRadius: 0 }
    : dz.fieldStyle === "filled"
      ? { ...fieldBase, background: mix(t.surface, t.text, 0.06), border: "1px solid transparent", borderRadius: fieldR }
      : { ...fieldBase, background: t.bg, border: `${cardKind === "neo" ? 2 : 1}px solid ${t.line}`, borderRadius: fieldR };
  const gradient = `linear-gradient(135deg, ${t.accent}, ${t.accent2})`;
  const solid: CSSProperties = { background: dz.button === "gradient" || (dz.button === "look" && st.btn === "gradient") ? gradient : t.accent, color: dz.button === "gradient" || (dz.button === "look" && st.btn === "gradient") ? onColor(mix(t.accent, t.accent2, 0.5)) : t.onAccent, border: dz.button === "look" && st.btn === "neo" ? `2px solid ${t.text}` : 0 };
  const btn: CSSProperties = {
    ...(dz.button === "outline" ? { background: "transparent", color: t.accent, border: `2px solid ${t.accent}` } : solid),
    borderRadius: btnR, fontWeight: 700, fontSize: dz.buttonSize === "lg" ? 18 : 16, padding: dz.buttonSize === "lg" ? "1rem 2rem" : "0.8rem 1.5rem",
    width: dz.buttonWidth === "full" ? "100%" : undefined,
  };
  const pageBg: CSSProperties = dz.bg === "gradient" && (dz.pageColor || dz.bgColor2)
    ? { background: `linear-gradient(160deg, ${dz.pageColor || t.bg}, ${dz.bgColor2 || t.alt})` }
    : onImage ? { backgroundImage: `url("${dz.bgImage.replace(/"/g, "%22")}")`, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "#111827" }
    : { background: t.bg };
  const justify = { left: "flex-start", center: "center", right: "flex-end" } as const;

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
    <main style={{ ...pageBg, color: t.text, fontFamily: st.body, minHeight: preview ? undefined : "100dvh", position: "relative" }} className="px-4 py-8 sm:py-12">
      {onImage && dz.overlay > 0 && <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `rgba(0,0,0,${dz.overlay / 100})` }} />}
      <div className="relative mx-auto w-full" style={{ maxWidth: maxW, display: "grid", gap: gap }}>
        {done ? (
          <div role="status" className="space-y-3 p-8 text-center" style={card}>
            {dz.logo && <Logo dz={dz} />}
            <h1 style={{ fontFamily: st.heading, fontWeight: st.weight, fontSize: 28 }}>{def.successTitle}</h1>
            {def.successText && <p style={{ color: t.mute }}>{def.successText}</p>}
          </div>
        ) : (
          <>
            {(step === 0 || steps.length === 1) && (
              <header className="space-y-2" style={{ textAlign: dz.headerAlign }}>
                {dz.logo && <Logo dz={dz} />}
                <h1 style={{ fontFamily: st.heading, fontWeight: st.weight, letterSpacing: st.tracking, fontSize: "clamp(1.6rem,5vw,2.2rem)", lineHeight: 1.1, color: headColor }}>{def.intro.title || title}</h1>
                {def.intro.text && <p style={{ color: onImage ? "rgba(255,255,255,.85)" : t.mute }}>{def.intro.text}</p>}
              </header>
            )}
            {steps.length > 1 && dz.progress === "bar" && (
              <div aria-label={`Step ${step + 1} of ${steps.length}`} role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step + 1} className="h-2 overflow-hidden rounded-full" style={{ background: onImage ? "rgba(255,255,255,.3)" : rgba(t.accent, 0.15) }}>
                <div className="h-full transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%`, background: t.accent }} />
              </div>
            )}
            {steps.length > 1 && dz.progress === "dots" && (
              <ol aria-label={`Step ${step + 1} of ${steps.length}`} className="flex items-center justify-center gap-2">
                {steps.map((x, i) => <li key={x.id} aria-current={i === step ? "step" : undefined} className="grid size-8 place-items-center rounded-full text-xs font-bold" style={{ background: i <= step ? t.accent : "transparent", color: i <= step ? t.onAccent : onImage ? "#fff" : t.mute, border: `2px solid ${i <= step ? t.accent : onImage ? "rgba(255,255,255,.6)" : t.line}` }}>{i + 1}</li>)}
              </ol>
            )}
            <form onSubmit={(e) => { e.preventDefault(); if (last) submit(); else next(); }} style={{ ...card, padding: cardKind === "none" ? 0 : pad, display: "grid", gap }} noValidate>
              <input type="text" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={trap} onChange={(e) => setTrap(e.target.value)} name="website" />
              {cur.title && <h2 style={{ fontFamily: st.heading, fontWeight: st.weight, fontSize: 20 }}>{cur.title}</h2>}
              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap }}>
                {cur.fields.map((f) => <div key={f.id} className={f.width === "half" ? "sm:col-span-1" : "sm:col-span-2"}><Field f={f} v={values[f.id]} set={(v) => set(f.id, v)} input={input} t={t} /></div>)}
              </div>
              {last && def.consent && (
                <label className="flex cursor-pointer items-start gap-3 text-sm" style={{ color: t.mute }}>
                  <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); setError(""); }} className="mt-0.5 size-5 shrink-0" style={{ accentColor: t.accent }} /><span>{def.consent}</span>
                </label>
              )}
              {error && <p role="alert" className="text-sm" style={{ color: "#dc2626" }}>{error}</p>}
              <div className="flex gap-3" style={{ justifyContent: dz.buttonWidth === "full" ? "stretch" : justify[dz.buttonAlign], flexDirection: dz.buttonWidth === "full" ? "column-reverse" : "row" }}>
                {step > 0 && <button type="button" onClick={() => { setStep((s) => s - 1); setError(""); }} style={{ ...btn, background: "transparent", color: t.text, border: `1px solid ${t.line}`, width: dz.buttonWidth === "full" ? "100%" : undefined }}>Back</button>}
                <button type="submit" disabled={pending} style={btn} className="disabled:opacity-60">{last ? (pending ? "Sending…" : def.submitText) : "Next"}</button>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

function Logo({ dz }: { dz: FormDef["design"] }) {
  const h = { sm: 28, md: 44, lg: 64 }[dz.logoSize];
  return <div style={{ display: "flex", justifyContent: { left: "flex-start", center: "center", right: "flex-end" }[dz.logoAlign] }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={dz.logo} alt="" style={{ height: h, width: "auto", maxWidth: "100%", objectFit: "contain" }} /></div>;
}

function Field({ f, v, set, input, t }: { f: FormFieldDef; v: string | string[] | undefined; set: (v: string | string[]) => void; input: CSSProperties; t: ReturnType<typeof tokens> }) {
  const val = typeof v === "string" ? v : "";
  const arr = Array.isArray(v) ? v : [];
  const id = `f-${f.id}`;
  const chip = (on: boolean): CSSProperties => ({ border: `1px solid ${on ? t.accent : t.line}`, background: on ? rgba(t.accent, 0.16) : mix(t.surface, t.text, 0.05), color: t.text, borderRadius: 12, padding: "0.6rem 0.9rem", cursor: "pointer" });
  const body = (() => {
    switch (f.type) {
      case "long": return <textarea id={id} rows={4} maxLength={2000} placeholder={f.placeholder} value={val} onChange={(e) => set(e.target.value)} style={input} />;
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
      case "email": return <input id={id} type="email" autoComplete="email" maxLength={254} placeholder={f.placeholder} value={val} onChange={(e) => set(e.target.value)} style={input} />;
      case "phone": return <input id={id} type="tel" inputMode="tel" autoComplete="tel" maxLength={25} placeholder={f.placeholder} value={val} onChange={(e) => set(e.target.value)} style={input} />;
      case "number": return <input id={id} type="number" inputMode="decimal" placeholder={f.placeholder} value={val} onChange={(e) => set(e.target.value)} style={input} />;
      default: return <input id={id} type="text" maxLength={300} placeholder={f.placeholder} value={val} onChange={(e) => set(e.target.value)} style={input} />;
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
