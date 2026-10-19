"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { ImageField, MultiImageField } from "@/components/funnels/image-upload";
import { effective, getNode, kindOf, type Device, type Ref } from "@/lib/funnel-doc";
import {
  BLOCK_LABELS, ELEMENT_LABELS, SOCIAL_PLATFORMS, VARIANTS, type Anim, type BlockType, type ElementType, type FunnelBlock, type FunnelColumn, type FunnelElement, type FunnelRow, type Resp,
} from "@/lib/funnels";

type Opt = [string, string][];
type F = { key: string; label: string; kind: "text" | "area" | "url" | "image" | "images" | "bool" | "date" | "list" | "select" | "number"; hint?: string; fields?: F[]; add?: string; max?: number; options?: Opt };
const LINK_HINT = "#order goes to the form, #next goes to the next page, or paste a web link, tel:+234… or mailto:…";

const BLOCK_SPEC: Record<BlockType, F[]> = {
  announcement: [{ key: "text", label: "Message", kind: "text" }, { key: "link", label: "Link (optional)", kind: "url", hint: LINK_HINT }],
  hero: [{ key: "badge", label: "Small label above the headline", kind: "text" }, { key: "headline", label: "Headline", kind: "area" }, { key: "subheadline", label: "Sub-headline", kind: "area" }, { key: "buttonText", label: "Button text", kind: "text" }, { key: "buttonLink", label: "Button goes to", kind: "url", hint: LINK_HINT }, { key: "imageUrl", label: "Picture", kind: "image" }],
  text: [{ key: "title", label: "Heading", kind: "text" }, { key: "body", label: "Text", kind: "area" }],
  benefits: [{ key: "title", label: "Heading", kind: "text" }, { key: "subtitle", label: "Sub-heading", kind: "text" }, { key: "items", label: "Benefits", kind: "list", add: "Add benefit", max: 9, fields: [{ key: "icon", label: "Emoji", kind: "text" }, { key: "title", label: "Title", kind: "text" }, { key: "text", label: "Description", kind: "area" }] }],
  steps: [{ key: "title", label: "Heading", kind: "text" }, { key: "items", label: "Steps", kind: "list", add: "Add step", max: 5, fields: [{ key: "title", label: "Title", kind: "text" }, { key: "text", label: "Description", kind: "area" }] }],
  product: [{ key: "name", label: "Product name", kind: "text" }, { key: "price", label: "Price", kind: "text" }, { key: "oldPrice", label: "Old price (crossed out)", kind: "text" }, { key: "description", label: "Description", kind: "area" }, { key: "points", label: "Key points (one per line)", kind: "area" }, { key: "imageUrl", label: "Main photo", kind: "image" }, { key: "images", label: "More photos", kind: "images", hint: "Visitors can switch between all photos." }, { key: "buttonText", label: "Button text", kind: "text" }],
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
  lead_form: [{ key: "title", label: "Heading", kind: "text" }, { key: "text", label: "Short text", kind: "area" }, { key: "buttonText", label: "Button text", kind: "text" }, { key: "successMessage", label: "Message after sending", kind: "text" }, { key: "askPhone", label: "Ask for a phone number", kind: "bool" }, { key: "askMessage", label: "Ask for a message", kind: "bool" }, { key: "fields", label: "Extra questions", kind: "list", add: "Add a question", max: 8, fields: [{ key: "label", label: "Question", kind: "text" }, { key: "type", label: "Answer type", kind: "select", options: [["text", "Short text"], ["email", "Email"], ["tel", "Phone"], ["textarea", "Long text"], ["select", "Pick one (dropdown)"], ["checkbox", "Tick box"]] }, { key: "options", label: "Choices for a dropdown (separate with commas)", kind: "text" }, { key: "required", label: "Required", kind: "bool" }] }, { key: "consent", label: "Consent tick box (optional)", kind: "text", hint: "e.g. “I agree to be contacted about my enquiry”. Visitors must tick it to send." }, { key: "imageUrl", label: "Picture (for the picture layout)", kind: "image" }],
  order_form: [{ key: "title", label: "Heading", kind: "text" }, { key: "text", label: "Short text", kind: "area" }, { key: "productName", label: "Product name on the order", kind: "text" }, { key: "price", label: "Price", kind: "text" }, { key: "bumpText", label: "Optional add-on offer", kind: "area", hint: "Shown as a tick box, e.g. “Add a second pack for half price”. Leave empty for none." }, { key: "bumpPrice", label: "Add-on price", kind: "text" }, { key: "buttonText", label: "Button text", kind: "text" }, { key: "successMessage", label: "Message after ordering", kind: "text" }],
  cta: [{ key: "headline", label: "Headline", kind: "text" }, { key: "text", label: "Short text", kind: "area" }, { key: "buttonText", label: "Button text", kind: "text" }, { key: "buttonLink", label: "Button goes to", kind: "url", hint: LINK_HINT }],
  button: [{ key: "text", label: "Button text", kind: "text" }, { key: "link", label: "Button goes to", kind: "url", hint: LINK_HINT }],
  spacer: [],
  footer: [{ key: "text", label: "Small print", kind: "area", hint: "Merge fields like {{business.name}} and {{right_now.year}} work here." }],
  section: [],
};

