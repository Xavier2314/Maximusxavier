"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type DragEvent, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Check, Copy, Eye, GripVertical, Laptop, LoaderCircle, Plus, Redo2, Save, Smartphone, Sparkles, Trash2, Undo2, CopyPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { FunnelView } from "@/components/funnels/funnel-view";
import { ImageField } from "@/components/funnels/image-upload";
import {
  BLOCK_LABELS, BLOCK_TYPES, newBlock, newPage, pagePath, uid,
  type BlockType, type Funnel, type FunnelBlock, type FunnelPage, type FunnelProduct, type FunnelTheme,
} from "@/lib/funnels";
import { aiFunnelAction, deleteFunnelAction, saveFunnelAction } from "../actions";

// --- Field specs: what each block lets you edit --------------------------------------------------

type F = { key: string; label: string; kind: "text" | "area" | "url" | "image" | "bool" | "date" | "list"; hint?: string; fields?: F[]; add?: string; max?: number };
const SPEC: Record<BlockType, F[]> = {
  hero: [{ key: "headline", label: "Headline", kind: "text" }, { key: "subheadline", label: "Sub-headline", kind: "area" }, { key: "buttonText", label: "Button text", kind: "text" }, { key: "buttonLink", label: "Button link", kind: "url", hint: "#order jumps to your form" }, { key: "imageUrl", label: "Image", kind: "image" }],
  text: [{ key: "title", label: "Heading", kind: "text" }, { key: "body", label: "Text", kind: "area" }],
  benefits: [{ key: "title", label: "Heading", kind: "text" }, { key: "items", label: "Benefits", kind: "list", add: "Add benefit", max: 8, fields: [{ key: "title", label: "Title", kind: "text" }, { key: "text", label: "Description", kind: "area" }] }],
  product: [{ key: "name", label: "Product name", kind: "text" }, { key: "price", label: "Price", kind: "text" }, { key: "description", label: "Description", kind: "area" }, { key: "imageUrl", label: "Photo", kind: "image" }, { key: "buttonText", label: "Button text", kind: "text" }],
  image: [{ key: "url", label: "Image", kind: "image" }, { key: "caption", label: "Caption", kind: "text" }],
  video: [{ key: "url", label: "YouTube or Vimeo link", kind: "url" }, { key: "caption", label: "Caption", kind: "text" }],
  testimonials: [{ key: "title", label: "Heading", kind: "text" }, { key: "items", label: "Testimonials", kind: "list", add: "Add testimonial", max: 8, fields: [{ key: "name", label: "Customer name", kind: "text" }, { key: "quote", label: "What they said", kind: "area" }] }],
  faq: [{ key: "title", label: "Heading", kind: "text" }, { key: "items", label: "Questions", kind: "list", add: "Add question", max: 12, fields: [{ key: "q", label: "Question", kind: "text" }, { key: "a", label: "Answer", kind: "area" }] }],
  countdown: [{ key: "label", label: "Label", kind: "text" }, { key: "endsAt", label: "Ends at", kind: "date" }],
  lead_form: [{ key: "title", label: "Heading", kind: "text" }, { key: "text", label: "Text", kind: "area" }, { key: "buttonText", label: "Button text", kind: "text" }, { key: "successMessage", label: "Message after sending", kind: "text" }, { key: "askPhone", label: "Ask for a phone number", kind: "bool" }, { key: "askMessage", label: "Ask for a message", kind: "bool" }],
  order_form: [{ key: "title", label: "Heading", kind: "text" }, { key: "text", label: "Text", kind: "area" }, { key: "productName", label: "Product name on the order", kind: "text" }, { key: "price", label: "Price", kind: "text" }, { key: "buttonText", label: "Button text", kind: "text" }, { key: "successMessage", label: "Message after ordering", kind: "text" }],
  cta: [{ key: "headline", label: "Headline", kind: "text" }, { key: "text", label: "Text", kind: "area" }, { key: "buttonText", label: "Button text", kind: "text" }, { key: "buttonLink", label: "Button link", kind: "url", hint: "#order jumps to your form" }],
  footer: [{ key: "text", label: "Small print / disclaimer", kind: "area" }],
};

