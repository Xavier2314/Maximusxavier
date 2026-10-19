"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import {
  ArrowDown, ArrowLeft, ArrowUp, Check, Copy, CopyPlus, ExternalLink, GripVertical, Laptop, LayoutTemplate, LoaderCircle, Palette, Pencil, Plus,
  Redo2, Rocket, Smartphone, Sparkles, Trash2, Undo2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { FunnelView } from "@/components/funnels/funnel-view";
import { ImageField } from "@/components/funnels/image-upload";
import {
  BLOCK_GROUPS, BLOCK_LABELS, newBlock, newPage, pagePath, uid,
  type BlockType, type Funnel, type FunnelBlock, type FunnelPage, type FunnelProduct, type FunnelTheme,
} from "@/lib/funnels";
import { aiFunnelAction, deleteFunnelAction, duplicateFunnelAction, saveFunnelAction } from "@/app/(app)/marketing/funnels/actions";
import { DesignPanel } from "./design-panel";
import { Inspector } from "./inspector";

type Snapshot = { pages: FunnelPage[]; theme: FunnelTheme };
type Tab = "add" | "edit" | "pages" | "design" | "ai";
type Status = "saved" | "dirty" | "saving" | "error";

const SLUG_OK = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
const FUNNEL_CHIPS = ["Make the headline more powerful", "Make the writing shorter and punchier", "Add a FAQ about delivery and payment", "Make it feel more premium", "Write it for a younger audience", "Redesign the whole funnel from scratch"];
const BLOCK_CHIPS = ["Make this more persuasive", "Make this shorter", "Make this friendlier", "Give me a stronger version"];

/** Sets a value deep inside a block, e.g. ["items", 2, "title"]. */
function setPath<T>(obj: T, path: (string | number)[], value: unknown): T {
  if (!path.length) return value as T;
  const [k, ...rest] = path;
  const copy: unknown = Array.isArray(obj) ? [...obj] : { ...(obj as object) };
  (copy as Record<string | number, unknown>)[k] = setPath((obj as Record<string | number, unknown>)?.[k], rest, value);
  return copy as T;
}

