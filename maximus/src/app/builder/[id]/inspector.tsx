"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { ImageField } from "@/components/funnels/image-upload";
import { BLOCK_LABELS, VARIANTS, type BlockType, type FunnelBlock } from "@/lib/funnels";

type F = { key: string; label: string; kind: "text" | "area" | "url" | "image" | "bool" | "date" | "list"; hint?: string; fields?: F[]; add?: string; max?: number };
const LINK_HINT = "#order goes to the form on this page, #next goes to the next page, or paste a web link";

const SPEC: Record<BlockType, F[]> = {
  announcement: [{ key: "text", label: "Message", kind: "text" }, { key: "link", label: "Link (optional)", kind: "url", hint: LINK_HINT }],
  hero: [{ key: "badge", label: "Small label above the headline", kind: "text" }, { key: "headline", label: "Headline", kind: "area" }, { key: "subheadline", label: "Sub-headline", kind: "area" }, { key: "buttonText", label: "Button text", kind: "text" }, { key: "buttonLink", label: "Button goes to", kind: "url", hint: LINK_HINT }, { key: "imageUrl", label: "Picture", kind: "image" }],
  text: [{ key: "title", label: "Heading", kind: "text" }, { key: "body", label: "Text", kind: "area" }],
  benefits: [{ key: "title", label: "Heading", kind: "text" }, { key: "subtitle", label: "Sub-heading", kind: "text" }, { key: "items", label: "Benefits", kind: "list", add: "Add benefit", max: 9, fields: [{ key: "icon", label: "Emoji", kind: "text" }, { key: "title", label: "Title", kind: "text" }, { key: "text", label: "Description", kind: "area" }] }],
  steps: [{ key: "title", label: "Heading", kind: "text" }, { key: "items", label: "Steps", kind: "list", add: "Add step", max: 5, fields: [{ key: "title", label: "Title", kind: "text" }, { key: "text", label: "Description", kind: "area" }] }],
  product: [{ key: "name", label: "Product name", kind: "text" }, { key: "price", label: "Price", kind: "text" }, { key: "oldPrice", label: "Old price (crossed out)", kind: "text" }, { key: "description", label: "Description", kind: "area" }, { key: "points", label: "Key points (one per line)", kind: "area" }, { key: "imageUrl", label: "Photo", kind: "image" }, { key: "buttonText", label: "Button text", kind: "text" }],
  offer: [{ key: "title", label: "Heading", kind: "text" }, { key: "items", label: "What is included", kind: "list", add: "Add item", max: 10, fields: [{ key: "title", label: "Item", kind: "text" }, { key: "text", label: "Details", kind: "text" }, { key: "value", label: "Value", kind: "text" }] }, { key: "totalValue", label: "Total value (crossed out)", kind: "text" }, { key: "price", label: "Your price", kind: "text" }, { key: "buttonText", label: "Button text", kind: "text" }, { key: "note", label: "Small note", kind: "text" }],
  image: [{ key: "url", label: "Picture", kind: "image" }, { key: "caption", label: "Caption", kind: "text" }],
  video: [{ key: "url", label: "YouTube or Vimeo link", kind: "url" }, { key: "caption", label: "Caption", kind: "text" }],
  gallery: [{ key: "title", label: "Heading", kind: "text" }, { key: "items", label: "Pictures", kind: "list", add: "Add picture", max: 9, fields: [{ key: "url", label: "Picture", kind: "image" }, { key: "caption", label: "Caption", kind: "text" }] }],
  testimonials: [{ key: "title", label: "Heading", kind: "text" }, { key: "items", label: "Testimonials", kind: "list", add: "Add testimonial", max: 8, fields: [{ key: "name", label: "Customer name", kind: "text" }, { key: "role", label: "Role or place", kind: "text" }, { key: "quote", label: "What they said", kind: "area" }, { key: "imageUrl", label: "Photo", kind: "image" }] }],
  stats: [{ key: "items", label: "Numbers (use real ones only)", kind: "list", add: "Add number", max: 4, fields: [{ key: "value", label: "Number", kind: "text" }, { key: "label", label: "What it means", kind: "text" }] }],
  faq: [{ key: "title", label: "Heading", kind: "text" }, { key: "items", label: "Questions", kind: "list", add: "Add question", max: 12, fields: [{ key: "q", label: "Question", kind: "text" }, { key: "a", label: "Answer", kind: "area" }] }],
  guarantee: [{ key: "title", label: "Heading", kind: "text" }, { key: "text", label: "Your guarantee", kind: "area" }],
  about: [{ key: "title", label: "Small label", kind: "text" }, { key: "name", label: "Name", kind: "text" }, { key: "text", label: "Story", kind: "area" }, { key: "imageUrl", label: "Photo", kind: "image" }],
  countdown: [{ key: "label", label: "Label", kind: "text" }, { key: "endsAt", label: "Ends at", kind: "date" }],
  event: [{ key: "title", label: "Event name", kind: "text" }, { key: "startsAt", label: "Date and time", kind: "date" }, { key: "where", label: "Where", kind: "text" }, { key: "note", label: "Note", kind: "text" }],
  lead_form: [{ key: "title", label: "Heading", kind: "text" }, { key: "text", label: "Short text", kind: "area" }, { key: "buttonText", label: "Button text", kind: "text" }, { key: "successMessage", label: "Message after sending", kind: "text" }, { key: "askPhone", label: "Ask for a phone number", kind: "bool" }, { key: "askMessage", label: "Ask for a message", kind: "bool" }, { key: "imageUrl", label: "Picture (for the picture layout)", kind: "image" }],
  order_form: [{ key: "title", label: "Heading", kind: "text" }, { key: "text", label: "Short text", kind: "area" }, { key: "productName", label: "Product name on the order", kind: "text" }, { key: "price", label: "Price", kind: "text" }, { key: "bumpText", label: "Optional add-on offer", kind: "area", hint: "Shown as a tick box, e.g. “Add a second pack for half price”. Leave empty for none." }, { key: "bumpPrice", label: "Add-on price", kind: "text" }, { key: "buttonText", label: "Button text", kind: "text" }, { key: "successMessage", label: "Message after ordering", kind: "text" }],
  cta: [{ key: "headline", label: "Headline", kind: "text" }, { key: "text", label: "Short text", kind: "area" }, { key: "buttonText", label: "Button text", kind: "text" }, { key: "buttonLink", label: "Button goes to", kind: "url", hint: LINK_HINT }],
  button: [{ key: "text", label: "Button text", kind: "text" }, { key: "link", label: "Button goes to", kind: "url", hint: LINK_HINT }],
  spacer: [],
  footer: [{ key: "text", label: "Small print", kind: "area" }],
};