const toLocal = (iso: string) => { const d = new Date(iso); return Number.isFinite(d.getTime()) ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""; };

type Snapshot = { pages: FunnelPage[]; theme: FunnelTheme };
type Tab = "block" | "design" | "product" | "ai" | "publish";
const SUGGESTIONS = ["Make the headline punchier", "Shorten all the copy", "Add a FAQ about delivery and payment", "Make it feel more premium", "Make the tone more energetic", "Redesign the whole funnel from scratch"];

export function FunnelEditor({ funnel, userId }: { funnel: Funnel; userId: string }) {
  const [title, setTitle] = useState(funnel.title);
  const [slug, setSlug] = useState(funnel.slug);
  const [published, setPublished] = useState(funnel.published);
  const [product, setProduct] = useState<FunnelProduct>(funnel.product);
  const [theme, setTheme] = useState<FunnelTheme>(funnel.theme);
  const [pages, setPages] = useState<FunnelPage[]>(funnel.pages.length ? funnel.pages : [newPage("Landing page")]);
  const [pageIdx, setPageIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("block");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [dirty, setDirty] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, startSave] = useTransition();
  const [aiBusy, setAiBusy] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [copied, setCopied] = useState(false);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const [undo, setUndo] = useState<Snapshot[]>([]);
  const [redo, setRedo] = useState<Snapshot[]>([]);
  const origin = useRef("");
  useEffect(() => { origin.current = window.location.origin; }, []);

  const page = pages[Math.min(pageIdx, pages.length - 1)];
  const sel = page.blocks.find((b) => b.id === selected) ?? null;

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  // Every content change goes through here so it can be undone.
  function commit(nextPages: FunnelPage[], nextTheme: FunnelTheme = theme) {
    setUndo((u) => [...u.slice(-29), { pages, theme }]);
    setRedo([]);
    setPages(nextPages); setTheme(nextTheme); setDirty(true); setNote(null);
  }
  const editPage = (fn: (blocks: FunnelBlock[]) => FunnelBlock[]) => commit(pages.map((p) => (p.id === page.id ? { ...p, blocks: fn(p.blocks) } : p)));
  const patchBlock = (id: string, patch: Record<string, unknown>) => editPage((bs) => bs.map((b) => (b.id === id ? ({ ...b, ...patch } as FunnelBlock) : b)));
  function stepUndo() { const s = undo.at(-1); if (!s) return; setRedo((r) => [...r, { pages, theme }]); setUndo((u) => u.slice(0, -1)); setPages(s.pages); setTheme(s.theme); setDirty(true); }
  function stepRedo() { const s = redo.at(-1); if (!s) return; setUndo((u) => [...u, { pages, theme }]); setRedo((r) => r.slice(0, -1)); setPages(s.pages); setTheme(s.theme); setDirty(true); }

  function insert(type: BlockType, at: number) {
    const b = newBlock(type);
    editPage((bs) => [...bs.slice(0, at), b, ...bs.slice(at)]);
    setSelected(b.id); setTab("block");
  }
  function move(id: string, to: number) {
    editPage((bs) => {
      const from = bs.findIndex((b) => b.id === id);
      if (from < 0) return bs;
      const next = bs.filter((b) => b.id !== id);
      next.splice(to > from ? to - 1 : to, 0, bs[from]);
      return next;
    });
  }
  const remove = (id: string) => { editPage((bs) => bs.filter((b) => b.id !== id)); setSelected(null); };
  const duplicate = (id: string) => editPage((bs) => { const i = bs.findIndex((b) => b.id === id); const copy = { ...bs[i], id: uid() } as FunnelBlock; setSelected(copy.id); return [...bs.slice(0, i + 1), copy, ...bs.slice(i + 1)]; });

  function onDropAt(e: DragEvent, index: number) {
    e.preventDefault();
    setDropAt(null);
    try {
      const d = JSON.parse(e.dataTransfer.getData("text/plain")) as { kind: "new"; type: BlockType } | { kind: "move"; id: string };
      if (d.kind === "new" && BLOCK_TYPES.includes(d.type)) insert(d.type, index);
      else if (d.kind === "move") move(d.id, index);
    } catch { /* not ours */ }
  }

  function save() {
    startSave(async () => {
      const res = await saveFunnelAction(funnel.id, JSON.stringify({ title, slug, published, product, theme, pages }));
      setNote({ ok: Boolean(res?.ok), text: res?.message ?? "Could not save." });
      if (res?.ok) setDirty(false);
    });
  }

  async function askAi(text: string) {
    setAiBusy(true); setNote(null);
    const res = await aiFunnelAction(funnel.id, text, JSON.stringify({ pages, theme, product }));
    setAiBusy(false);
    if (!res.ok || !res.pages) { setNote({ ok: false, text: res.message }); return; }
    commit(res.pages, res.theme ?? theme);
    setPageIdx(0); setSelected(null);
    setNote({ ok: true, text: res.message });
    setInstruction("");
  }

  const wrap = (b: FunnelBlock, index: number, node: ReactNode) => {
    const on = b.id === selected;
    return (
      <div
        className={`group relative cursor-pointer outline-offset-[-2px] ${on ? "outline-2 outline-[var(--primary)]" : "hover:outline-2 hover:outline-[var(--primary)]/40"}`}
        onClick={() => { setSelected(b.id); setTab("block"); }}
        onDragOver={(e) => { e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); setDropAt(e.clientY < r.top + r.height / 2 ? index : index + 1); }}
        onDrop={(e) => onDropAt(e, e.clientY < e.currentTarget.getBoundingClientRect().top + e.currentTarget.getBoundingClientRect().height / 2 ? index : index + 1)}
      >
        {dropAt === index && <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-1 bg-[var(--primary)]" />}
        {dropAt === index + 1 && index === page.blocks.length - 1 && <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-1 bg-[var(--primary)]" />}
        {node}
        <div className={`absolute left-2 top-2 z-30 flex items-center gap-1 rounded-lg bg-[var(--primary)] p-1 text-white shadow ${on ? "" : "opacity-0 group-hover:opacity-100"}`}>
          <span draggable aria-label="Drag to move" title="Drag to move" className="cursor-grab px-1 active:cursor-grabbing"
            onDragStart={(e) => { e.dataTransfer.setData("text/plain", JSON.stringify({ kind: "move", id: b.id })); e.dataTransfer.effectAllowed = "move"; }}
            onDragEnd={() => setDropAt(null)}><GripVertical className="size-4" aria-hidden /></span>
          <span className="px-1 text-xs font-medium">{BLOCK_LABELS[b.type].label}</span>
          {on && (
            <>
              <button type="button" aria-label="Move up" disabled={index === 0} onClick={(e) => { e.stopPropagation(); move(b.id, index - 1); }} className="rounded p-1 hover:bg-white/20 disabled:opacity-40"><ArrowUp className="size-4" /></button>
              <button type="button" aria-label="Move down" disabled={index === page.blocks.length - 1} onClick={(e) => { e.stopPropagation(); move(b.id, index + 2); }} className="rounded p-1 hover:bg-white/20 disabled:opacity-40"><ArrowDown className="size-4" /></button>
              <button type="button" aria-label="Duplicate" onClick={(e) => { e.stopPropagation(); duplicate(b.id); }} className="rounded p-1 hover:bg-white/20"><CopyPlus className="size-4" /></button>
              <button type="button" aria-label="Delete block" onClick={(e) => { e.stopPropagation(); remove(b.id); }} className="rounded p-1 hover:bg-white/20"><Trash2 className="size-4" /></button>
            </>
          )}
        </div>
      </div>
    );
  };

  const liveUrl = useMemo(() => `/f/${slug}`, [slug]);
  const fullUrl = () => `${origin.current}${liveUrl}`;

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="sticky top-0 z-30 -mx-1 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface/95 px-3 py-2 shadow-sm backdrop-blur">
        <Input aria-label="Funnel name" value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} className="!h-10 max-w-64 flex-1 font-semibold" maxLength={80} />
        <span className={`text-xs ${published ? "text-success" : "text-fg-subtle"}`}>{published ? "Live" : "Draft"}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {note && <span role="status" className={`text-sm ${note.ok ? "text-success" : "text-danger"}`}>{note.text}</span>}
          {dirty && !note && <span className="text-xs text-warning">Unsaved changes</span>}
          <Button variant="ghost" size="icon" onClick={stepUndo} disabled={!undo.length} aria-label="Undo"><Undo2 className="size-4" /></Button>
          <Button variant="ghost" size="icon" onClick={stepRedo} disabled={!redo.length} aria-label="Redo"><Redo2 className="size-4" /></Button>
          {published && <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-medium hover:bg-surface-muted"><Eye className="size-4" />View live</a>}
          <Button onClick={save} disabled={saving || !dirty}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}Save</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)_330px]">
        {/* Add blocks */}
        <aside className="order-2 lg:order-1">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">Add a block</p>
          <p className="mb-2 text-xs text-fg-subtle">Drag onto the page, or tap to add after the selected block.</p>
          <ul className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {BLOCK_TYPES.map((t) => (
              <li key={t}>
                <button type="button" draggable title={BLOCK_LABELS[t].hint}
                  onDragStart={(e) => { e.dataTransfer.setData("text/plain", JSON.stringify({ kind: "new", type: t })); e.dataTransfer.effectAllowed = "copy"; }}
                  onDragEnd={() => setDropAt(null)}
                  onClick={() => insert(t, sel ? page.blocks.findIndex((b) => b.id === sel.id) + 1 : page.blocks.length)}
                  className="flex w-full cursor-grab items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-left text-sm font-medium hover:bg-surface-muted active:cursor-grabbing">
                  <Plus className="size-4 shrink-0 text-primary" aria-hidden />{BLOCK_LABELS[t].label}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Canvas */}
        <section className="order-1 min-w-0 lg:order-2">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {pages.map((p, i) => (
              <button key={p.id} type="button" onClick={() => { setPageIdx(i); setSelected(null); }}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${i === pageIdx ? "bg-primary text-primary-fg" : "bg-surface-muted text-fg-muted hover:text-fg"}`}>{i + 1}. {p.name}</button>
            ))}
            {pages.length < 6 && (
              <button type="button" onClick={() => { const p = newPage(`Page ${pages.length + 1}`, [newBlock("text")]); commit([...pages, p]); setPageIdx(pages.length); }}
                className="rounded-full border border-dashed border-border px-3 py-1.5 text-sm text-fg-muted hover:text-fg"><Plus className="mr-1 inline size-4" />Add page</button>
            )}
            <div className="ml-auto flex gap-1">
              <Button size="icon" variant={device === "desktop" ? "secondary" : "ghost"} onClick={() => setDevice("desktop")} aria-label="Desktop preview"><Laptop className="size-4" /></Button>
              <Button size="icon" variant={device === "mobile" ? "secondary" : "ghost"} onClick={() => setDevice("mobile")} aria-label="Phone preview"><Smartphone className="size-4" /></Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-[#e2e8f0] p-2 sm:p-4">
            <div className={`mx-auto overflow-hidden rounded-xl bg-white shadow-lg transition-all ${device === "mobile" ? "max-w-[390px]" : "max-w-full"}`}
              onClickCapture={(e) => { if ((e.target as HTMLElement).closest("a")) e.preventDefault(); }}
              onDragOver={(e) => { e.preventDefault(); if (e.target === e.currentTarget && dropAt === null) setDropAt(page.blocks.length); }}
              onDragLeave={(e) => { if (e.currentTarget === e.target) setDropAt(null); }}
              onDrop={(e) => onDropAt(e, page.blocks.length)}>
              {page.blocks.length === 0 ? (
                <div className="grid min-h-64 place-items-center p-8 text-center text-sm text-[#64748b]">This page is empty. Drag a block here, or tap one on the left.</div>
              ) : (
                <FunnelView slug={slug} theme={theme} page={page} preview wrapBlock={wrap} />
              )}
            </div>
          </div>
        </section>

        {/* Settings */}
        <aside className="order-3 min-w-0">
          <div className="mb-3 flex flex-wrap gap-1 rounded-xl bg-surface-muted p-1 text-sm">
            {([["block", "Block"], ["design", "Design"], ["product", "Product"], ["ai", "AI"], ["publish", "Publish"]] as [Tab, string][]).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setTab(k)} className={`flex-1 rounded-lg px-2 py-1.5 font-medium ${tab === k ? "bg-surface shadow-sm" : "text-fg-muted"}`}>{l}</button>
            ))}
          </div>
          <div className="space-y-4 rounded-2xl border border-border bg-surface p-4">
            {tab === "block" && (sel ? (
              <>
                <p className="text-sm font-semibold">{BLOCK_LABELS[sel.type].label}</p>
                {SPEC[sel.type].map((f) => <FieldEditor key={f.key} f={f} value={(sel as unknown as Record<string, unknown>)[f.key]} userId={userId} onChange={(v) => patchBlock(sel.id, { [f.key]: v })} />)}
              </>
            ) : <p className="text-sm text-fg-muted">Tap a block on the page to edit it.</p>)}

            {tab === "design" && (
              <>
                <Field label="Page name" htmlFor="pname"><Input id="pname" value={page.name} maxLength={40} onChange={(e) => commit(pages.map((p) => (p.id === page.id ? { ...p, name: e.target.value } : p)))} /></Field>
                <p className="text-xs text-fg-subtle">This page lives at {origin.current || ""}{pagePath(slug, page, pageIdx)}</p>
                {pages.length > 1 && <Button variant="outline" size="sm" onClick={() => { commit(pages.filter((p) => p.id !== page.id)); setPageIdx(0); setSelected(null); }}><Trash2 className="size-4" />Delete this page</Button>}
                <hr className="border-border" />
                <Field label="Brand colour" htmlFor="accent"><div className="flex gap-2"><input id="accent" type="color" value={theme.accent} onChange={(e) => commit(pages, { ...theme, accent: e.target.value })} className="h-11 w-14 cursor-pointer rounded-lg border border-border" /><Input value={theme.accent} onChange={(e) => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && e.target.value.length === 7 && commit(pages, { ...theme, accent: e.target.value })} aria-label="Hex colour" /></div></Field>
                <Field label="Background" htmlFor="mode"><Select id="mode" value={theme.mode} onChange={(e) => commit(pages, { ...theme, mode: e.target.value as "light" | "dark" })}><option value="light">Light</option><option value="dark">Dark</option></Select></Field>
                <Field label="Font" htmlFor="font"><Select id="font" value={theme.font} onChange={(e) => commit(pages, { ...theme, font: e.target.value as "sans" | "serif" })}><option value="sans">Modern</option><option value="serif">Classic</option></Select></Field>
              </>
            )}

            {tab === "product" && (
              <>
                <p className="text-xs text-fg-subtle">The AI reads these details when it writes or changes your pages. Keep them accurate.</p>
                <Field label="Product name" htmlFor="p-name"><Input id="p-name" value={product.name} maxLength={120} onChange={(e) => { setProduct({ ...product, name: e.target.value }); setDirty(true); }} /></Field>
                <Field label="Price" htmlFor="p-price"><Input id="p-price" value={product.price} maxLength={40} onChange={(e) => { setProduct({ ...product, price: e.target.value }); setDirty(true); }} /></Field>
                <Field label="What is it?" htmlFor="p-desc"><Textarea id="p-desc" rows={3} value={product.description} maxLength={2000} onChange={(e) => { setProduct({ ...product, description: e.target.value }); setDirty(true); }} /></Field>
                <Field label="Benefits (one per line)" htmlFor="p-ben"><Textarea id="p-ben" rows={4} value={product.benefits} maxLength={2000} onChange={(e) => { setProduct({ ...product, benefits: e.target.value }); setDirty(true); }} /></Field>
                <Field label="Who is it for?" htmlFor="p-aud"><Input id="p-aud" value={product.audience} maxLength={300} onChange={(e) => { setProduct({ ...product, audience: e.target.value }); setDirty(true); }} /></Field>
                <Field label="Offer or bonus" htmlFor="p-offer"><Input id="p-offer" value={product.offer} maxLength={400} onChange={(e) => { setProduct({ ...product, offer: e.target.value }); setDirty(true); }} /></Field>
                <Field label="Product photo" htmlFor="p-img"><ImageField id="p-img" userId={userId} value={product.imageUrl} onChange={(u) => { setProduct({ ...product, imageUrl: u }); setDirty(true); }} /></Field>
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={product.whatsapp} onChange={(e) => { setProduct({ ...product, whatsapp: e.target.checked }); setDirty(true); }} />Show a WhatsApp button after an order</label>
              </>
            )}

            {tab === "ai" && (
              <>
                <p className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-primary" />Ask AI to change your funnel</p>
                <p className="text-xs text-fg-subtle">Describe what you want. The AI keeps what you didn&apos;t mention. You can undo it.</p>
                <Textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={4} maxLength={1500} placeholder="e.g. Make the headline about saving time, and add a FAQ about delivery." />
                <Button className="w-full" disabled={aiBusy || instruction.trim().length < 3} onClick={() => askAi(instruction)}>
                  {aiBusy ? <><LoaderCircle className="size-4 animate-spin" />AI is working… (up to a minute)</> : <><Sparkles className="size-4" />Apply with AI</>}
                </Button>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s) => <button key={s} type="button" disabled={aiBusy} onClick={() => setInstruction(s === SUGGESTIONS[5] ? "Redesign the whole funnel from scratch using my product details. Keep the same goal." : s)} className="rounded-full border border-border px-2.5 py-1 text-xs text-fg-muted hover:text-fg disabled:opacity-50">{s}</button>)}
                </div>
              </>
            )}

            {tab === "publish" && (
              <>
                <Field label="Link name" htmlFor="slug" hint={`Your funnel will be at ${origin.current}/f/${slug}`}>
                  <Input id="slug" value={slug} maxLength={40} onChange={(e) => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setDirty(true); }} />
                </Field>
                <label className="flex items-center gap-2 text-sm font-medium"><Checkbox checked={published} onChange={(e) => { setPublished(e.target.checked); setDirty(true); }} />Published (anyone with the link can see it)</label>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(fullUrl()); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* blocked */ } }}>
                    {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}{copied ? "Copied" : "Copy link"}
                  </Button>
                  <a href={`/marketing/funnels/${funnel.id}/leads`} className="inline-flex h-11 items-center rounded-xl border border-border px-4 text-sm font-medium hover:bg-surface-muted">Leads &amp; orders</a>
                </div>
                <p className="text-xs text-fg-subtle">{funnel.views} views so far. Save, then share the link. Visitors never see this editor.</p>
                <hr className="border-border" />
                <form action={deleteFunnelAction.bind(null, funnel.id)} onSubmit={(e) => { if (!confirm("Delete this funnel and all its leads and orders? This cannot be undone.")) e.preventDefault(); }}>
                  <Button type="submit" variant="danger" size="sm"><Trash2 className="size-4" />Delete funnel</Button>
                </form>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

// --- Generic field editor ------------------------------------------------------------------------

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
          <div key={n} className="space-y-2 rounded-xl border border-border p-3">
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
      {f.kind === "area" ? <Textarea id={id} rows={4} value={str} onChange={(e) => onChange(e.target.value)} />
        : f.kind === "image" ? <ImageField id={id} userId={userId} value={str} onChange={onChange} />
        : f.kind === "date" ? <Input id={id} type="datetime-local" value={toLocal(str)} onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : "")} />
        : <Input id={id} value={str} inputMode={f.kind === "url" ? "url" : undefined} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  );
}