const SIZES: Opt = [["s", "Small"], ["m", "Medium"], ["l", "Large"]];
const ELEMENT_SPEC: Record<ElementType, F[]> = {
  heading: [{ key: "text", label: "Text", kind: "area" }, { key: "level", label: "Heading level", kind: "select", options: [["1", "H1 (page title)"], ["2", "H2"], ["3", "H3"], ["4", "H4"]] }],
  text: [{ key: "text", label: "Text", kind: "area", hint: "Merge fields like {{business.name}} work here." }],
  bullets: [{ key: "items", label: "Points (one per line)", kind: "area" }, { key: "icon", label: "Marker (an emoji or a tick)", kind: "text" }],
  button: [{ key: "text", label: "Button text", kind: "text" }, { key: "link", label: "Button goes to", kind: "url", hint: LINK_HINT }, { key: "look", label: "Look", kind: "select", options: [["solid", "Solid"], ["outline", "Outline"], ["soft", "Soft"]] }, { key: "full", label: "Full width", kind: "bool" }],
  image: [{ key: "url", label: "Picture", kind: "image" }, { key: "alt", label: "Description for screen readers (alt text)", kind: "text" }, { key: "fit", label: "Fit", kind: "select", options: [["cover", "Fill (crop)"], ["contain", "Show whole picture"]] }, { key: "ratio", label: "Shape", kind: "select", options: [["auto", "Natural"], ["1:1", "Square"], ["4:3", "4:3"], ["16:9", "Wide 16:9"], ["3:4", "Tall 3:4"]] }, { key: "radius", label: "Corners", kind: "select", options: [["none", "Square"], ["soft", "Rounded"], ["round", "Very round"]] }],
  video: [{ key: "url", label: "YouTube or Vimeo link", kind: "url" }, { key: "caption", label: "Caption", kind: "text" }],
  divider: [],
  spacer: [{ key: "size", label: "Height", kind: "select", options: SIZES }],
  icon: [{ key: "emoji", label: "Icon (an emoji)", kind: "text" }, { key: "title", label: "Title", kind: "text" }, { key: "text", label: "Text", kind: "area" }],
  social: [{ key: "items", label: "Links", kind: "list", add: "Add link", max: 8, fields: [{ key: "platform", label: "Network", kind: "select", options: SOCIAL_PLATFORMS.map((p) => [p, p] as [string, string]) }, { key: "url", label: "Link (https://…)", kind: "url" }] }],
  countdown: [{ key: "label", label: "Label", kind: "text" }, { key: "endsAt", label: "Ends at", kind: "date" }],
  progress: [{ key: "label", label: "Label", kind: "text" }, { key: "value", label: "Percent", kind: "number" }],
  faq: [{ key: "items", label: "Questions", kind: "list", add: "Add question", max: 12, fields: [{ key: "q", label: "Question", kind: "text" }, { key: "a", label: "Answer", kind: "area" }] }],
  form: [{ key: "title", label: "Heading", kind: "text" }, { key: "text", label: "Short text", kind: "area" }, { key: "buttonText", label: "Button text", kind: "text" }, { key: "successMessage", label: "Message after sending", kind: "text" }, { key: "askPhone", label: "Ask for a phone number", kind: "bool" }, { key: "askMessage", label: "Ask for a message", kind: "bool" }, { key: "fields", label: "Extra questions", kind: "list", add: "Add a question", max: 8, fields: [{ key: "label", label: "Question", kind: "text" }, { key: "type", label: "Answer type", kind: "select", options: [["text", "Short text"], ["email", "Email"], ["tel", "Phone"], ["textarea", "Long text"], ["select", "Pick one (dropdown)"], ["checkbox", "Tick box"]] }, { key: "options", label: "Choices for a dropdown (separate with commas)", kind: "text" }, { key: "required", label: "Required", kind: "bool" }] }, { key: "consent", label: "Consent tick box (optional)", kind: "text", hint: "e.g. “I agree to be contacted about my enquiry”. Visitors must tick it to send." }],
};

