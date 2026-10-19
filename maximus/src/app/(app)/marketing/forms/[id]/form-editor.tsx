"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Check, Copy, Eye, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { FormView } from "@/components/forms/form-view";
import { FIELD_TYPES, MAX_FIELDS, MAX_STEPS, newField, newStep, type FieldType, type FormDef, type FormFieldDef, type FormKind, type FormStep } from "@/lib/forms";
import { STYLES } from "@/lib/funnel-styles";
import { STYLE_KEYS, type StyleKey } from "@/lib/funnels";
import { deleteFormAction, saveFormAction } from "../actions";

type Doc = { title: string; slug: string; published: boolean; kind: FormKind; def: FormDef };
const SLUG_OK = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
const HAS_OPTIONS: FieldType[] = ["select", "radio", "checkbox"];

export function FormEditor({ id, initial }: { id: string; initial: Doc }) {
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

  const total = doc.def.steps.reduce((a, s) => a + s.fields.length, 0);
  const url = `${origin}/s/${doc.slug}`;
  const move = <T,>(a: T[], i: number, d: number) => { const b = [...a]; const j = i + d; if (j < 0 || j >= b.length) return b; [b[i], b[j]] = [b[j], b[i]]; return b; };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
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

        <section className="space-y-4" aria-label="Questions">
          <h2 className="text-base font-semibold">Questions ({total})</h2>
          {doc.def.steps.map((s, i) => (
            <div key={s.id} className="space-y-3 rounded-2xl border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-fg">{i + 1}</span>
                <Input aria-label={`Step ${i + 1} title`} value={s.title} maxLength={100} placeholder={doc.def.steps.length > 1 ? "Step title" : "Section title (optional)"} onChange={(e) => step(i, (x) => ({ ...x, title: e.target.value }))} className="min-w-0 flex-1" />
                <Button size="icon" variant="ghost" aria-label="Move step earlier" disabled={i === 0} onClick={() => def((d) => ({ ...d, steps: move(d.steps, i, -1) }))}><ArrowUp className="size-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="Move step later" disabled={i === doc.def.steps.length - 1} onClick={() => def((d) => ({ ...d, steps: move(d.steps, i, 1) }))}><ArrowDown className="size-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="Delete step" disabled={doc.def.steps.length <= 1} onClick={() => { if (confirm("Delete this step and its questions?")) def((d) => ({ ...d, steps: d.steps.filter((_, k) => k !== i) })); }}><Trash2 className="size-4" /></Button>
              </div>
              {s.fields.map((f, j) => (
                <div key={f.id} className="space-y-2.5 rounded-xl bg-surface-muted p-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_11rem]">
                    <Input aria-label="Question" value={f.label} maxLength={200} onChange={(e) => field(i, j, { label: e.target.value })} />
                    <Select aria-label="Answer type" value={f.type} onChange={(e) => { const t = e.target.value as FieldType; field(i, j, { type: t, options: HAS_OPTIONS.includes(t) ? (f.options.length ? f.options : ["Option 1", "Option 2"]) : [] }); }}>{FIELD_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</Select>
                  </div>
                  <Input aria-label="Help text" placeholder="Help text (optional)" value={f.help} maxLength={200} onChange={(e) => field(i, j, { help: e.target.value })} />
                  {HAS_OPTIONS.includes(f.type) && <Textarea aria-label="Choices, one per line" rows={4} value={f.options.join("\n")} onChange={(e) => field(i, j, { options: e.target.value.split("\n").slice(0, 20) })} placeholder={"One choice per line"} />}
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={f.required} onChange={(e) => field(i, j, { required: e.target.checked })} />Required</label>
                    <span className="ml-auto flex gap-0.5">
                      <Button size="icon" variant="ghost" aria-label="Move question up" disabled={j === 0} onClick={() => step(i, (x) => ({ ...x, fields: move(x.fields, j, -1) }))}><ArrowUp className="size-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label="Move question down" disabled={j === s.fields.length - 1} onClick={() => step(i, (x) => ({ ...x, fields: move(x.fields, j, 1) }))}><ArrowDown className="size-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label="Delete question" disabled={total <= 1} onClick={() => step(i, (x) => ({ ...x, fields: x.fields.filter((_, k) => k !== j) }))}><Trash2 className="size-4" /></Button>
                    </span>
                  </div>
                </div>
              ))}
              <Button size="sm" variant="outline" disabled={total >= MAX_FIELDS} onClick={() => step(i, (x) => ({ ...x, fields: [...x.fields, newField()] }))}><Plus className="size-4" />Add a question</Button>
            </div>
          ))}
          <Button variant="outline" disabled={doc.def.steps.length >= MAX_STEPS} onClick={() => def((d) => ({ ...d, steps: [...d.steps, newStep(`Step ${d.steps.length + 1}`)] }))}><Plus className="size-4" />Add a step</Button>
        </section>

        <form action={deleteFormAction.bind(null, id)} onSubmit={(e) => { if (!confirm("Delete this and all its responses? This cannot be undone.")) e.preventDefault(); }}>
          <Button type="submit" size="sm" variant="ghost" className="text-danger"><Trash2 className="size-4" />Delete</Button>
        </form>
      </div>

      <aside className="lg:sticky lg:top-4 lg:self-start" aria-label="Preview">
        <p className="mb-2 text-sm font-semibold">Preview</p>
        <div className="max-h-[80dvh] overflow-y-auto rounded-2xl border border-border">
          <FormView key={JSON.stringify(doc.def.steps.map((s) => s.id)) + doc.def.theme.style} slug={doc.slug} title={doc.title} def={doc.def} preview />
        </div>
      </aside>
    </div>
  );
}