export function Builder({ funnel, userId, isNew }: { funnel: Funnel; userId: string; isNew: boolean }) {
  const [title, setTitle] = useState(funnel.title);
  const [slug, setSlug] = useState(funnel.slug);
  const [published, setPublished] = useState(funnel.published);
  const [product, setProduct] = useState<FunnelProduct>(funnel.product);
  const [theme, setTheme] = useState<FunnelTheme>(funnel.theme);
  const [pages, setPages] = useState<FunnelPage[]>(funnel.pages.length ? funnel.pages : [newPage("Landing page")]);
  const [pageIdx, setPageIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>(isNew ? "design" : "add");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [status, setStatus] = useState<Status>("saved");
  const [saveMsg, setSaveMsg] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [instruction, setInstruction] = useState("");
  const [scope, setScope] = useState<"funnel" | "block">("funnel");
  const [dropAt, setDropAt] = useState<number | null>(null);
  const [undo, setUndo] = useState<Snapshot[]>([]);
  const [redo, setRedo] = useState<Snapshot[]>([]);
  const [publishOpen, setPublishOpen] = useState(false);
  const [welcome, setWelcome] = useState(isNew);
  const [copied, setCopied] = useState(false);
  const version = useRef(0);
  const origin = useRef("");
  useEffect(() => { origin.current = window.location.origin; }, []);

  const page = pages[Math.min(pageIdx, pages.length - 1)];
  const sel = page.blocks.find((b) => b.id === selected) ?? null;
  const touch = () => { version.current += 1; setStatus("dirty"); setSaveMsg(""); };

  // --- history ------------------------------------------------------------------------------------
  const commit = useCallback((nextPages: FunnelPage[], nextTheme?: FunnelTheme) => {
    setUndo((u) => [...u.slice(-39), { pages, theme }]);
    setRedo([]);
    setPages(nextPages);
    if (nextTheme) setTheme(nextTheme);
    touch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, theme]);
  const editPage = (fn: (blocks: FunnelBlock[]) => FunnelBlock[]) => commit(pages.map((p) => (p.id === page.id ? { ...p, blocks: fn(p.blocks) } : p)));
  const patchBlock = (id: string, patch: Record<string, unknown>) => editPage((bs) => bs.map((b) => (b.id === id ? ({ ...b, ...patch } as FunnelBlock) : b)));
  const stepUndo = useCallback(() => { const s = undo.at(-1); if (!s) return; setRedo((r) => [...r, { pages, theme }]); setUndo((u) => u.slice(0, -1)); setPages(s.pages); setTheme(s.theme); touch(); }, [undo, pages, theme]);
  const stepRedo = useCallback(() => { const s = redo.at(-1); if (!s) return; setUndo((u) => [...u, { pages, theme }]); setRedo((r) => r.slice(0, -1)); setPages(s.pages); setTheme(s.theme); touch(); }, [redo, pages, theme]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      e.preventDefault();
      if (e.shiftKey) stepRedo(); else stepUndo();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [stepUndo, stepRedo]);

  // --- saving (automatic) -------------------------------------------------------------------------
  const save = useCallback(async () => {
    const v = version.current;
    setStatus("saving");
    const res = await saveFunnelAction(funnel.id, JSON.stringify({ title, slug, published, product, theme, pages }));
    if (res?.ok) { if (version.current === v) setStatus("saved"); }
    else { setStatus("error"); setSaveMsg(res?.message ?? "Could not save."); }
  }, [funnel.id, title, slug, published, product, theme, pages]);

  useEffect(() => {
    if (status !== "dirty" || aiBusy) return;
    if (!SLUG_OK.test(slug)) return;
    const h = setTimeout(() => { void save(); }, 1400);
    return () => clearTimeout(h);
  }, [status, aiBusy, slug, save]);

  useEffect(() => {
    if (status !== "dirty" && status !== "saving") return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [status]);

  // --- blocks -------------------------------------------------------------------------------------
  function insert(type: BlockType, at?: number) {
    const b = newBlock(type);
    const idx = at ?? (sel ? page.blocks.findIndex((x) => x.id === sel.id) + 1 : page.blocks.length);
    editPage((bs) => [...bs.slice(0, idx), b, ...bs.slice(idx)]);
    setSelected(b.id); setTab("edit");
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
      if (d.kind === "new") insert(d.type, index); else if (d.kind === "move") move(d.id, index);
    } catch { /* not ours */ }
  }

  async function askAi(text: string, whole = false) {
    setAiBusy(true); setAiNote(null);
    const res = await aiFunnelAction(funnel.id, text, JSON.stringify({ pages, theme, product }), !whole && scope === "block" && sel ? sel.id : undefined);
    setAiBusy(false);
    if (!res.ok || !res.pages) { setAiNote({ ok: false, text: res.message }); return; }
    commit(res.pages, res.theme);
    setPageIdx(0); setSelected(null);
    setAiNote({ ok: true, text: res.message });
    setInstruction("");
  }

  // --- canvas -------------------------------------------------------------------------------------
  const wrap = (b: FunnelBlock, index: number, node: ReactNode) => {
    const on = b.id === selected;
    const half = (e: DragEvent) => { const r = e.currentTarget.getBoundingClientRect(); return e.clientY < r.top + r.height / 2 ? index : index + 1; };
    return (
      <div className={`group relative cursor-pointer ${on ? "outline-2 -outline-offset-2 outline-[#6366f1]" : "hover:outline-2 hover:-outline-offset-2 hover:outline-[#6366f1]/40"}`}
        onClick={() => { setSelected(b.id); setTab("edit"); }}
        onDragOver={(e) => { e.preventDefault(); setDropAt(half(e)); }}
        onDrop={(e) => onDropAt(e, half(e))}>
        {dropAt === index && <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-1.5 bg-[#6366f1]" />}
        {dropAt === index + 1 && index === page.blocks.length - 1 && <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-1.5 bg-[#6366f1]" />}
        {node}
        <div className={`absolute left-2 top-2 z-30 flex items-center gap-0.5 rounded-xl bg-[#4f46e5] p-1 text-white shadow-lg ${on ? "" : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"}`}>
          <span draggable title="Drag to move" className="cursor-grab px-1.5 active:cursor-grabbing"
            onDragStart={(e) => { e.dataTransfer.setData("text/plain", JSON.stringify({ kind: "move", id: b.id })); e.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => setDropAt(null)}><GripVertical className="size-4" aria-hidden /></span>
          <span className="px-1 text-xs font-semibold">{BLOCK_LABELS[b.type].label}</span>
          {on && (
            <>
              <button type="button" aria-label="Move up" disabled={index === 0} onClick={(e) => { e.stopPropagation(); move(b.id, index - 1); }} className="rounded-lg p-1.5 hover:bg-white/20 disabled:opacity-40"><ArrowUp className="size-4" /></button>
              <button type="button" aria-label="Move down" disabled={index === page.blocks.length - 1} onClick={(e) => { e.stopPropagation(); move(b.id, index + 2); }} className="rounded-lg p-1.5 hover:bg-white/20 disabled:opacity-40"><ArrowDown className="size-4" /></button>
              <button type="button" aria-label="Duplicate" onClick={(e) => { e.stopPropagation(); duplicate(b.id); }} className="rounded-lg p-1.5 hover:bg-white/20"><CopyPlus className="size-4" /></button>
              <button type="button" aria-label="Ask AI about this block" onClick={(e) => { e.stopPropagation(); setScope("block"); setTab("ai"); }} className="rounded-lg p-1.5 hover:bg-white/20"><Sparkles className="size-4" /></button>
              <button type="button" aria-label="Delete block" onClick={(e) => { e.stopPropagation(); remove(b.id); }} className="rounded-lg p-1.5 hover:bg-white/20"><Trash2 className="size-4" /></button>
            </>
          )}
        </div>
      </div>
    );
  };

  const nextPage = pages[pageIdx + 1];
  const edit = useMemo(() => ({ onText: (blockId: string, path: (string | number)[], value: string) => editPage((bs) => bs.map((b) => (b.id === blockId ? setPath(b, path, value) : b))) }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [pages, theme, pageIdx]);
  const liveUrl = `/f/${slug}`;
  const copyLink = async () => { try { await navigator.clipboard.writeText(`${origin.current}${liveUrl}`); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* blocked */ } };

  const tabs: [Tab, string, typeof Plus][] = [["add", "Add", Plus], ["edit", "Edit", Pencil], ["pages", "Pages", LayoutTemplate], ["design", "Design", Palette], ["ai", "AI", Sparkles]];

  return (
    <div className="flex h-dvh flex-col bg-bg text-fg">
      {/* Top bar */}
      <header className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-3 py-2">
        <Link href="/marketing/funnels" className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-fg-muted hover:bg-surface-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden /><span className="hidden sm:inline">Funnels</span></Link>
        <Input aria-label="Funnel name" value={title} maxLength={80} onChange={(e) => { setTitle(e.target.value); touch(); }} className="!h-9 w-40 font-semibold sm:w-56" />
        <Select aria-label="Page" value={pageIdx} onChange={(e) => { setPageIdx(Number(e.target.value)); setSelected(null); }} className="!h-9 w-36 sm:w-44">
          {pages.map((p, i) => <option key={p.id} value={i}>{i + 1}. {p.name}</option>)}
        </Select>
        <div className="hidden gap-1 sm:flex">
          <Button size="icon" variant={device === "desktop" ? "secondary" : "ghost"} onClick={() => setDevice("desktop")} aria-label="Computer view"><Laptop className="size-4" /></Button>
          <Button size="icon" variant={device === "mobile" ? "secondary" : "ghost"} onClick={() => setDevice("mobile")} aria-label="Phone view"><Smartphone className="size-4" /></Button>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span role="status" className={`mr-1 hidden text-xs sm:inline ${status === "error" ? "text-danger" : "text-fg-subtle"}`}>
            {status === "saving" ? "Saving…" : status === "dirty" ? "Unsaved…" : status === "error" ? saveMsg : <span className="inline-flex items-center gap-1"><Check className="size-3.5 text-success" />All changes saved</span>}
          </span>
          <Button size="icon" variant="ghost" onClick={stepUndo} disabled={!undo.length} aria-label="Undo"><Undo2 className="size-4" /></Button>
          <Button size="icon" variant="ghost" onClick={stepRedo} disabled={!redo.length} aria-label="Redo"><Redo2 className="size-4" /></Button>
          <a href={`/builder/${funnel.id}/preview?p=${page.slug}`} target="_blank" rel="noopener noreferrer" className="hidden h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-medium hover:bg-surface-muted sm:inline-flex"><ExternalLink className="size-4" />Preview</a>
          <Button size="sm" onClick={() => setPublishOpen(true)}><Rocket className="size-4" />{published ? "Published" : "Publish"}</Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Canvas */}
        <main className="min-h-0 flex-1 overflow-auto bg-[#e5e7eb] p-2 dark:bg-[#0b1220] sm:p-5" onClick={() => setSelected(null)}>
          <div className={`mx-auto overflow-hidden rounded-xl bg-white shadow-xl transition-all ${device === "mobile" ? "max-w-[400px]" : "max-w-[1100px]"}`}
            onClick={(e) => e.stopPropagation()}
            onClickCapture={(e) => { if ((e.target as HTMLElement).closest("a")) e.preventDefault(); }}
            onDragOver={(e) => { e.preventDefault(); if (e.target === e.currentTarget) setDropAt(page.blocks.length); }}
            onDragLeave={(e) => { if (e.currentTarget === e.target) setDropAt(null); }}
            onDrop={(e) => onDropAt(e, page.blocks.length)}>
            {page.blocks.length === 0 ? (
              <div className="grid min-h-72 place-items-center p-8 text-center text-sm text-[#64748b]">
                <div><p className="text-lg font-semibold text-[#0f172a]">This page is empty</p><p className="mt-1">Drag a block here, or open the <b>Add</b> tab and tap one.</p></div>
              </div>
            ) : (
              <FunnelView slug={slug} theme={theme} page={page} preview edit={edit} wrapBlock={wrap} nextHref={nextPage ? pagePath(slug, nextPage, pageIdx + 1) : undefined} />
            )}
            <button type="button" onClick={() => setTab("add")} className="flex w-full items-center justify-center gap-2 border-t border-dashed border-[#cbd5e1] bg-[#f8fafc] py-4 text-sm font-medium text-[#475569] hover:bg-[#eef2f7]"><Plus className="size-4" />Add a block</button>
          </div>
        </main>

        {/* Side panel */}
        <aside className="flex h-[46dvh] shrink-0 flex-col border-t border-border bg-surface lg:h-auto lg:w-[390px] lg:border-l lg:border-t-0">
          <nav className="flex shrink-0 gap-1 border-b border-border p-1.5" aria-label="Builder panels">
            {tabs.map(([k, l, Icon]) => (
              <button key={k} type="button" onClick={() => setTab(k)} className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-semibold ${tab === k ? "bg-primary-soft text-primary" : "text-fg-muted hover:bg-surface-muted"}`}><Icon className="size-4" aria-hidden />{l}</button>
            ))}
          </nav>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {tab === "add" && (
              <div className="space-y-5">
                <p className="text-xs text-fg-subtle">Tap a block to add it{sel ? " below the selected one" : ""}, or drag it onto the page.</p>
                {BLOCK_GROUPS.map((g) => (
                  <div key={g.title}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">{g.title}</p>
                    <ul className="grid grid-cols-2 gap-2">
                      {g.types.map((t) => (
                        <li key={t}>
                          <button type="button" draggable title={BLOCK_LABELS[t].hint}
                            onDragStart={(e) => { e.dataTransfer.setData("text/plain", JSON.stringify({ kind: "new", type: t })); e.dataTransfer.effectAllowed = "copy"; }} onDragEnd={() => setDropAt(null)}
                            onClick={() => insert(t)}
                            className="flex w-full cursor-grab flex-col items-start gap-1 rounded-xl border border-border bg-bg p-3 text-left hover:border-primary hover:bg-primary-soft active:cursor-grabbing">
                            <span className="text-xl" aria-hidden>{BLOCK_LABELS[t].emoji}</span>
                            <span className="text-sm font-semibold leading-tight">{BLOCK_LABELS[t].label}</span>
                            <span className="line-clamp-2 text-[11px] leading-snug text-fg-subtle">{BLOCK_LABELS[t].hint}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {tab === "edit" && (sel ? (
              <Inspector block={sel} userId={userId} onPatch={(p) => patchBlock(sel.id, p)} onDelete={() => remove(sel.id)} onDuplicate={() => duplicate(sel.id)} />
            ) : (
              <div className="space-y-3 text-sm text-fg-muted">
                <p className="text-base font-bold text-fg">Click anything on the page</p>
                <p>Click a section to select it, then change its words, pictures and layout here. You can also click any text on the page and just type.</p>
                <Button variant="outline" onClick={() => setTab("add")}><Plus className="size-4" />Add a block</Button>
              </div>
            ))}

            {tab === "pages" && (
              <div className="space-y-4">
                <p className="text-xs text-fg-subtle">A funnel is a few pages in a row. Buttons set to &ldquo;#next&rdquo; and forms move visitors to the next page.</p>
                <ol className="space-y-2">
                  {pages.map((p, i) => (
                    <li key={p.id} className={`rounded-xl border p-3 ${i === pageIdx ? "border-primary bg-primary-soft" : "border-border"}`}>
                      <div className="flex items-center gap-2">
                        <button type="button" className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-fg" onClick={() => { setPageIdx(i); setSelected(null); }} aria-label={`Open page ${i + 1}`}>{i + 1}</button>
                        <Input aria-label="Page name" value={p.name} maxLength={40} className="!h-9" onFocus={() => setPageIdx(i)} onChange={(e) => commit(pages.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)))} />
                      </div>
                      <p className="mt-1.5 truncate text-[11px] text-fg-subtle">{origin.current}{pagePath(slug, p, i)}</p>
                      <div className="mt-1.5 flex gap-1">
                        <Button size="icon" variant="ghost" disabled={i === 0} aria-label="Move earlier" onClick={() => { const a = [...pages]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; commit(a); setPageIdx(i - 1); }}><ArrowUp className="size-4" /></Button>
                        <Button size="icon" variant="ghost" disabled={i === pages.length - 1} aria-label="Move later" onClick={() => { const a = [...pages]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; commit(a); setPageIdx(i + 1); }}><ArrowDown className="size-4" /></Button>
                        <Button size="icon" variant="ghost" disabled={pages.length >= 6} aria-label="Duplicate page" onClick={() => { const c = newPage(`${p.name} copy`, p.blocks.map((b) => ({ ...b, id: uid() }) as FunnelBlock)); const a = [...pages]; a.splice(i + 1, 0, c); commit(a); setPageIdx(i + 1); }}><CopyPlus className="size-4" /></Button>
                        <Button size="icon" variant="ghost" disabled={pages.length <= 1} aria-label="Delete page" onClick={() => { if (confirm(`Delete the page “${p.name}”?`)) { commit(pages.filter((x) => x.id !== p.id)); setPageIdx(0); setSelected(null); } }}><Trash2 className="size-4" /></Button>
                      </div>
                    </li>
                  ))}
                </ol>
                {pages.length < 6 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">Add a page</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ["Blank page", () => newPage("New page", [newBlock("text")])],
                        ["Order page", () => newPage("Order", [{ ...newBlock("text"), title: "Almost there", body: "Check your order, then fill in your details below.", align: "center" } as FunnelBlock, { ...newBlock("product"), name: product.name, price: product.price, imageUrl: product.imageUrl, variant: "stacked" } as FunnelBlock, newBlock("order_form")])],
                        ["Thank-you page", () => newPage("Thank you", [{ ...newBlock("text"), title: "Thank you!", body: "We have received your details and will be in touch very soon.", align: "center", space: "roomy" } as FunnelBlock, newBlock("steps")])],
                      ].map(([label, make]) => (
                        <Button key={label as string} size="sm" variant="outline" onClick={() => { const p = (make as () => FunnelPage)(); commit([...pages, p]); setPageIdx(pages.length); setSelected(null); }}><Plus className="size-4" />{label as string}</Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "design" && <DesignPanel theme={theme} page={page} onTheme={(t) => commit(pages, t)} />}

            {tab === "ai" && (
              <div className="space-y-4">
                <p className="flex items-center gap-2 text-base font-bold"><Sparkles className="size-5 text-primary" />Your AI designer</p>
                <p className="text-sm text-fg-muted">Tell it what to change in plain words. It keeps everything you didn&apos;t mention, and you can always press Undo.</p>
                {sel && (
                  <div className="inline-flex rounded-xl bg-surface-muted p-1 text-sm">
                    {([["funnel", "Whole funnel"], ["block", `Selected: ${BLOCK_LABELS[sel.type].label}`]] as const).map(([k, l]) => (
                      <button key={k} type="button" onClick={() => setScope(k)} className={`rounded-lg px-3 py-1.5 font-medium ${scope === k ? "bg-surface shadow-sm" : "text-fg-muted"}`}>{l}</button>
                    ))}
                  </div>
                )}
                <Textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={4} maxLength={1500} placeholder="e.g. Make the headline about saving time, and add a FAQ about delivery." />
                <Button className="w-full" disabled={aiBusy || instruction.trim().length < 3} onClick={() => askAi(instruction)}>
                  {aiBusy ? <><LoaderCircle className="size-4 animate-spin" />AI is working… (up to a minute)</> : <><Sparkles className="size-4" />Apply with AI</>}
                </Button>
                {aiNote && <p role="status" className={`text-sm ${aiNote.ok ? "text-success" : "text-danger"}`}>{aiNote.text}</p>}
                <div className="flex flex-wrap gap-1.5">
                  {(scope === "block" && sel ? BLOCK_CHIPS : FUNNEL_CHIPS).map((c) => (
                    <button key={c} type="button" disabled={aiBusy} onClick={() => setInstruction(c.startsWith("Redesign") ? "Redesign the whole funnel from scratch using my product details. Keep the same look and goal." : c)}
                      className="rounded-full border border-border px-2.5 py-1 text-xs text-fg-muted hover:border-primary hover:text-fg disabled:opacity-50">{c}</button>
                  ))}
                </div>
                <details className="rounded-2xl border border-border p-3.5">
                  <summary className="cursor-pointer text-sm font-semibold">Product details the AI reads</summary>
                  <div className="mt-3 space-y-3">
                    <Field label="Product name" htmlFor="p-name"><Input id="p-name" value={product.name} maxLength={120} onChange={(e) => { setProduct({ ...product, name: e.target.value }); touch(); }} /></Field>
                    <Field label="Price" htmlFor="p-price"><Input id="p-price" value={product.price} maxLength={40} onChange={(e) => { setProduct({ ...product, price: e.target.value }); touch(); }} /></Field>
                    <Field label="What is it?" htmlFor="p-desc"><Textarea id="p-desc" rows={3} value={product.description} maxLength={2000} onChange={(e) => { setProduct({ ...product, description: e.target.value }); touch(); }} /></Field>
                    <Field label="Benefits (one per line)" htmlFor="p-ben"><Textarea id="p-ben" rows={4} value={product.benefits} maxLength={2000} onChange={(e) => { setProduct({ ...product, benefits: e.target.value }); touch(); }} /></Field>
                    <Field label="Who is it for?" htmlFor="p-aud"><Input id="p-aud" value={product.audience} maxLength={300} onChange={(e) => { setProduct({ ...product, audience: e.target.value }); touch(); }} /></Field>
                    <Field label="Offer or bonus" htmlFor="p-offer"><Input id="p-offer" value={product.offer} maxLength={400} onChange={(e) => { setProduct({ ...product, offer: e.target.value }); touch(); }} /></Field>
                    <Field label="Product photo" htmlFor="p-img"><ImageField id="p-img" userId={userId} value={product.imageUrl} onChange={(u) => { setProduct({ ...product, imageUrl: u }); touch(); }} /></Field>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={product.whatsapp} onChange={(e) => { setProduct({ ...product, whatsapp: e.target.checked }); touch(); }} />Show a WhatsApp button after an order</label>
                  </div>
                </details>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Welcome (first time after creating) */}
      {welcome && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
          <div className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-2xl">
            <p className="text-3xl" aria-hidden>🎉</p>
            <h2 id="welcome-title" className="mt-2 text-xl font-bold">Your funnel is ready</h2>
            <ul className="mt-3 space-y-2 text-sm text-fg-muted">
              <li><b className="text-fg">Click any text</b> on the page and type to change it.</li>
              <li><b className="text-fg">Click a section</b> to change its picture, layout and colours.</li>
              <li><b className="text-fg">Design tab:</b> try different looks in one tap.</li>
              <li><b className="text-fg">AI tab:</b> ask for any change in plain words.</li>
              <li><b className="text-fg">Everything saves by itself.</b> Press Publish when you love it.</li>
            </ul>
            <Button className="mt-5 w-full" onClick={() => { setWelcome(false); setTab("design"); }}>Start designing</Button>
          </div>
        </div>
      )}

      {/* Publish */}
      {publishOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="pub-title" onClick={() => setPublishOpen(false)}>
          <div className="w-full max-w-md space-y-4 rounded-3xl bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between"><h2 id="pub-title" className="text-xl font-bold">Publish your funnel</h2><Button size="icon" variant="ghost" aria-label="Close" onClick={() => setPublishOpen(false)}><X className="size-4" /></Button></div>
            <label className="flex items-center gap-3 rounded-2xl border border-border p-3.5 text-sm font-semibold">
              <Checkbox checked={published} onChange={(e) => { setPublished(e.target.checked); touch(); }} />
              {published ? "Live: anyone with the link can see it" : "Draft: only you can see it"}
            </label>
            <Field label="Your link" htmlFor="slug" hint="Letters, numbers and dashes only.">
              <div className="flex items-center gap-1.5"><span className="shrink-0 text-xs text-fg-subtle">{origin.current.replace(/^https?:\/\//, "")}/f/</span><Input id="slug" value={slug} maxLength={40} onChange={(e) => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); touch(); }} /></div>
            </Field>
            {!SLUG_OK.test(slug) && <p role="alert" className="text-sm text-danger">The link needs 3 to 40 letters, numbers or dashes.</p>}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={copyLink}>{copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}{copied ? "Copied" : "Copy link"}</Button>
              {published && <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-border px-4 text-sm font-medium hover:bg-surface-muted"><ExternalLink className="size-4" />Open</a>}
              <Link href={`/marketing/funnels/${funnel.id}/leads`} className="inline-flex h-11 items-center rounded-xl border border-border px-4 text-sm font-medium hover:bg-surface-muted">Leads &amp; orders</Link>
            </div>
            <p className="text-xs text-fg-subtle">{funnel.views} visits so far. {status === "saved" ? "All changes saved." : status === "error" ? saveMsg : "Saving…"}</p>
            <hr className="border-border" />
            <div className="flex flex-wrap gap-2">
              <form action={duplicateFunnelAction.bind(null, funnel.id)}><Button type="submit" size="sm" variant="ghost"><CopyPlus className="size-4" />Duplicate funnel</Button></form>
              <form action={deleteFunnelAction.bind(null, funnel.id)} onSubmit={(e) => { if (!confirm("Delete this funnel and all its leads and orders? This cannot be undone.")) e.preventDefault(); }}><Button type="submit" size="sm" variant="ghost" className="text-danger"><Trash2 className="size-4" />Delete funnel</Button></form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