const BGS: Opt = [["", "Automatic"], ["none", "Plain"], ["tint", "Soft tint"], ["accent", "Brand colour"], ["gradient", "Gradient"], ["dark", "Dark"], ["custom", "Custom colour"], ["image", "Picture"]];
const toLocal = (iso: string) => { const d = new Date(iso); return Number.isFinite(d.getTime()) ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""; };
const DEVICE_LABEL: Record<Device, string> = { desktop: "Desktop", tablet: "Tablet", mobile: "Phone" };

type Tab = "general" | "styles" | "animations";
type Props = {
  blocks: FunnelBlock[]; sel: Ref; device: Device; userId: string;
  onPatch: (patch: Record<string, unknown>) => void;
  onResp: (key: keyof Resp, value: Resp[keyof Resp] | undefined) => void;
  onColumns: (n: number) => void;
  onDelete: () => void; onDuplicate: () => void; onSaveSection?: () => void;
};

export function Inspector({ blocks, sel, device, userId, onPatch, onResp, onColumns, onDelete, onDuplicate, onSaveSection }: Props) {
  const [tab, setTab] = useState<Tab>("general");
  const node = getNode(blocks, sel);
  if (!node) return <p className="text-sm text-fg-muted">Select something on the page to edit it.</p>;
  const kind = kindOf(sel);
  const rec = node as unknown as Record<string, unknown>;
  const block = kind === "block" ? (node as FunnelBlock) : null;
  const row = kind === "row" ? (node as FunnelRow) : null;
  const col = kind === "column" ? (node as FunnelColumn) : null;
  const el = kind === "element" ? (node as FunnelElement) : null;
  const title = block ? BLOCK_LABELS[block.type].label : row ? `${row.columns.length} column row` : col ? "Column" : ELEMENT_LABELS[el!.type].label;
  const spec = block ? BLOCK_SPEC[block.type] : el ? ELEMENT_SPEC[el.type] : [];
  const resp = (rec.resp ?? undefined) as FunnelBlock["resp"];
  const canResp = Boolean(block || el);
  const anim = (rec.anim as Anim | undefined) ?? "none";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-base font-bold">{title}</p>
        <div className="flex shrink-0 gap-1">
          {onSaveSection && block && <Button size="sm" variant="ghost" onClick={onSaveSection}>Save as template</Button>}
          {kind !== "column" && <Button size="sm" variant="ghost" onClick={onDuplicate}>Duplicate</Button>}
          <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Delete"><Trash2 className="size-4" /></Button>
        </div>
      </div>

      <div role="tablist" className="flex gap-1 rounded-xl bg-surface-muted p-1 text-sm" aria-label="Settings sections">
        {([["general", "General"], ["styles", "Styles"], ["animations", "Animations"]] as [Tab, string][]).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} type="button" onClick={() => setTab(k)} className={`flex-1 rounded-lg px-2 py-1.5 font-medium ${tab === k ? "bg-surface shadow-sm" : "text-fg-muted"}`}>{l}</button>
        ))}
      </div>

      {tab === "general" && (
        <div className="space-y-4">
          {row && <RowGeneral row={row} onPatch={onPatch} onColumns={onColumns} />}
          {col && <p className="text-sm text-fg-muted">A column holds elements. Add elements from the Add panel, or drag them in. Style the column in the Styles tab.</p>}
          {block?.type === "section" && <p className="text-sm text-fg-muted">A custom section is made of rows, and rows of columns. Select a row or column on the page to change it, or add a row from the Add panel.</p>}
          {spec.map((f) => <FieldEditor key={f.key} f={f} value={rec[f.key]} userId={userId} onChange={(val) => onPatch({ [f.key]: f.key === "level" ? Number(val) : val })} />)}
          {!spec.length && !row && !col && block?.type !== "section" && <p className="text-sm text-fg-muted">Nothing to edit here. Use the Styles tab.</p>}
          <p className="text-xs text-fg-subtle">Tip: click text on the page and type.</p>
        </div>
      )}

      {tab === "styles" && (
        <div className="space-y-4">
          {device !== "desktop" && canResp && (
            <div className="rounded-2xl border border-primary/40 bg-primary-soft p-3 text-xs text-fg-muted">
              <b className="text-fg">Editing for {DEVICE_LABEL[device]}.</b> Changes below only apply on {device === "tablet" ? "tablets and phones" : "phones"}; desktop stays as it is. Use the reset arrow to inherit again.
            </div>
          )}

          {block && (
            <StylesBlock block={block} device={device} userId={userId} onPatch={onPatch} />
          )}
          {row && (
            <>
              <Field label="Space between columns" htmlFor="row-gap"><Select id="row-gap" value={row.gap ?? "m"} onChange={(e) => onPatch({ gap: e.target.value })}><option value="s">Small</option><option value="m">Medium</option><option value="l">Large</option></Select></Field>
              <Field label="Stack columns on" htmlFor="row-stack" hint="When the screen is narrow, columns stack one above the other."><Select id="row-stack" value={row.stack ?? "mobile"} onChange={(e) => onPatch({ stack: e.target.value })}><option value="mobile">Phones</option><option value="tablet">Tablets and phones</option><option value="never">Never</option></Select></Field>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={Boolean(row.reverse)} onChange={(e) => onPatch({ reverse: e.target.checked || undefined })} />Show the second column first when stacked</label>
            </>
          )}
          {col && (
            <>
              <Field label="Content position" htmlFor="col-v"><Select id="col-v" value={col.vAlign ?? "top"} onChange={(e) => onPatch({ vAlign: e.target.value })}><option value="top">Top</option><option value="center">Middle</option><option value="bottom">Bottom</option></Select></Field>
              <Field label="Background" htmlFor="col-bg"><Select id="col-bg" value={col.bg ?? ""} onChange={(e) => onPatch({ bg: e.target.value || undefined })}>{BGS.filter(([k]) => k !== "image").map(([k, l]) => <option key={k} value={k}>{k === "" ? "None" : l}</option>)}</Select></Field>
              {col.bg === "custom" && <Field label="Colour" htmlFor="col-bgc"><input id="col-bgc" type="color" value={col.bgColor ?? "#ffffff"} onChange={(e) => onPatch({ bgColor: e.target.value })} className="h-11 w-full cursor-pointer rounded-xl border border-border" /></Field>}
              <Field label="Padding" htmlFor="col-pad"><Select id="col-pad" value={col.pad ?? ""} onChange={(e) => onPatch({ pad: e.target.value || undefined })}><option value="">Automatic</option><option value="compact">Small</option><option value="normal">Medium</option><option value="roomy">Large</option></Select></Field>
              <Field label="Corners" htmlFor="col-r"><Select id="col-r" value={col.radius ?? ""} onChange={(e) => onPatch({ radius: e.target.value || undefined })}><option value="">Automatic</option><option value="none">Square</option><option value="soft">Rounded</option><option value="round">Very round</option></Select></Field>
              <Field label="Shadow" htmlFor="col-s"><Select id="col-s" value={col.shadow ?? ""} onChange={(e) => onPatch({ shadow: e.target.value || undefined })}><option value="">None</option><option value="soft">Soft</option><option value="strong">Strong</option></Select></Field>
            </>
          )}
          {el && (
            <Field label="Align" htmlFor="el-al"><Select id="el-al" value={el.align ?? ""} onChange={(e) => onPatch({ align: e.target.value || undefined })}><option value="">Automatic</option><option value="left">Left</option><option value="center">Centered</option></Select></Field>
          )}

          {canResp && (
            <ResponsiveControls device={device} resp={resp} isBlock={Boolean(block)} onResp={onResp} />
          )}
        </div>
      )}

      {tab === "animations" && (
        canResp ? (
          <div className="space-y-4">
            <Field label="Entrance animation" htmlFor="anim" hint="Plays once when this scrolls into view. It is switched off for visitors who prefer reduced motion, and for the builder canvas.">
              <Select id="anim" value={anim} onChange={(e) => onPatch({ anim: e.target.value === "none" ? undefined : e.target.value })}>
                <option value="none">None</option><option value="fade">Fade in</option><option value="up">Rise up</option><option value="left">Slide from the left</option><option value="right">Slide from the right</option><option value="zoom">Zoom in</option>
              </Select>
            </Field>
          </div>
        ) : <p className="text-sm text-fg-muted">Animations can be set on sections and elements.</p>
      )}
    </div>
  );
}