const BGS: [string, string][] = [["", "Automatic"], ["none", "Plain"], ["tint", "Soft tint"], ["accent", "Brand colour"], ["gradient", "Gradient"], ["dark", "Dark"]];
const toLocal = (iso: string) => { const d = new Date(iso); return Number.isFinite(d.getTime()) ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""; };

export function Inspector({ block, userId, onPatch, onDelete, onDuplicate }: {
  block: FunnelBlock; userId: string; onPatch: (patch: Record<string, unknown>) => void; onDelete: () => void; onDuplicate: () => void;
}) {
  const v = VARIANTS[block.type];
  const b = block as unknown as Record<string, unknown>;
  const align = block.type === "hero" || block.type === "text" || block.type === "button";
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-base font-bold"><span aria-hidden>{BLOCK_LABELS[block.type].emoji}</span>{BLOCK_LABELS[block.type].label}</p>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={onDuplicate}>Duplicate</Button>
          <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Delete block"><Trash2 className="size-4" /></Button>
        </div>
      </div>
      <p className="-mt-3 text-xs text-fg-subtle">Tip: you can also click any text on the page and type.</p>

      {SPEC[block.type].map((f) => <FieldEditor key={f.key} f={f} value={b[f.key]} userId={userId} onChange={(val) => onPatch({ [f.key]: val })} />)}

      <div className="space-y-3 rounded-2xl border border-border p-3.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">Look of this section</p>
        {v && (
          <Field label="Layout" htmlFor="lay-variant">
            <Select id="lay-variant" value={block.variant ?? v[0].key} onChange={(e) => onPatch({ variant: e.target.value })}>{v.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}</Select>
          </Field>
        )}
        {block.type !== "spacer" && block.type !== "announcement" && (
          <Field label="Background" htmlFor="lay-bg">
            <Select id="lay-bg" value={block.bg ?? ""} onChange={(e) => onPatch({ bg: e.target.value || undefined })}>{BGS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
          </Field>
        )}
        {block.type !== "spacer" && block.type !== "announcement" && (
          <Field label="Space around" htmlFor="lay-space">
            <Select id="lay-space" value={block.space ?? ""} onChange={(e) => onPatch({ space: e.target.value || undefined })}>
              <option value="">Automatic</option><option value="compact">Tight</option><option value="normal">Normal</option><option value="roomy">Roomy</option>
            </Select>
          </Field>
        )}
        {align && (
          <Field label="Align" htmlFor="lay-align">
            <Select id="lay-align" value={block.align ?? ""} onChange={(e) => onPatch({ align: e.target.value || undefined })}><option value="">Automatic</option><option value="left">Left</option><option value="center">Centered</option></Select>
          </Field>
        )}
      </div>
    </div>
  );
}

