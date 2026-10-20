"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Check, Copy, Eye, GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { FormView, type FormEditApi } from "@/components/forms/form-view";
import { ImageField } from "@/components/funnels/image-upload";
import { FIELD_TYPES, MAX_FIELDS, MAX_STEPS, insertField, moveField, newField, newStep, type FieldType, type FormDef, type FormDesign, type FormFieldDef, type FormKind, type FormStep, type Slot } from "@/lib/forms";
import { STYLES } from "@/lib/funnel-styles";
import { FONT_KEYS, FONT_LABELS, STYLE_KEYS, type StyleKey } from "@/lib/funnels";
import { deleteFormAction, saveFormAction } from "../actions";

type Doc = { title: string; slug: string; published: boolean; kind: FormKind; def: FormDef };
const SLUG_OK = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
const HAS_OPTIONS: FieldType[] = ["select", "radio", "checkbox"];

type Drag = { kind: "field"; from: Slot } | { kind: "new"; type: FieldType };

export function FormEditor({ id, initial, userId }: { id: string; initial: Doc; userId: string }) {
  const [drag, setDragState] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const setDrag = (d: Drag | null) => { dragRef.current = d; setDragState(d); };
  const [over, setOver] = useState<Slot | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [pvStep, setPvStep] = useState(0);
  const [doc, setDoc] = useState<Doc>(initial);
  const [status, setStatus] = useState<"saved" | "dirty" | "saving" | "error">("saved");
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const ver = useRef(0);
  useEffect(() => setOrigin(window.location.origin), []);

  const edit = (fn: (d: Doc) => Doc) => { setDoc(fn); ver.current += 1; setStatus("dirty"); setMsg(""); };
  const def = (fn: (d: FormDef) => FormDef) => edit((d) => ({ ...d, def: fn(d.def) }));
  const step = (i: number, fn: (s: FormStep) => FormStep) => def((d) => ({ ...d, steps: d.steps.map((s, k) => (k === i ? fn(s) : s)) }));
  const field = (i: number, j: number, patch: Partial<FormFieldDef>) => step(i, (s) => ({ ...s, fields: s.fields.map((f, k) => (k === j ? { ...f, ...patch } : f)) }));

  const design = (patch: Partial<FormDesign>) => def((d) => ({ ...d, design: { ...d.design, ...patch } }));
  const drop = (to: Slot) => {
    const dg = dragRef.current; // a ref, so a fast drop never sees stale state
    if (!dg) return;
    if (dg.kind === "field") def((d) => moveField(d, dg.from, to));
    else def((d) => insertField(d, to, newField(dg.type)));
    setDrag(null); setOver(null);
  };
  const endDrag = () => { setDrag(null); setOver(null); };
  // Hovering the top half of a question drops before it, the bottom half after it.
  const slotAt = (e: React.DragEvent, step: number, index: number): Slot => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { step, index: e.clientY < r.top + r.height / 2 ? index : index + 1 };
  };
  const hover = (e: React.DragEvent, step: number, index: number) => {
    if (!dragRef.current) return;
    e.preventDefault(); e.stopPropagation();
    setOver(slotAt(e, step, index));
  };
  const line = (step: number, index: number) => over && over.step === step && over.index === index ? <div aria-hidden className="h-1 rounded-full bg-primary" /> : null;

  const locate = (id: string): Slot | null => {
    for (let i = 0; i < doc.def.steps.length; i++) { const j = doc.def.steps[i].fields.findIndex((f) => f.id === id); if (j >= 0) return { step: i, index: j }; }
    return null;
  };
  const select = (id: string, scrollList = true) => {
    setSelected(id);
    const at = locate(id);
    if (at) setPvStep(at.step);
    if (scrollList) document.getElementById(`q-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };
  const total = doc.def.steps.reduce((a, s) => a + s.fields.length, 0);
  const canvas: FormEditApi = {
    step: Math.min(pvStep, doc.def.steps.length - 1), setStep: setPvStep, selected, select: (id) => select(id),
    draggingId: drag?.kind === "field" ? (doc.def.steps[drag.from.step]?.fields[drag.from.index]?.id ?? null) : null, over,
    startDrag: (stepI, index) => setDrag({ kind: "field", from: { step: stepI, index } }), endDrag,
    hover, drop: (e, stepI, index) => { e.preventDefault(); e.stopPropagation(); drop(slotAt(e, stepI, index)); },
    hoverAt: (e, stepI, index) => { if (!dragRef.current) return; e.preventDefault(); e.stopPropagation(); setOver({ step: stepI, index }); },
    dropAt: (e, stepI, index) => { e.preventDefault(); e.stopPropagation(); drop({ step: stepI, index }); },
    remove: (id) => { def((d) => ({ ...d, steps: d.steps.map((s) => ({ ...s, fields: s.fields.filter((f) => f.id !== id) })) })); setSelected((x) => (x === id ? null : x)); },
    duplicate: (id) => {
      const at = locate(id); const src = at && doc.def.steps[at.step].fields[at.index];
      if (!at || !src) return;
      const copy = { ...src, id: newField().id, options: [...src.options] };
      def((d) => insertField(d, { step: at.step, index: at.index + 1 }, copy)); setSelected(copy.id);
    },
    relabel: (id, text) => { const at = locate(id); if (at) field(at.step, at.index, { label: text.slice(0, 200) }); },
    canRemove: total > 1, canAdd: total < MAX_FIELDS,
  };
  const palette = (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Question types">
      {FIELD_TYPES.map((t) => (
        <button key={t.key} type="button" draggable disabled={total >= MAX_FIELDS}
          onDragStart={(e) => { e.dataTransfer.setData("text/plain", t.key); e.dataTransfer.effectAllowed = "copy"; setDrag({ kind: "new", type: t.key }); }} onDragEnd={endDrag}
          onClick={() => { const st = Math.min(pvStep, doc.def.steps.length - 1); const f = newField(t.key); def((d) => insertField(d, { step: st, index: d.steps[st].fields.length }, f)); setSelected(f.id); }}
          className="cursor-grab rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:border-primary hover:bg-primary-soft active:cursor-grabbing disabled:opacity-40">{t.label}</button>
      ))}
    </div>
  );

  const save = useCallback(async () => {
    const v = ver.current;
    setStatus("saving");
    try {
      const r = await saveFormAction(id, JSON.stringify({ title: doc.title, slug: doc.slug, published: doc.published, definition: doc.def }));
      if (r?.ok) { if (ver.current === v) setStatus("saved"); } else { setStatus("error"); setMsg(r?.message ?? "Could not save."); }
    } catch { setStatus("error"); setMsg("Could not reach the server. Your edits are still here."); }
  }, [id, doc]);
  useEffect(() => {
    if (status !== "dirty" || !SLUG_OK.test(doc.slug) || !doc.title.trim()) return;
    const h = setTimeout(() => { void save(); }, 1200);
    return () => clearTimeout(h);
  }, [status, doc.slug, doc.title, save]);
  useEffect(() => {
    if (status !== "dirty" && status !== "saving") return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [status]);

  const url = `${origin}/s/${doc.slug}`;
  const move = <T,>(a: T[], i: number, d: number) => { const b = [...a]; const j = i + d; if (j < 0 || j >= b.length) return b; [b[i], b[j]] = [b[j], b[i]]; return b; };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)]">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Input aria-label="Name" value={doc.title} maxLength={120} onChange={(e) => edit((d) => ({ ...d, title: e.target.value }))} className="!w-60 font-semibold" />
          <span role="status" className={`rounded-full border px-2.5 py-1 text-xs ${status === "error" ? "border-danger text-danger" : "border-border text-fg-subtle"}`}>
            {status === "saving" ? "Saving…" : status === "dirty" ? "Unsaved…" : status === "error" ? msg : <span className="inline-flex items-center gap-1"><Check className="size-3.5 text-success" />Autosave on · saved</span>}
          </span>
          <Link href={`/marketing/forms/${id}/responses`} className="ml-auto inline-flex h-10 items-center rounded-xl border border-border px-3 text-sm font-medium hover:bg-surface-muted">Responses</Link>
        </div>

        <section className="space-y-3 rounded-2xl border border-border p-4" aria-label="Sharing">
          <label className="flex items-center gap-3 text-sm font-semibold"><Checkbox checked={doc.published} onChange={(e) => edit((d) => ({ ...d, published: e.target.checked }))} />{doc.published ? "Live: anyone with the link can answer" : "Draft: only you can see it"}</label>
          <Field label="Your link" htmlFor="slug" hint="Letters, numbers and dashes.">
            <div className="flex items-center gap-1.5"><span className="shrink-0 text-xs text-fg-subtle">{origin.replace(/^https?:\/\//, "")}/s/</span><Input id="slug" value={doc.slug} maxLength={40} onChange={(e) => edit((d) => ({ ...d, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))} /></div>
          </Field>
          {!SLUG_OK.test(doc.slug) && <p role="alert" className="text-sm text-danger">The link needs 3 to 40 letters, numbers or dashes.</p>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* blocked */ } }}>{copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}{copied ? "Copied" : "Copy link"}</Button>
            {doc.published && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1 rounded-xl border border-border px-3 text-sm font-medium hover:bg-surface-muted"><Eye className="size-4" />Open</a>}
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-border p-4" aria-label="Look and wording">
          <h2 className="text-base font-semibold">Look and wording</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Look" htmlFor="look"><Select id="look" value={doc.def.theme.style} onChange={(e) => { const k = e.target.value as StyleKey; def((d) => ({ ...d, theme: { style: k, accent: STYLES[k].accent, mode: STYLES[k].mode } })); }}>{STYLE_KEYS.map((k) => <option key={k} value={k}>{STYLES[k].name}</option>)}</Select></Field>
            <Field label="Brand colour" htmlFor="accent"><div className="flex gap-2"><input id="accent" type="color" aria-label="Brand colour" value={doc.def.theme.accent} onChange={(e) => def((d) => ({ ...d, theme: { ...d.theme, accent: e.target.value } }))} className="h-10 w-14 cursor-pointer rounded-lg border border-border" /><Input value={doc.def.theme.accent} maxLength={7} onChange={(e) => /^#[0-9a-f]{0,6}$/i.test(e.target.value) && def((d) => ({ ...d, theme: { ...d.theme, accent: e.target.value.length === 7 ? e.target.value : d.theme.accent } }))} aria-label="Colour code" /></div></Field>
          </div>
          <Field label="Heading" htmlFor="h"><Input id="h" value={doc.def.intro.title} maxLength={120} onChange={(e) => def((d) => ({ ...d, intro: { ...d.intro, title: e.target.value } }))} /></Field>
          <Field label="Short intro" htmlFor="t"><Textarea id="t" rows={2} value={doc.def.intro.text} maxLength={600} onChange={(e) => def((d) => ({ ...d, intro: { ...d.intro, text: e.target.value } }))} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Send button" htmlFor="sb"><Input id="sb" value={doc.def.submitText} maxLength={40} onChange={(e) => def((d) => ({ ...d, submitText: e.target.value }))} /></Field>
            <Field label="After sending: go to a page (optional)" htmlFor="ru" hint="A full https:// link. Leave empty to show the thank-you message."><Input id="ru" value={doc.def.redirectUrl} inputMode="url" placeholder="https://" onChange={(e) => def((d) => ({ ...d, redirectUrl: e.target.value }))} /></Field>
          </div>
          <Field label="Thank-you heading" htmlFor="st"><Input id="st" value={doc.def.successTitle} maxLength={120} onChange={(e) => def((d) => ({ ...d, successTitle: e.target.value }))} /></Field>
          <Field label="Thank-you message" htmlFor="sm"><Textarea id="sm" rows={2} value={doc.def.successText} maxLength={400} onChange={(e) => def((d) => ({ ...d, successText: e.target.value }))} /></Field>
          <Field label="Consent tick box (optional)" htmlFor="co" hint="Use it when you collect names, emails or phone numbers, e.g. “I agree to be contacted about my enquiry.” People must tick it to send."><Input id="co" value={doc.def.consent} maxLength={200} onChange={(e) => def((d) => ({ ...d, consent: e.target.value }))} /></Field>
        </section>

        <DesignPanel d={doc.def.design} set={design} userId={userId} />

        <section className="space-y-4" aria-label="Questions">
          <h2 className="text-base font-semibold">Questions ({total})</h2>
          <div className="rounded-2xl border border-dashed border-border p-3" aria-label="Question types">
            <p className="mb-2 text-xs text-fg-muted">Drag a type into your form, or click it to add at the end. Drag the <GripVertical className="inline size-3.5" aria-hidden /> handle on a question to move it, even to another step.</p>
            {palette}
          </div>
          {doc.def.steps.map((s, i) => (
            <div key={s.id} className="space-y-3 rounded-2xl border border-border p-4"
              onDragOver={(e) => { if (dragRef.current) { e.preventDefault(); if (!s.fields.length) setOver({ step: i, index: 0 }); } }} onDrop={(e) => { e.preventDefault(); drop(over && over.step === i ? over : { step: i, index: s.fields.length }); }}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-fg">{i + 1}</span>
                <Input aria-label={`Step ${i + 1} title`} value={s.title} maxLength={100} placeholder={doc.def.steps.length > 1 ? "Step title" : "Section title (optional)"} onChange={(e) => step(i, (x) => ({ ...x, title: e.target.value }))} className="min-w-0 flex-1" />
                <Button size="icon" variant="ghost" aria-label="Move step earlier" disabled={i === 0} onClick={() => def((d) => ({ ...d, steps: move(d.steps, i, -1) }))}><ArrowUp className="size-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="Move step later" disabled={i === doc.def.steps.length - 1} onClick={() => def((d) => ({ ...d, steps: move(d.steps, i, 1) }))}><ArrowDown className="size-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="Delete step" disabled={doc.def.steps.length <= 1} onClick={() => { if (confirm("Delete this step and its questions?")) def((d) => ({ ...d, steps: d.steps.filter((_, k) => k !== i) })); }}><Trash2 className="size-4" /></Button>
              </div>
              {s.fields.map((f, j) => (
                <div key={f.id} id={`q-${f.id}`} data-q={`${i}-${j}`} onFocusCapture={() => { if (selected !== f.id) select(f.id, false); }}>
                  {line(i, j)}
                  <div className={`space-y-2.5 rounded-xl bg-surface-muted p-3 ${selected === f.id ? "ring-2 ring-primary" : ""} ${drag?.kind === "field" && drag.from.step === i && drag.from.index === j ? "opacity-40" : ""}`} onDragOver={(e) => hover(e, i, j)} onDrop={(e) => { e.preventDefault(); e.stopPropagation(); drop(slotAt(e, i, j)); }}>
                    <div className="grid gap-2 sm:grid-cols-[auto_1fr_11rem]">
                      <span role="button" tabIndex={-1} aria-label="Drag to move this question" title="Drag to move" draggable
                        onDragStart={(e) => { e.dataTransfer.setData("text/plain", f.id); e.dataTransfer.effectAllowed = "move"; setDrag({ kind: "field", from: { step: i, index: j } }); }} onDragEnd={endDrag}
                        className="hidden h-10 cursor-grab items-center rounded-lg px-1 text-fg-subtle hover:bg-surface hover:text-fg active:cursor-grabbing sm:inline-flex"><GripVertical className="size-4" /></span>
                      <Input aria-label="Question" value={f.label} maxLength={200} onChange={(e) => field(i, j, { label: e.target.value })} />
                      <Select aria-label="Answer type" value={f.type} onChange={(e) => { const t = e.target.value as FieldType; field(i, j, { type: t, options: HAS_OPTIONS.includes(t) ? (f.options.length ? f.options : ["Option 1", "Option 2"]) : [] }); }}>{FIELD_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</Select>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input aria-label="Help text" placeholder="Help text (optional)" value={f.help} maxLength={200} onChange={(e) => field(i, j, { help: e.target.value })} />
                      <Input aria-label="Placeholder" placeholder="Placeholder inside the box (optional)" value={f.placeholder} maxLength={80} onChange={(e) => field(i, j, { placeholder: e.target.value })} />
                    </div>
                    {HAS_OPTIONS.includes(f.type) && <Textarea aria-label="Choices, one per line" rows={4} value={f.options.join("\n")} onChange={(e) => field(i, j, { options: e.target.value.split("\n").slice(0, 20) })} placeholder={"One choice per line"} />}
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 text-sm"><Checkbox checked={f.required} onChange={(e) => field(i, j, { required: e.target.checked })} />Required</label>
                      <label className="flex items-center gap-2 text-sm">Width <Select aria-label="Width" value={f.width} onChange={(e) => field(i, j, { width: e.target.value as "full" | "half" })} className="!h-9 !w-52"><option value="full">Full row</option><option value="half">Half row (side by side)</option></Select></label>
                      <span className="ml-auto flex gap-0.5">
                        <Button size="icon" variant="ghost" aria-label="Move question up" disabled={j === 0} onClick={() => step(i, (x) => ({ ...x, fields: move(x.fields, j, -1) }))}><ArrowUp className="size-4" /></Button>
                        <Button size="icon" variant="ghost" aria-label="Move question down" disabled={j === s.fields.length - 1} onClick={() => step(i, (x) => ({ ...x, fields: move(x.fields, j, 1) }))}><ArrowDown className="size-4" /></Button>
                        <Button size="icon" variant="ghost" aria-label="Delete question" disabled={total <= 1} onClick={() => step(i, (x) => ({ ...x, fields: x.fields.filter((_, k) => k !== j) }))}><Trash2 className="size-4" /></Button>
                      </span>
                    </div>
                  </div>
                  {j === s.fields.length - 1 && line(i, j + 1)}
                </div>
              ))}
              {!s.fields.length && <div onDragOver={(e) => { if (dragRef.current) { e.preventDefault(); setOver({ step: i, index: 0 }); } }} className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-fg-muted">{line(i, 0)}Drop a question here</div>}
              <Button size="sm" variant="outline" disabled={total >= MAX_FIELDS} onClick={() => step(i, (x) => ({ ...x, fields: [...x.fields, newField()] }))}><Plus className="size-4" />Add a question</Button>
            </div>
          ))}
          <Button variant="outline" disabled={doc.def.steps.length >= MAX_STEPS} onClick={() => def((d) => ({ ...d, steps: [...d.steps, newStep(`Step ${d.steps.length + 1}`)] }))}><Plus className="size-4" />Add a step</Button>
        </section>

        <form action={deleteFormAction.bind(null, id)} onSubmit={(e) => { if (!confirm("Delete this and all its responses? This cannot be undone.")) e.preventDefault(); }}>
          <Button type="submit" size="sm" variant="ghost" className="text-danger"><Trash2 className="size-4" />Delete</Button>
        </form>
      </div>

      <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start" aria-label="Form canvas">
        <div>
          <p className="mb-1 text-sm font-semibold">Edit right on the form</p>
          <p className="mb-2 text-xs text-fg-muted">Click a question to edit it. Drag its ⠿ handle to move it. Drag a type below onto the form to add it. Type over the question text to rename it.</p>
          {palette}
        </div>
        <div className="max-h-[80dvh] overflow-y-auto rounded-2xl border border-border">
          <FormView key={JSON.stringify(doc.def.steps.map((s) => s.id)) + doc.def.theme.style} slug={doc.slug} title={doc.title} def={doc.def} preview edit={canvas} />
        </div>
      </aside>
    </div>
  );
}

const seg = <T extends string>(value: T, options: readonly (readonly [T, string])[], on: (v: T) => void, label: string) => (
  <div role="group" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-xl bg-surface-muted p-1">
    {options.map(([k, l]) => <button key={k} type="button" aria-pressed={value === k} onClick={() => on(k)} className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${value === k ? "bg-surface shadow-sm" : "text-fg-muted hover:text-fg"}`}>{l}</button>)}
  </div>
);
const colour = (label: string, value: string, on: (v: string) => void, fallback: string) => (
  <div className="space-y-1.5"><p className="text-sm font-medium">{label}</p>
    <div className="flex items-center gap-2"><input type="color" aria-label={label} value={value || fallback} onChange={(e) => on(e.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border border-border" />
      {value ? <Button size="sm" variant="ghost" onClick={() => on("")}>Use the look&apos;s colour</Button> : <span className="text-xs text-fg-subtle">From the look</span>}</div></div>
);
const group = (title: string, children: React.ReactNode, open = false) => (
  <details open={open} className="rounded-xl border border-border p-3"><summary className="cursor-pointer text-sm font-semibold">{title}</summary><div className="mt-3 space-y-3">{children}</div></details>
);

function DesignPanel({ d, set, userId }: { d: FormDesign; set: (p: Partial<FormDesign>) => void; userId: string }) {
  const fonts = [["", "Look's font"] as const, ...FONT_KEYS.map((k) => [k, FONT_LABELS[k]] as const)];
  const fontSel = (label: string, v: string, on: (x: string) => void) => (
    <Field label={label} htmlFor={`font-${label}`}><Select id={`font-${label}`} value={v} onChange={(e) => on(e.target.value)}>{fonts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
  );
  return (
    <section className="space-y-3 rounded-2xl border border-border p-4" aria-label="Design">
      <h2 className="text-base font-semibold">Design</h2>
      <p className="text-xs text-fg-muted">Start from a look above, then change anything below. You see every change in the preview.</p>
      {group("Page background", <>
        {seg(d.bg, [["look", "From the look"], ["color", "Colour"], ["gradient", "Gradient"], ["image", "Picture"]] as const, (v) => set({ bg: v }), "Background type")}
        {(d.bg === "color" || d.bg === "gradient") && colour(d.bg === "gradient" ? "Gradient start" : "Page colour", d.pageColor, (v) => set({ pageColor: v }), "#f1f5f9")}
        {d.bg === "gradient" && colour("Gradient end", d.bgColor2, (v) => set({ bgColor2: v }), "#e2e8f0")}
        {d.bg === "image" && <>
          <Field label="Background picture" htmlFor="bgimg"><ImageField id="bgimg" userId={userId} value={d.bgImage} onChange={(v) => set({ bgImage: v })} /></Field>
          <Field label={`Darken the picture (${d.overlay}%)`} htmlFor="ov"><input id="ov" type="range" min={0} max={80} step={5} value={d.overlay} onChange={(e) => set({ overlay: Number(e.target.value) })} className="w-full" /></Field>
        </>}
      </>)}
      {group("Colours", <>
        {colour("Form card colour", d.cardColor, (v) => set({ cardColor: v }), "#ffffff")}
        {colour("Text colour", d.textColor, (v) => set({ textColor: v }), "#0f172a")}
        <p className="text-xs text-fg-muted">The brand colour (buttons, ticks, progress) is set above with the look.</p>
      </>)}
      {group("Fonts", <div className="grid gap-3 sm:grid-cols-2">{fontSel("Headings", d.headingFont, (v) => set({ headingFont: v as FormDesign["headingFont"] }))}{fontSel("Body text", d.bodyFont, (v) => set({ bodyFont: v as FormDesign["bodyFont"] }))}</div>)}
      {group("Card and layout", <>
        <div><p className="mb-1 text-sm font-medium">Form width</p>{seg(d.width, [["narrow", "Narrow"], ["medium", "Medium"], ["wide", "Wide"]] as const, (v) => set({ width: v }), "Form width")}</div>
        <div><p className="mb-1 text-sm font-medium">Card style</p>{seg(d.card, [["look", "From the look"], ["soft", "Soft"], ["flat", "Flat"], ["glass", "Glass"], ["neo", "Bold outline"], ["none", "No card"]] as const, (v) => set({ card: v }), "Card style")}</div>
        <div><p className="mb-1 text-sm font-medium">Corners</p>{seg(d.radius, [["look", "From the look"], ["none", "Square"], ["small", "Small"], ["medium", "Medium"], ["large", "Large"], ["pill", "Pill"]] as const, (v) => set({ radius: v }), "Corners")}</div>
        <div><p className="mb-1 text-sm font-medium">Shadow</p>{seg(d.shadow, [["none", "None"], ["soft", "Soft"], ["strong", "Strong"]] as const, (v) => set({ shadow: v }), "Shadow")}</div>
        <div><p className="mb-1 text-sm font-medium">Spacing</p>{seg(d.density, [["compact", "Compact"], ["comfortable", "Comfortable"], ["spacious", "Spacious"]] as const, (v) => set({ density: v }), "Spacing")}</div>
        <div><p className="mb-1 text-sm font-medium">Heading alignment</p>{seg(d.headerAlign, [["left", "Left"], ["center", "Centre"]] as const, (v) => set({ headerAlign: v }), "Heading alignment")}</div>
      </>)}
      {group("Answer boxes", <>
        <div><p className="mb-1 text-sm font-medium">Box style</p>{seg(d.fieldStyle, [["outlined", "Outlined"], ["filled", "Filled"], ["underline", "Underline"]] as const, (v) => set({ fieldStyle: v }), "Box style")}</div>
        <div><p className="mb-1 text-sm font-medium">Box size</p>{seg(d.fieldSize, [["sm", "Small"], ["md", "Medium"], ["lg", "Large"]] as const, (v) => set({ fieldSize: v }), "Box size")}</div>
      </>)}
      {group("Buttons", <>
        <div><p className="mb-1 text-sm font-medium">Style</p>{seg(d.button, [["look", "From the look"], ["solid", "Solid"], ["gradient", "Gradient"], ["outline", "Outline"]] as const, (v) => set({ button: v }), "Button style")}</div>
        <div><p className="mb-1 text-sm font-medium">Size</p>{seg(d.buttonSize, [["md", "Regular"], ["lg", "Large"]] as const, (v) => set({ buttonSize: v }), "Button size")}</div>
        <div><p className="mb-1 text-sm font-medium">Width</p>{seg(d.buttonWidth, [["auto", "Fit the text"], ["full", "Full width"]] as const, (v) => set({ buttonWidth: v }), "Button width")}</div>
        {d.buttonWidth === "auto" && <div><p className="mb-1 text-sm font-medium">Position</p>{seg(d.buttonAlign, [["left", "Left"], ["center", "Centre"], ["right", "Right"]] as const, (v) => set({ buttonAlign: v }), "Button position")}</div>}
      </>)}
      {group("Progress and logo", <>
        <div><p className="mb-1 text-sm font-medium">Progress (for forms with steps)</p>{seg(d.progress, [["bar", "Bar"], ["dots", "Numbered dots"], ["none", "Hidden"]] as const, (v) => set({ progress: v }), "Progress style")}</div>
        <Field label="Logo" htmlFor="logo"><ImageField id="logo" userId={userId} value={d.logo} onChange={(v) => set({ logo: v })} /></Field>
        {d.logo && <><div><p className="mb-1 text-sm font-medium">Logo size</p>{seg(d.logoSize, [["sm", "Small"], ["md", "Medium"], ["lg", "Large"]] as const, (v) => set({ logoSize: v }), "Logo size")}</div>
          <div><p className="mb-1 text-sm font-medium">Logo position</p>{seg(d.logoAlign, [["left", "Left"], ["center", "Centre"], ["right", "Right"]] as const, (v) => set({ logoAlign: v }), "Logo position")}</div></>}
      </>)}
    </section>
  );
}