function RowGeneral({ row, onPatch, onColumns }: { row: FunnelRow; onPatch: (p: Record<string, unknown>) => void; onColumns: (n: number) => void }) {
  const n = row.columns.length;
  const widths: Record<number, Opt> = { 2: [["", "Equal"], ["1fr 2fr", "Narrow + wide"], ["2fr 1fr", "Wide + narrow"]], 3: [["", "Equal"], ["1fr 2fr 1fr", "Wide middle"]] };
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium">Columns</p>
        <div className="grid grid-cols-6 gap-1.5">
          {[1, 2, 3, 4, 5, 6].map((c) => <button key={c} type="button" onClick={() => onColumns(c)} aria-pressed={c === n} className={`rounded-lg border py-2 text-sm font-semibold ${c === n ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-surface-muted"}`}>{c}</button>)}
        </div>
        <p className="mt-1.5 text-xs text-fg-subtle">Reducing columns moves their content into the last column. Nothing is deleted.</p>
      </div>
      {widths[n] && (
        <Field label="Column widths" htmlFor="row-w"><Select id="row-w" value={row.widths ?? ""} onChange={(e) => onPatch({ widths: e.target.value || undefined })}>{widths[n].map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
      )}
    </div>
  );
}

function StylesBlock({ block, onPatch, userId }: { block: FunnelBlock; device: Device; userId: string; onPatch: (p: Record<string, unknown>) => void }) {
  const v = VARIANTS[block.type];
  const align = ["hero", "text", "button", "section"].includes(block.type);
  if (block.type === "spacer") return <p className="text-sm text-fg-muted">A spacer only needs its Responsive size, below.</p>;
  return (
    <div className="space-y-4">
      {v && <Field label="Layout" htmlFor="lay-variant"><Select id="lay-variant" value={block.variant ?? v[0].key} onChange={(e) => onPatch({ variant: e.target.value })}>{v.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}</Select></Field>}
      {block.type !== "announcement" && (
        <>
          <Field label="Background" htmlFor="lay-bg"><Select id="lay-bg" value={block.bg ?? ""} onChange={(e) => onPatch({ bg: e.target.value || undefined })}>{BGS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
          {block.bg === "custom" && <Field label="Colour" htmlFor="lay-bgc"><input id="lay-bgc" type="color" value={block.bgColor ?? "#ffffff"} onChange={(e) => onPatch({ bgColor: e.target.value })} className="h-11 w-full cursor-pointer rounded-xl border border-border" /></Field>}
          {block.bg === "image" && <Field label="Background picture" htmlFor="lay-bgi" hint="A dark overlay keeps text readable."><ImageField id="lay-bgi" userId={userId} value={block.bgImage ?? ""} onChange={(u) => onPatch({ bgImage: u || undefined })} /></Field>}
          <Field label="Space above and below" htmlFor="lay-space"><Select id="lay-space" value={block.space ?? ""} onChange={(e) => onPatch({ space: e.target.value || undefined })}><option value="">Automatic</option><option value="compact">Tight</option><option value="normal">Normal</option><option value="roomy">Roomy</option></Select></Field>
        </>
      )}
      {align && <Field label="Align" htmlFor="lay-align"><Select id="lay-align" value={block.align ?? ""} onChange={(e) => onPatch({ align: e.target.value || undefined })}><option value="">Automatic</option><option value="left">Left</option><option value="center">Centered</option></Select></Field>}
      <Field label="Name (shown in Layers)" htmlFor="lay-name"><Input id="lay-name" value={block.name ?? ""} maxLength={60} onChange={(e) => onPatch({ name: e.target.value || undefined })} placeholder={BLOCK_LABELS[block.type].label} /></Field>
    </div>
  );
}

function ResponsiveControls({ device, resp, isBlock, onResp }: { device: Device; resp: FunnelBlock["resp"]; isBlock: boolean; onResp: (key: keyof Resp, value: Resp[keyof Resp] | undefined) => void }) {
  const d = device;
  if (d === "desktop") {
    return <p className="rounded-2xl bg-surface-muted p-3 text-xs text-fg-muted">Switch the canvas to Tablet or Phone at the top to hide this, resize its spacing, or scale its content on smaller screens. Desktop is never changed by those edits.</p>;
  }
  const hid = effective(resp, d, "hidden"), spc = effective(resp, d, "space"), scl = effective(resp, d, "scale");
  const Reset = ({ own, k }: { own: boolean; k: keyof Resp }) => own ? <button type="button" aria-label="Reset to inherit" title="Reset to inherit" onClick={() => onResp(k, undefined)} className="inline-flex items-center gap-1 text-xs text-primary"><RotateCcw className="size-3.5" />Reset</button> : <span className="text-[11px] text-fg-subtle">inherited</span>;
  return (
    <div className="space-y-4 rounded-2xl border border-border p-3.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">{DEVICE_LABEL[d]} overrides</p>
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={Boolean(hid.value)} onChange={(e) => onResp("hidden", e.target.checked ? true : undefined)} />Hide on {d === "tablet" ? "tablets and phones" : "phones"}</label>
        <Reset own={hid.own} k="hidden" />
      </div>
      {isBlock && (
        <>
          <div>
            <div className="mb-1.5 flex items-center justify-between"><span className="text-sm font-medium">Space above and below</span><Reset own={spc.own} k="space" /></div>
            <Select aria-label="Space above and below on this device" value={spc.value ?? ""} onChange={(e) => onResp("space", (e.target.value || undefined) as Resp["space"])}><option value="">Same as {d === "mobile" ? "tablet" : "desktop"}</option><option value="compact">Tight</option><option value="normal">Normal</option><option value="roomy">Roomy</option></Select>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between"><span className="text-sm font-medium">Content size: {scl.value ?? 100}%</span><Reset own={scl.own} k="scale" /></div>
            <input type="range" min={60} max={130} step={5} value={scl.value ?? 100} onChange={(e) => onResp("scale", Number(e.target.value) === 100 ? undefined : Number(e.target.value))} aria-label="Content size on this device" className="w-full accent-[var(--primary)]" />
          </div>
        </>
      )}
    </div>
  );
}

function FieldEditor({ f, value, onChange, userId }: { f: F; value: unknown; onChange: (v: unknown) => void; userId: string }) {
  const id = `f-${f.key}`;
  if (f.kind === "bool") return <label className="flex items-center gap-2 text-sm"><Checkbox checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />{f.label}</label>;
  if (f.kind === "images") return <Field label={f.label} htmlFor={id} hint={f.hint}><MultiImageField id={id} userId={userId} values={(Array.isArray(value) ? value : []) as string[]} onChange={onChange} /></Field>;
  if (f.kind === "list") {
    const items = (Array.isArray(value) ? value : []) as Record<string, string>[];
    const blank = Object.fromEntries((f.fields ?? []).map((x) => [x.key, x.kind === "select" ? x.options?.[0]?.[0] ?? "" : ""]));
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
  const str = typeof value === "string" ? value : value === undefined || value === null ? "" : String(value);
  return (
    <Field label={f.label} htmlFor={id} hint={f.hint}>
      {f.kind === "area" ? <Textarea id={id} rows={3} value={str} onChange={(e) => onChange(e.target.value)} />
        : f.kind === "image" ? <ImageField id={id} userId={userId} value={str} onChange={onChange} />
        : f.kind === "date" ? <Input id={id} type="datetime-local" value={toLocal(str)} onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : "")} />
        : f.kind === "select" ? <Select id={id} value={str} onChange={(e) => onChange(e.target.value)}>{(f.options ?? []).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
        : f.kind === "number" ? <Input id={id} type="number" min={0} max={100} value={str} onChange={(e) => onChange(Number(e.target.value))} />
        : <Input id={id} value={str} inputMode={f.kind === "url" ? "url" : undefined} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  );
}