function FieldEditor({ f, value, onChange, userId }: { f: F; value: unknown; onChange: (v: unknown) => void; userId: string }) {
  const id = `f-${f.key}`;
  if (f.kind === "bool") return <label className="flex items-center gap-2 text-sm"><Checkbox checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />{f.label}</label>;
  if (f.kind === "list") {
    const items = (Array.isArray(value) ? value : []) as Record<string, string>[];
    const blank = Object.fromEntries((f.fields ?? []).map((x) => [x.key, ""]));
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium">{f.label}</p>
        {items.map((it, n) => (
          <div key={n} className="space-y-2.5 rounded-xl border border-border p-3">
            {(f.fields ?? []).map((sub) => <FieldEditor key={sub.key} f={sub} value={it[sub.key]} userId={userId} onChange={(v) => onChange(items.map((x, m) => (m === n ? { ...x, [sub.key]: v } : x)))} />)}
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" disabled={n === 0} aria-label="Move up" onClick={() => { const a = [...items]; [a[n - 1], a[n]] = [a[n], a[n - 1]]; onChange(a); }}><ArrowUp className="size-4" /></Button>
              <Button size="icon" variant="ghost" disabled={n === items.length - 1} aria-label="Move down" onClick={() => { const a = [...items]; [a[n + 1], a[n]] = [a[n], a[n + 1]]; onChange(a); }}><ArrowDown className="size-4" /></Button>
              <Button size="icon" variant="ghost" aria-label="Remove" onClick={() => onChange(items.filter((_, m) => m !== n))}><Trash2 className="size-4" /></Button>
            </div>
          </div>
        ))}
        {items.length < (f.max ?? 8) && <Button size="sm" variant="outline" onClick={() => onChange([...items, blank])}><Plus className="size-4" />{f.add ?? "Add"}</Button>}
      </div>
    );
  }
  const str = typeof value === "string" ? value : "";
  return (
    <Field label={f.label} htmlFor={id} hint={f.hint}>
      {f.kind === "area" ? <Textarea id={id} rows={3} value={str} onChange={(e) => onChange(e.target.value)} />
        : f.kind === "image" ? <ImageField id={id} userId={userId} value={str} onChange={onChange} />
        : f.kind === "date" ? <Input id={id} type="datetime-local" value={toLocal(str)} onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : "")} />
        : <Input id={id} value={str} inputMode={f.kind === "url" ? "url" : undefined} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  );
}
