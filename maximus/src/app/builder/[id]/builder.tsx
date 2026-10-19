"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import {
  ArrowDown, ArrowLeft, ArrowUp, Check, ChevronRight, Copy, CopyPlus, Eye, GripVertical, History, Laptop, Layers, LayoutTemplate, LoaderCircle, Palette, Plus, Redo2, Rocket, Smartphone, Sparkles, Tablet, Trash2, Undo2, X,
} from "lucide-react";
import {
  aiFunnelAction, createVersionAction, deleteFunnelAction, duplicateFunnelAction, listVersionsAction, publishFunnelAction, restoreVersionAction, rollbackLiveAction, saveAsCopyAction, saveFunnelAction, unpublishFunnelAction,
  type VersionRow,
} from "@/app/(app)/marketing/funnels/actions";
import { deleteSavedSectionAction, listSavedSectionsAction, saveSectionAction, type SavedSection } from "@/app/(app)/marketing/funnels/library-actions";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { FunnelView, type NodeKind } from "@/components/funnels/funnel-view";
import { ImageField, MultiImageField } from "@/components/funnels/image-upload";
import {
  copyNode, crumbs, reidentify, deleteNode, duplicateNode, getNode, insertBlock, insertElement, insertRow, kindOf, moveNode, nudge, parentRef, pasteNode, sameRef, sectionWith, setColumnCount, setResp, updateNode,
  type Clip, type Device, type Ref,
} from "@/lib/funnel-doc";
import { PREBUILT } from "@/lib/funnel-templates";
import {
  BLOCK_LABELS, ELEMENT_LABELS, cleanPages, cleanProduct, cleanTheme, newBlock, newElement, newPage, newRow, pagePath, uid,
  type Funnel, type FunnelBlock, type FunnelPage, type FunnelProduct, type FunnelTheme, type Resp,
} from "@/lib/funnels";
import { DesignPanel } from "./design-panel";
import { Inspector } from "./inspector";
import { LayersPanel } from "./layers-panel";
import { QuickAdd, type Payload } from "./quick-add";

type Snapshot = { pages: FunnelPage[]; theme: FunnelTheme };
type Panel = "add" | "layers" | "pages" | "design" | "ai" | "edit";
type Status = "saved" | "dirty" | "saving" | "error";
type Pos = "before" | "after" | "inside";
type Mark = { kind: NodeKind; ref: Ref; pos: Pos };
type Target =
  | { k: "blockIndex"; index: number }
  | { k: "wrap"; index: number }
  | { k: "rowIn"; block: string; index: number }
  | { k: "column"; block: string; row: string; col: string; index: number };

const SLUG_OK = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
const FUNNEL_CHIPS = ["Make the headline more powerful", "Make the writing shorter and punchier", "Add a FAQ about delivery and payment", "Make it feel more premium", "Write it for a younger audience", "Redesign the whole funnel from scratch"];
const BLOCK_CHIPS = ["Make this more persuasive", "Make this shorter", "Make this friendlier", "Give me a stronger version"];
const WIDTH: Record<Device, string> = { desktop: "100%", tablet: "768px", mobile: "390px" };

/** Sets a value deep inside a block, e.g. ["rows", 0, "columns", 1, "elements", 0, "text"]. */
function setPath<T>(obj: T, path: (string | number)[], value: unknown): T {
  if (!path.length) return value as T;
  const [k, ...rest] = path;
  const copy: unknown = Array.isArray(obj) ? [...obj] : { ...(obj as object) };
  (copy as Record<string | number, unknown>)[k] = setPath((obj as Record<string | number, unknown>)?.[k], rest, value);
  return copy as T;
}

const levelOf = (p: Payload | null): "block" | "row" | "element" | null => {
  if (!p) return null;
  if (p.t === "block" || p.t === "prebuilt" || p.t === "saved") return "block";
  if (p.t === "row") return "row";
  if (p.t === "element") return "element";
  const k = kindOf(p.ref);
  return k === "block" ? "block" : k === "row" ? "row" : k === "element" ? "element" : null;
};

export function Builder({ funnel, userId, isNew }: { funnel: Funnel; userId: string; isNew: boolean }) {
  const [title, setTitle] = useState(funnel.title);
  const [slug, setSlug] = useState(funnel.slug);
  const [published, setPublished] = useState(funnel.published);
  const [product, setProduct] = useState<FunnelProduct>(funnel.product);
  const [theme, setTheme] = useState<FunnelTheme>(funnel.theme);
  const [pages, setPages] = useState<FunnelPage[]>(funnel.pages.length ? funnel.pages : [newPage("Landing page")]);
  const [pageIdx, setPageIdx] = useState(0);
  const [sel, setSel] = useState<Ref | null>(null);
  const [hover, setHover] = useState<Ref | null>(null);
  const [panel, setPanel] = useState<Panel>(isNew ? "design" : "add");
  const [device, setDevice] = useState<Device>("desktop");
  const [zoom, setZoom] = useState(100);
  const [status, setStatus] = useState<Status>("saved");
  const [saveMsg, setSaveMsg] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [instruction, setInstruction] = useState("");
  const [scope, setScope] = useState<"funnel" | "block">("funnel");
  const [mark, setMark] = useState<Mark | null>(null);
  const [undo, setUndo] = useState<Snapshot[]>([]);
  const [redo, setRedo] = useState<Snapshot[]>([]);
  const [clip, setClip] = useState<Clip | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [domainOpen, setDomainOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [welcome, setWelcome] = useState(isNew);
  const [copied, setCopied] = useState(false);
  const version = useRef(0);
  const baseVer = useRef<string>(funnel.updated_at);
  const [conflict, setConflict] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<VersionRow[] | null>(null);
  const [versionLabel, setVersionLabel] = useState("");
  const [histMsg, setHistMsg] = useState("");
  const [pubMsg, setPubMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [liveAt, setLiveAt] = useState<string | null>(funnel.live_at);
  // Edits made since the last publish. Starts true when the draft was saved after the live copy.
  const [unpublished, setUnpublished] = useState(!!funnel.live_at && Date.parse(funnel.updated_at) - Date.parse(funnel.live_at) > 2000);
  const [recover, setRecover] = useState<string | null>(null);
  const pendingKey = `funnel-pending-${funnel.id}`;
  const [saved, setSaved] = useState<SavedSection[]>([]);
  useEffect(() => { void listSavedSectionsAction().then(setSaved, () => undefined); }, []);
  const removeSaved = async (sid: string) => { if (await deleteSavedSectionAction(sid)) setSaved((l) => l.filter((x) => x.id !== sid)); };
  const origin = useRef("");
  const dragRef = useRef<Payload | null>(null);
  useEffect(() => { origin.current = window.location.origin; }, []);

  const page = pages[Math.min(pageIdx, pages.length - 1)];
  const blocks = page.blocks;
  const selNode = sel ? getNode(blocks, sel) : null;
  const selBlock = sel ? blocks.find((b) => b.id === sel.block) ?? null : null;
  const touch = () => { version.current += 1; setStatus("dirty"); setSaveMsg(""); setUnpublished(true); };

  // --- history ------------------------------------------------------------------------------------
  const commit = useCallback((nextPages: FunnelPage[], nextTheme?: FunnelTheme) => {
    setUndo((u) => [...u.slice(-49), { pages, theme }]);
    setRedo([]);
    setPages(nextPages);
    if (nextTheme) setTheme(nextTheme);
    touch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, theme]);
  const editBlocks = (fn: (b: FunnelBlock[]) => FunnelBlock[]) => commit(pages.map((p) => (p.id === page.id ? { ...p, blocks: fn(p.blocks) } : p)));
  const stepUndo = useCallback(() => { const s = undo.at(-1); if (!s) return; setRedo((r) => [...r, { pages, theme }]); setUndo((u) => u.slice(0, -1)); setPages(s.pages); setTheme(s.theme); setSel(null); touch(); }, [undo, pages, theme]);
  const stepRedo = useCallback(() => { const s = redo.at(-1); if (!s) return; setUndo((u) => [...u, { pages, theme }]); setRedo((r) => r.slice(0, -1)); setPages(s.pages); setTheme(s.theme); setSel(null); touch(); }, [redo, pages, theme]);

  // --- saving (automatic) -------------------------------------------------------------------------
  const save = useCallback(async () => {
    const v = version.current;
    setStatus("saving");
    try {
      const res = await saveFunnelAction(funnel.id, JSON.stringify({ title, slug, product, theme, pages }), baseVer.current);
      if (res?.ok) {
        if (res.version) baseVer.current = res.version;
        if (version.current === v) { setStatus("saved"); try { localStorage.removeItem(pendingKey); } catch { /* storage unavailable */ } }
      } else if (res?.conflict) { setConflict(true); setStatus("error"); setSaveMsg("Changed somewhere else"); }
      else { setStatus("error"); setSaveMsg(res?.message ?? "Could not save."); }
    } catch {
      setStatus("error"); setSaveMsg("Could not reach the server. Your edits are still here; we will retry when you change something.");
    }
  }, [funnel.id, title, slug, product, theme, pages, pendingKey]);
  useEffect(() => {
    if (status !== "dirty" || aiBusy || conflict || !SLUG_OK.test(slug)) return;
    const h = setTimeout(() => { void save(); }, 1400);
    return () => clearTimeout(h);
  }, [status, aiBusy, conflict, slug, save]);

  // Local safety copy: if the browser closes or the network drops, unsaved edits can be recovered on reopening.
  const payload = () => JSON.stringify({ title, slug, product, theme, pages });
  useEffect(() => {
    if (status === "saved") return;
    const h = setTimeout(() => { try { localStorage.setItem(pendingKey, JSON.stringify({ at: Date.now(), payload: payload() })); } catch { /* storage unavailable */ } }, 700);
    return () => clearTimeout(h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, title, slug, product, theme, pages, pendingKey]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(pendingKey);
      if (!raw) return;
      const o = JSON.parse(raw) as { at: number; payload: string };
      if (o.at > Date.parse(funnel.updated_at) && o.payload !== payload()) setRecover(o.payload); else localStorage.removeItem(pendingKey);
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const applyDoc = (d: { title?: string; theme?: unknown; product?: unknown; pages?: unknown }) => {
    const cp = cleanPages(d.pages);
    if (!cp.length) return;
    setUndo((u) => [...u.slice(-49), { pages, theme }]); setRedo([]);
    setPages(cp); setTheme(cleanTheme(d.theme)); setProduct(cleanProduct(d.product)); if (d.title) setTitle(String(d.title).slice(0, 80));
    setSel(null); setPageIdx(0);
  };
  const recoverEdits = () => { if (!recover) return; try { applyDoc(JSON.parse(recover)); touch(); } catch { /* ignore */ } setRecover(null); };
  const dismissRecover = () => { try { localStorage.removeItem(pendingKey); } catch { /* ignore */ } setRecover(null); };

  const saveSection = async () => {
    if (!selBlock) return;
    const name = window.prompt("Name this section so you can find it later", BLOCK_LABELS[selBlock.type]?.label ?? "My section");
    if (!name) return;
    const r = await saveSectionAction(name, JSON.stringify(selBlock));
    if (r.ok && r.saved) { setSaved((l) => [r.saved!, ...l]); setPanel("add"); setAiNote({ ok: true, text: `Saved “${name}”. Find it under Add → Saved.` }); }
    else setAiNote({ ok: false, text: r.message });
  };
  const exportJson = () => {
    const doc = { format: "maximus-funnel", version: 1, exportedAt: new Date().toISOString(), title, theme, product, pages };
    const url = URL.createObjectURL(new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = `${slug || "funnel"}.funnel.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importJson = async (file: File | undefined) => {
    if (!file) return;
    setPubMsg("");
    try {
      if (file.size > 600_000) throw new Error("That file is too large to be a funnel (over 600 KB).");
      const doc = JSON.parse(await file.text()) as { format?: string; title?: string; theme?: unknown; product?: unknown; pages?: unknown };
      if (doc.format !== "maximus-funnel") throw new Error("This is not a funnel file exported from this builder.");
      const cp = cleanPages(doc.pages);
      if (!cp.length) throw new Error("The file has no pages in it.");
      if (!confirm(`Replace this funnel's pages, design and product details with the ${cp.length} page${cp.length === 1 ? "" : "s"} in this file? You can press Undo afterwards.`)) return;
      applyDoc({ ...doc, pages: cp }); touch();
      setPubMsg("Imported. Check it over, then publish when you are ready.");
    } catch (e) { setPubMsg((e as Error).message || "That file could not be read."); }
  };

  // --- publishing and history ---------------------------------------------------------------------
  const publish = async () => {
    setBusy(true); setPubMsg("");
    if (status === "dirty" || status === "error") await save();
    const r = await publishFunnelAction(funnel.id);
    setBusy(false);
    setPubMsg(r.message);
    if (r.ok) { setPublished(true); setLiveAt(r.liveAt ?? null); setUnpublished(false); if (r.version) baseVer.current = r.version; setVersions(null); }
  };
  const unpublish = async () => {
    setBusy(true); setPubMsg("");
    const r = await unpublishFunnelAction(funnel.id);
    setBusy(false); setPubMsg(r.message);
    if (r.ok) { setPublished(false); if (r.version) baseVer.current = r.version; }
  };
  const loadVersions = async () => { setVersions(await listVersionsAction(funnel.id)); };
  const openHistory = () => { setHistoryOpen(true); setHistMsg(""); void loadVersions(); };
  const saveVersion = async () => {
    setBusy(true); if (status === "dirty") await save();
    const r = await createVersionAction(funnel.id, versionLabel);
    setBusy(false); setHistMsg(r.message); if (r.ok) { setVersionLabel(""); void loadVersions(); }
  };
  const restore = async (vid: string) => {
    if (!confirm("Put this version into your draft? Your current draft is saved in the history first.")) return;
    setBusy(true);
    const r = await restoreVersionAction(funnel.id, vid);
    setBusy(false); setHistMsg(r.message);
    if (r.ok && r.snapshot) { applyDoc(r.snapshot); if (r.version) baseVer.current = r.version; setStatus("saved"); setUnpublished(true); void loadVersions(); }
  };
  const rollback = async (vid: string) => {
    if (!confirm("Make this version live again? Visitors will see it straight away. Your draft is not changed.")) return;
    setBusy(true);
    const r = await rollbackLiveAction(funnel.id, vid);
    setBusy(false); setHistMsg(r.message);
    if (r.ok) { setPublished(true); setLiveAt(r.liveAt ?? null); setUnpublished(true); void loadVersions(); }
  };
  const reloadLatest = () => { window.location.reload(); };
  const keepMine = async () => {
    // Saving without a base version overwrites the newer copy on purpose; the member chose to keep their own edits.
    const r = await saveFunnelAction(funnel.id, payload(), null);
    if (r.ok) { if (r.version) baseVer.current = r.version; setConflict(false); setStatus("saved"); setSaveMsg(""); } else setSaveMsg(r.message);
  };
  const copyMine = async () => {
    const r = await saveAsCopyAction(funnel.id, payload());
    if (r.ok && r.id) window.location.href = `/builder/${r.id}`; else setSaveMsg(r.message);
  };
  useEffect(() => {
    if (status !== "dirty" && status !== "saving") return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [status]);

  // --- selection + editing the selected node ------------------------------------------------------
  const select = (r: Ref | null) => { setSel(r); if (r && window.matchMedia("(max-width: 1023px)").matches) setPanel("edit"); };
  const isLocked = (r: Ref | null) => Boolean(r && blocks.find((b) => b.id === r.block)?.locked);
  const patchSel = (patch: Record<string, unknown>) => { if (sel) editBlocks((bs) => updateNode(bs, sel, patch)); };
  const respSel = (key: keyof Resp, value: Resp[keyof Resp] | undefined) => { if (sel && device !== "desktop") editBlocks((bs) => setResp(bs, sel, device, key, value)); };
  const deleteSel = () => {
    if (!sel || isLocked(sel)) return;
    if (kindOf(sel) === "column") { const row = (getNode(blocks, { block: sel.block, row: sel.row }) as { columns: unknown[] } | null); if (!row || row.columns.length < 2) return; }
    const up = parentRef(sel);
    editBlocks((bs) => deleteNode(bs, sel));
    setSel(up);
  };
  const duplicateSel = () => { if (!sel || kindOf(sel) === "column") return; const out = duplicateNode(blocks, sel); editBlocks(() => out.blocks); setSel(out.ref); };
  const nudgeSel = (d: -1 | 1) => { if (!sel || isLocked(sel)) return; const out = nudge(blocks, sel, d); if (out) { editBlocks(() => out.blocks); setSel(out.ref); } };
  const copySel = () => { if (sel) setClip(copyNode(blocks, sel)); };
  const pasteClip = () => { if (!clip) return; const out = pasteNode(blocks, clip, sel); if (out) { editBlocks(() => out.blocks); setSel(out.ref); } };
  const toggleHidden = (r: Ref) => {
    if (device === "desktop") return;
    const n = getNode(blocks, r) as { resp?: FunnelBlock["resp"] } | null;
    const cur = n?.resp?.[device]?.hidden === true;
    editBlocks((bs) => setResp(bs, r, device, "hidden", cur ? undefined : true));
  };
  const toggleLock = (blockId: string) => editBlocks((bs) => bs.map((b) => (b.id === blockId ? { ...b, locked: b.locked ? undefined : true } : b)));

  // --- adding things (click or drop) --------------------------------------------------------------
  const bIndex = (id: string) => blocks.findIndex((b) => b.id === id);
  function defaultTarget(p: Payload): Target | null {
    const lvl = levelOf(p);
    const here = sel ? blocks.find((b) => b.id === sel.block) : null;
    const after = here ? bIndex(here.id) + 1 : blocks.length;
    if (lvl === "block") return { k: "blockIndex", index: after };
    if (lvl === "row") {
      if (here?.type === "section") { const ri = sel?.row ? here.rows.findIndex((r) => r.id === sel.row) + 1 : here.rows.length; return { k: "rowIn", block: here.id, index: ri }; }
      return { k: "wrap", index: after };
    }
    if (lvl === "element") {
      if (here?.type === "section") {
        const row = (sel?.row ? here.rows.find((r) => r.id === sel.row) : here.rows.at(-1)) ?? here.rows.at(-1);
        if (!row) return { k: "wrap", index: after };
        const col = (sel?.col ? row.columns.find((c) => c.id === sel.col) : row.columns[0]) ?? row.columns[0];
        const at = sel?.el ? col.elements.findIndex((e) => e.id === sel.el) + 1 : col.elements.length;
        return { k: "column", block: here.id, row: row.id, col: col.id, index: at };
      }
      return { k: "wrap", index: after };
    }
    return null;
  }
  function markToTarget(m: Mark, p: Payload): Target | null {
    const lvl = levelOf(p);
    const b = blocks.find((x) => x.id === m.ref.block);
    if (!b) return null;
    const after = m.pos === "after" ? 1 : 0;
    if (m.kind === "block") {
      if (lvl === "block") return { k: "blockIndex", index: bIndex(b.id) + after };
      if (lvl === "row") return b.type === "section" ? { k: "rowIn", block: b.id, index: b.rows.length } : { k: "wrap", index: bIndex(b.id) + after };
      if (lvl === "element" && b.type !== "section") return { k: "wrap", index: bIndex(b.id) + after };
      return null;
    }
    if (b.type !== "section") return null;
    if (m.kind === "row" && lvl === "row") return { k: "rowIn", block: b.id, index: b.rows.findIndex((r) => r.id === m.ref.row) + after };
    const row = b.rows.find((r) => r.id === m.ref.row);
    const col = row?.columns.find((c) => c.id === m.ref.col);
    if (!row || !col || lvl !== "element") return null;
    if (m.kind === "column") return { k: "column", block: b.id, row: row.id, col: col.id, index: col.elements.length };
    if (m.kind === "element") return { k: "column", block: b.id, row: row.id, col: col.id, index: col.elements.findIndex((e) => e.id === m.ref.el) + after };
    return null;
  }
  function execute(p: Payload, t: Target) {
    let next = blocks;
    let ref: Ref | null = null;
    if (p.t === "block" || p.t === "prebuilt" || p.t === "saved") {
      if (t.k !== "blockIndex" && t.k !== "wrap") return;
      const sv = p.t === "saved" ? saved.find((x) => x.id === p.id) : undefined;
      const nb = p.t === "block" ? newBlock(p.type) : p.t === "saved" ? (sv ? reidentify(sv.content) : null) : PREBUILT.find((x) => x.key === p.key)?.make(product) ?? null;
      if (!nb) return;
      next = insertBlock(blocks, t.index, nb); ref = { block: nb.id };
    } else if (p.t === "row") {
      const row = newRow(p.cols);
      if (t.k === "rowIn") { next = insertRow(blocks, t.block, t.index, row); ref = { block: t.block, row: row.id }; }
      else if (t.k === "wrap") { const sec = { ...newBlock("section"), rows: [row] } as FunnelBlock; next = insertBlock(blocks, t.index, sec); ref = { block: sec.id, row: row.id }; }
      else return;
    } else if (p.t === "element") {
      const el = newElement(p.type);
      if (t.k === "column") { next = insertElement(blocks, { kind: "column", block: t.block, row: t.row, col: t.col, index: t.index }, el); ref = { block: t.block, row: t.row, col: t.col, el: el.id }; }
      else if (t.k === "wrap") { const sec = sectionWith(el); next = insertBlock(blocks, t.index, sec); const r0 = (sec as Extract<FunnelBlock, { type: "section" }>).rows[0]; ref = { block: sec.id, row: r0.id, col: r0.columns[0].id, el: el.id }; }
      else return;
    } else {
      if (isLocked(p.ref)) return;
      const k = kindOf(p.ref);
      let moved: { blocks: FunnelBlock[]; ref: Ref } | null = null;
      if (k === "block" && t.k === "blockIndex") moved = moveNode(blocks, p.ref, { kind: "block", index: t.index });
      else if (k === "row" && t.k === "rowIn") moved = moveNode(blocks, p.ref, { kind: "row", block: t.block, index: t.index });
      else if (k === "element" && t.k === "column") moved = moveNode(blocks, p.ref, { kind: "column", block: t.block, row: t.row, col: t.col, index: t.index });
      if (!moved) return;
      next = moved.blocks; ref = moved.ref;
    }
    editBlocks(() => next);
    if (ref) setSel(ref);
  }
  const addPayload = (p: Payload) => { const t = defaultTarget(p); if (t) execute(p, t); };

  // --- drag and drop on the canvas ----------------------------------------------------------------
  const setDrag = (p: Payload) => { dragRef.current = p; };
  const endDrag = () => { dragRef.current = null; setMark(null); };
  const validFor = (kind: NodeKind, ref: Ref): boolean => {
    const lvl = levelOf(dragRef.current);
    if (!lvl) return false;
    const b = blocks.find((x) => x.id === ref.block);
    if (lvl === "block") return kind === "block";
    if (lvl === "row") return kind === "row" || kind === "block";
    return kind === "element" || kind === "column" || (kind === "block" && b?.type !== "section");
  };
  const onDragOverNode = (e: DragEvent, kind: NodeKind, ref: Ref) => {
    if (!validFor(kind, ref)) return;
    e.preventDefault(); e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    const lvl = levelOf(dragRef.current);
    const b = blocks.find((x) => x.id === ref.block);
    const inside = kind === "column" || (kind === "block" && lvl === "row" && b?.type === "section");
    const horizontal = kind === "column";
    const pos: Pos = inside ? "inside" : (horizontal ? e.clientX < r.left + r.width / 2 : e.clientY < r.top + r.height / 2) ? "before" : "after";
    setMark((m) => (m && m.kind === kind && sameRef(m.ref, ref) && m.pos === pos ? m : { kind, ref, pos }));
  };
  const onDropNode = (e: DragEvent, kind: NodeKind, ref: Ref) => {
    if (!validFor(kind, ref)) return;
    e.preventDefault(); e.stopPropagation();
    const p = dragRef.current;
    const r = e.currentTarget.getBoundingClientRect();
    const lvl = levelOf(p);
    const b = blocks.find((x) => x.id === ref.block);
    const inside = kind === "column" || (kind === "block" && lvl === "row" && b?.type === "section");
    const pos: Pos = inside ? "inside" : e.clientY < r.top + r.height / 2 ? "before" : "after";
    const m = mark && mark.kind === kind && sameRef(mark.ref, ref) ? mark : { kind, ref, pos };
    endDrag();
    if (!p) return;
    const t = markToTarget(m, p);
    if (t) execute(p, t);
  };

  // --- keyboard -----------------------------------------------------------------------------------
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (mod && k === "z") { e.preventDefault(); if (e.shiftKey) stepRedo(); else stepUndo(); }
      else if (mod && k === "y") { e.preventDefault(); stepRedo(); }
      else if (mod && k === "c" && sel) { e.preventDefault(); copySel(); }
      else if (mod && k === "v" && clip) { e.preventDefault(); pasteClip(); }
      else if (mod && k === "d" && sel) { e.preventDefault(); duplicateSel(); }
      else if ((k === "delete" || k === "backspace") && sel) { e.preventDefault(); deleteSel(); }
      else if (e.altKey && (k === "arrowup" || k === "arrowleft")) { e.preventDefault(); nudgeSel(-1); }
      else if (e.altKey && (k === "arrowdown" || k === "arrowright")) { e.preventDefault(); nudgeSel(1); }
      else if (k === "escape" && sel) { setSel(parentRef(sel)); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  // --- AI -----------------------------------------------------------------------------------------
  async function askAi(text: string) {
    setAiBusy(true); setAiNote(null);
    let res: Awaited<ReturnType<typeof aiFunnelAction>>;
    try { res = await aiFunnelAction(funnel.id, text, JSON.stringify({ pages, theme, product }), scope === "block" && selBlock ? selBlock.id : undefined); }
    catch { res = { ok: false, message: "Could not reach the AI. Please try again." }; }
    setAiBusy(false);
    if (!res.ok || !res.pages) { setAiNote({ ok: false, text: res.message }); return; }
    commit(res.pages, res.theme);
    setPageIdx(0); setSel(null);
    setAiNote({ ok: true, text: res.message });
    setInstruction("");
  }

  // --- canvas wrapping ----------------------------------------------------------------------------
  const chipLabel = (kind: NodeKind, ref: Ref): string => crumbs(blocks, ref).at(-1)?.label ?? kind;
  const wrap = (kind: NodeKind, ref: Ref, node: ReactNode, meta: { index: number; count: number }) => {
    const on = sameRef(sel, ref);
    const hov = !on && sameRef(hover, ref);
    const locked = isLocked(ref);
    const mk = mark && mark.kind === kind && sameRef(mark.ref, ref) ? mark : null;
    const label = kind === "block" ? (blocks.find((b) => b.id === ref.block)?.name || BLOCK_LABELS[blocks.find((b) => b.id === ref.block)?.type ?? "text"].label) : kind === "element" ? ELEMENT_LABELS[(getNode(blocks, ref) as { type: keyof typeof ELEMENT_LABELS })?.type]?.label ?? "Element" : chipLabel(kind, ref);
    const canDrag = !locked && kind !== "column";
    return (
      <div className="relative" style={{ outline: on ? "2px solid #6366f1" : hov ? "1px dashed #6366f1" : undefined, outlineOffset: kind === "block" ? -2 : 0, cursor: "pointer" }}
        onClick={(e) => { e.stopPropagation(); select(ref); }}
        onMouseOver={(e) => { e.stopPropagation(); setHover((h) => (sameRef(h, ref) ? h : ref)); }}
        onDragOver={(e) => onDragOverNode(e, kind, ref)} onDrop={(e) => onDropNode(e, kind, ref)}>
        {mk && mk.pos === "before" && <div className={`pointer-events-none absolute z-30 bg-[#6366f1] ${kind === "column" ? "-left-1 inset-y-0 w-1.5" : "inset-x-0 -top-0.5 h-1.5"}`} />}
        {mk && mk.pos === "after" && <div className={`pointer-events-none absolute z-30 bg-[#6366f1] ${kind === "column" ? "-right-1 inset-y-0 w-1.5" : "inset-x-0 -bottom-0.5 h-1.5"}`} />}
        {mk && mk.pos === "inside" && <div className="pointer-events-none absolute inset-0 z-30 rounded bg-[#6366f1]/15 outline-2 outline-dashed outline-[#6366f1]" />}
        {node}
        {on && (
          <div className="absolute -top-7 left-0 z-40 flex items-center gap-0.5 whitespace-nowrap rounded-lg bg-[#4f46e5] px-1 py-0.5 text-white shadow-lg" style={{ top: kind === "block" ? 6 : -28 }} onClick={(e) => e.stopPropagation()}>
            {canDrag ? (
              <span draggable title="Drag to move" className="cursor-grab px-1 active:cursor-grabbing" onDragStart={(e) => { const p: Payload = { t: "move", ref }; e.dataTransfer.setData("text/plain", JSON.stringify(p)); e.dataTransfer.effectAllowed = "move"; setDrag(p); }} onDragEnd={endDrag}><GripVertical className="size-4" aria-hidden /></span>
            ) : <span className="px-1 opacity-60"><GripVertical className="size-4" aria-hidden /></span>}
            <span className="px-1 text-xs font-semibold">{label}{locked ? " 🔒" : ""}</span>
            {kind !== "block" && <button type="button" aria-label="Select parent" onClick={() => setSel(parentRef(ref))} className="rounded p-1 hover:bg-white/20"><ArrowUp className="size-3.5" /></button>}
            <button type="button" aria-label="Move earlier" disabled={meta.index === 0 || locked} onClick={() => nudgeSel(-1)} className="rounded p-1 hover:bg-white/20 disabled:opacity-40"><ChevronRight className="size-3.5 rotate-180" /></button>
            <button type="button" aria-label="Move later" disabled={meta.index >= meta.count - 1 || locked} onClick={() => nudgeSel(1)} className="rounded p-1 hover:bg-white/20 disabled:opacity-40"><ChevronRight className="size-3.5" /></button>
            {kind !== "column" && <button type="button" aria-label="Duplicate" onClick={duplicateSel} className="rounded p-1 hover:bg-white/20"><CopyPlus className="size-3.5" /></button>}
            {kind === "block" && <button type="button" aria-label="Ask AI about this section" onClick={() => { setScope("block"); setPanel("ai"); }} className="rounded p-1 hover:bg-white/20"><Sparkles className="size-3.5" /></button>}
            <button type="button" aria-label="Delete" disabled={locked} onClick={deleteSel} className="rounded p-1 hover:bg-white/20 disabled:opacity-40"><Trash2 className="size-3.5" /></button>
          </div>
        )}
      </div>
    );
  };

  const edit = { onText: (blockId: string, path: (string | number)[], value: string) => editBlocks((bs) => bs.map((b) => (b.id === blockId ? setPath(b, path, value) : b))) };
  const nextPage = pages[pageIdx + 1];
  const liveUrl = `/f/${slug}`;
  const copyLink = async () => { try { await navigator.clipboard.writeText(`${origin.current}${liveUrl}`); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* blocked */ } };
  const merge = { "business.name": product.business.name, "business.phone": product.business.phone, "business.email": product.business.email, "business.address": product.business.address, "right_now.year": String(new Date().getFullYear()) };
  const trail = crumbs(blocks, sel);

  const rail: [Panel, string, typeof Plus][] = [["add", "Add", Plus], ["layers", "Layers", Layers], ["pages", "Pages", LayoutTemplate], ["design", "Design", Palette], ["ai", "AI", Sparkles]];
  const leftPanel: Panel = panel === "edit" ? "add" : panel;

  const dnHint = "Click to add, or drag onto the page.";
  const leftContent = (p: Panel) => (
    <>
      {p === "add" && <QuickAdd onAdd={addPayload} setDrag={setDrag} endDrag={endDrag} hint={dnHint} saved={saved} onDeleteSaved={removeSaved} />}
      {p === "layers" && <LayersPanel blocks={blocks} sel={sel} device={device} onSelect={select} onToggleHidden={toggleHidden} onToggleLock={toggleLock} />}
      {p === "pages" && (
        <div className="space-y-4">
          <p className="text-xs text-fg-subtle">A funnel is a few pages in a row. Buttons set to &ldquo;#next&rdquo; and forms move visitors to the next page.</p>
          <ol className="space-y-2">
            {pages.map((pg, i) => (
              <li key={pg.id} className={`rounded-xl border p-3 ${i === pageIdx ? "border-primary bg-primary-soft" : "border-border"}`}>
                <div className="flex items-center gap-2">
                  <button type="button" className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-fg" onClick={() => { setPageIdx(i); setSel(null); }} aria-label={`Open page ${i + 1}`}>{i + 1}</button>
                  <Input aria-label="Page name" value={pg.name} maxLength={40} className="!h-9" onFocus={() => setPageIdx(i)} onChange={(e) => commit(pages.map((x) => (x.id === pg.id ? { ...x, name: e.target.value } : x)))} />
                </div>
                <p className="mt-1.5 truncate text-[11px] text-fg-subtle">{origin.current}{pagePath(slug, pg, i)}</p>
                {i === pageIdx && (
                  <details className="mt-2 rounded-lg border border-border bg-surface p-2 text-sm">
                    <summary className="cursor-pointer font-medium">Search &amp; sharing (SEO)</summary>
                    <div className="mt-2 space-y-2">
                      {(() => {
                        const seo = pg.seo ?? { title: "", description: "", image: "", noIndex: false };
                        const set = (patch: Partial<typeof seo>) => commit(pages.map((x) => (x.id === pg.id ? { ...x, seo: { ...seo, ...patch } } : x)));
                        return (
                          <>
                            <Field label="Page title" htmlFor={`seo-t-${pg.id}`} hint={`${seo.title.length}/60. Shown in Google and browser tabs.`}><Input id={`seo-t-${pg.id}`} value={seo.title} maxLength={120} placeholder={title} onChange={(e) => set({ title: e.target.value })} /></Field>
                            <Field label="Description" htmlFor={`seo-d-${pg.id}`} hint={`${seo.description.length}/160`}><Textarea id={`seo-d-${pg.id}`} rows={3} value={seo.description} maxLength={320} onChange={(e) => set({ description: e.target.value })} /></Field>
                            <Field label="Social share image" htmlFor={`seo-i-${pg.id}`}><ImageField id={`seo-i-${pg.id}`} userId={userId} value={seo.image} onChange={(v) => set({ image: v })} /></Field>
                            <label className="flex items-center gap-2 text-xs"><Checkbox checked={seo.noIndex} onChange={(e) => set({ noIndex: e.target.checked })} />Hide this page from search engines</label>
                          </>
                        );
                      })()}
                    </div>
                  </details>
                )}
                <div className="mt-1.5 flex gap-1">
                  <Button size="icon" variant="ghost" disabled={i === 0} aria-label="Move earlier" onClick={() => { const a = [...pages]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; commit(a); setPageIdx(i - 1); }}><ArrowUp className="size-4" /></Button>
                  <Button size="icon" variant="ghost" disabled={i === pages.length - 1} aria-label="Move later" onClick={() => { const a = [...pages]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; commit(a); setPageIdx(i + 1); }}><ArrowDown className="size-4" /></Button>
                  <Button size="icon" variant="ghost" disabled={pages.length >= 6} aria-label="Duplicate page" onClick={() => { const c = newPage(`${pg.name} copy`, JSON.parse(JSON.stringify(pg.blocks))); const re = JSON.parse(JSON.stringify(c.blocks).replace(/"id":"[a-z0-9]+"/gi, () => `"id":"${uid()}"`)); const a = [...pages]; a.splice(i + 1, 0, { ...c, blocks: re }); commit(a); setPageIdx(i + 1); }}><CopyPlus className="size-4" /></Button>
                  <Button size="icon" variant="ghost" disabled={pages.length <= 1} aria-label="Delete page" onClick={() => { if (confirm(`Delete the page “${pg.name}”?`)) { commit(pages.filter((x) => x.id !== pg.id)); setPageIdx(0); setSel(null); } }}><Trash2 className="size-4" /></Button>
                </div>
              </li>
            ))}
          </ol>
          {pages.length < 6 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">Add a page</p>
              <div className="flex flex-wrap gap-2">
                {([
                  ["Blank page", () => newPage("New page", [newBlock("text")])],
                  ["Order page", () => newPage("Order", [{ ...newBlock("text"), title: "Almost there", body: "Check your order, then fill in your details below.", align: "center" } as FunnelBlock, { ...newBlock("product"), name: product.name, price: product.price, imageUrl: product.imageUrl, images: product.images, variant: "stacked" } as FunnelBlock, newBlock("order_form")])],
                  ["Thank-you page", () => newPage("Thank you", [{ ...newBlock("text"), title: "Thank you!", body: "We have received your details and will be in touch very soon.", align: "center", space: "roomy" } as FunnelBlock, newBlock("steps")])],
                ] as [string, () => FunnelPage][]).map(([label, make]) => (
                  <Button key={label} size="sm" variant="outline" onClick={() => { commit([...pages, make()]); setPageIdx(pages.length); setSel(null); }}><Plus className="size-4" />{label}</Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {p === "design" && <DesignPanel theme={theme} page={page} onTheme={(t) => commit(pages, t)} />}
      {p === "ai" && (
        <div className="space-y-4">
          <p className="flex items-center gap-2 text-base font-bold"><Sparkles className="size-5 text-primary" />Your AI designer</p>
          <p className="text-sm text-fg-muted">Tell it what to change in plain words. It keeps everything you didn&apos;t mention, and you can always press Undo.</p>
          {selBlock && (
            <div className="inline-flex rounded-xl bg-surface-muted p-1 text-sm">
              {([["funnel", "Whole funnel"], ["block", `Selected: ${BLOCK_LABELS[selBlock.type].label}`]] as const).map(([k, l]) => (
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
            {(scope === "block" && selBlock ? BLOCK_CHIPS : FUNNEL_CHIPS).map((c) => (
              <button key={c} type="button" disabled={aiBusy} onClick={() => setInstruction(c.startsWith("Redesign") ? "Redesign the whole funnel from scratch using my product details. Keep the same look and goal." : c)} className="rounded-full border border-border px-2.5 py-1 text-xs text-fg-muted hover:border-primary hover:text-fg disabled:opacity-50">{c}</button>
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
              <Field label="Main product photo" htmlFor="p-img"><ImageField id="p-img" userId={userId} value={product.imageUrl} onChange={(u) => { setProduct({ ...product, imageUrl: u }); touch(); }} /></Field>
              <Field label="More product photos" htmlFor="p-imgs" hint="The AI uses all of them: the main photo in the hero, the rest in a gallery."><MultiImageField id="p-imgs" userId={userId} values={product.images} onChange={(u) => { setProduct({ ...product, images: u }); touch(); }} /></Field>
              <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-fg-subtle">Business details (for merge fields)</p>
              <p className="-mt-2 text-xs text-fg-subtle">Use {"{{business.name}}"}, {"{{business.phone}}"}, {"{{business.email}}"}, {"{{business.address}}"} and {"{{right_now.year}}"} in any text.</p>
              {(["name", "phone", "email", "address"] as const).map((k) => (
                <Field key={k} label={`Business ${k}`} htmlFor={`b-${k}`}><Input id={`b-${k}`} value={product.business[k]} maxLength={k === "address" ? 240 : 120} onChange={(e) => { setProduct({ ...product, business: { ...product.business, [k]: e.target.value } }); touch(); }} /></Field>
              ))}
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={product.whatsapp} onChange={(e) => { setProduct({ ...product, whatsapp: e.target.checked }); touch(); }} />Show a WhatsApp button after an order</label>
            </div>
          </details>
        </div>
      )}
    </>
  );

  const inspector = sel && selNode ? (
    <Inspector blocks={blocks} sel={sel} device={device} userId={userId} onPatch={patchSel} onResp={respSel} onColumns={(n) => sel.row && editBlocks((bs) => setColumnCount(bs, sel, n))} onDelete={deleteSel} onDuplicate={duplicateSel} onSaveSection={saveSection} />
  ) : (
    <div className="space-y-3 text-sm text-fg-muted"><p className="text-base font-bold text-fg">Click anything on the page</p><p>Click a section, row, column or element to change it here. Click text to type straight on the page.</p></div>
  );

  return (
    <div className="flex h-dvh flex-col bg-bg text-fg">
      {/* Top bar */}
      <header className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-3 py-2">
        <Link href="/marketing/funnels" className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-fg-muted hover:bg-surface-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden />Back</Link>
        <Input aria-label="Funnel name" value={title} maxLength={80} onChange={(e) => { setTitle(e.target.value); touch(); }} className="!h-9 !w-40 font-semibold sm:!w-56" />
        <span role="status" className={`rounded-full border px-2.5 py-1 text-xs ${status === "error" ? "border-danger text-danger" : "border-border text-fg-subtle"}`}>
          {status === "saving" ? "Saving…" : status === "dirty" ? "Unsaved…" : status === "error" ? saveMsg : <span className="inline-flex items-center gap-1"><Check className="size-3.5 text-success" />Autosave on · saved</span>}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <a href={`/builder/${funnel.id}/preview?p=${page.slug}`} target="_blank" rel="noopener noreferrer" aria-label="Preview" className="grid size-9 place-items-center rounded-xl border border-border hover:bg-surface-muted"><Eye className="size-4" /></a>
          <Button size="sm" onClick={() => setPublishOpen(true)}><Rocket className="size-4" />{published ? (unpublished ? "Publish changes" : "Published") : "Publish"}</Button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-surface px-3 py-1.5">
        <nav className="flex gap-0.5" aria-label="Builder panels">
          {rail.map(([k, l, Icon]) => (
            <button key={k} type="button" onClick={() => setPanel(k)} aria-pressed={leftPanel === k && panel !== "edit"} title={l} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium ${leftPanel === k && panel !== "edit" ? "bg-primary-soft text-primary" : "text-fg-muted hover:bg-surface-muted"}`}><Icon className="size-4" aria-hidden /><span className="hidden xl:inline">{l}</span></button>
          ))}
          <button type="button" onClick={() => setPanel("edit")} aria-pressed={panel === "edit"} className={`rounded-lg px-2.5 py-1.5 text-sm font-medium lg:hidden ${panel === "edit" ? "bg-primary-soft text-primary" : "text-fg-muted hover:bg-surface-muted"}`}>Edit</button>
        </nav>
        <span className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />
        <Select aria-label="Page" value={pageIdx} onChange={(e) => { setPageIdx(Number(e.target.value)); setSel(null); }} className="!h-9 !w-36 sm:!w-44">
          {pages.map((pg, i) => <option key={pg.id} value={i}>{i + 1}. {pg.name}</option>)}
        </Select>
        <div className="flex gap-0.5 rounded-xl bg-surface-muted p-0.5" role="group" aria-label="Screen size">
          {([["desktop", "Desktop", Laptop], ["tablet", "Tablet", Tablet], ["mobile", "Phone", Smartphone]] as const).map(([d, l, Icon]) => (
            <button key={d} type="button" onClick={() => setDevice(d)} aria-pressed={device === d} aria-label={`${l} view`} title={`${l} view`} className={`grid size-8 place-items-center rounded-lg ${device === d ? "bg-surface shadow-sm" : "text-fg-muted"}`}><Icon className="size-4" /></button>
          ))}
        </div>
        <Select aria-label="Zoom" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="!h-9 !w-24">{[50, 75, 100, 125].map((z) => <option key={z} value={z}>{z}%</option>)}</Select>
        <div className="ml-auto flex items-center gap-0.5">
          <Button size="icon" variant="ghost" onClick={openHistory} aria-label="Version history" title="Version history"><History className="size-4" /></Button>
          <Button size="icon" variant="ghost" onClick={stepUndo} disabled={!undo.length} aria-label="Undo"><Undo2 className="size-4" /></Button>
          <Button size="icon" variant="ghost" onClick={stepRedo} disabled={!redo.length} aria-label="Redo"><Redo2 className="size-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setShortcutsOpen(true)} aria-label="Keyboard shortcuts" className="hidden sm:inline-flex">⌨︎</Button>
        </div>
      </div>

      {/* Link bar */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-border bg-surface px-3 py-1 text-xs">
        <span className="text-fg-subtle">{published ? <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">{origin.current.replace(/^https?:\/\//, "")}{liveUrl}</a> : "Draft: publish to get a link"}</span>
        <button type="button" onClick={copyLink} className="text-primary underline">{copied ? "Copied" : "Copy link"}</button>
        <button type="button" onClick={() => setDomainOpen(true)} className="font-medium text-primary underline">Connect domain</button>
      </div>

      {conflict && (
        <div role="alert" className="flex flex-wrap items-center gap-2 border-b border-danger bg-danger/10 px-3 py-2 text-sm">
          <b>This funnel was changed in another tab or device.</b> Autosave is paused so nothing gets overwritten.
          <span className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={reloadLatest}>Load the latest</Button>
            <Button size="sm" variant="outline" onClick={keepMine}>Keep my version</Button>
            <Button size="sm" variant="outline" onClick={copyMine}>Save mine as a copy</Button>
          </span>
        </div>
      )}
      {recover && (
        <div role="status" className="flex flex-wrap items-center gap-2 border-b border-border bg-primary-soft px-3 py-2 text-sm">
          <b>We found edits that never reached the server.</b>
          <span className="ml-auto flex gap-2"><Button size="sm" onClick={recoverEdits}>Recover them</Button><Button size="sm" variant="outline" onClick={dismissRecover}>Discard</Button></span>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left panel (desktop) */}
        <aside className="hidden w-[340px] shrink-0 overflow-y-auto border-r border-border bg-surface p-4 lg:block" aria-label="Panel">{leftContent(leftPanel)}</aside>

        {/* Canvas */}
        <main className="min-h-0 flex-1 overflow-auto bg-[#e5e7eb] p-2 dark:bg-[#0b1220] sm:p-5" onClick={() => setSel(null)} onMouseLeave={() => setHover(null)}>
          <div className="mx-auto overflow-hidden rounded-xl bg-white shadow-xl transition-all" style={{ width: WIDTH[device], maxWidth: "100%", zoom: zoom / 100 }}
            onClick={(e) => e.stopPropagation()}
            onClickCapture={(e) => { if ((e.target as HTMLElement).closest("a")) e.preventDefault(); }}
            onDragOver={(e) => { if (levelOf(dragRef.current) === "block" && e.target === e.currentTarget) { e.preventDefault(); setMark(blocks.length ? { kind: "block", ref: { block: blocks[blocks.length - 1].id }, pos: "after" } : null); } }}
            onDrop={(e) => { const p = dragRef.current; if (p && levelOf(p) === "block" && e.target === e.currentTarget) { e.preventDefault(); endDrag(); execute(p, { k: "blockIndex", index: blocks.length }); } }}>
            {blocks.length === 0 ? (
              <div className="grid min-h-72 place-items-center p-8 text-center text-sm text-[#64748b]"
                onDragOver={(e) => { if (levelOf(dragRef.current)) e.preventDefault(); }} onDrop={(e) => { const p = dragRef.current; e.preventDefault(); endDrag(); if (p) { const t = defaultTarget(p); if (t) execute(p, t); } }}>
                <div><p className="text-lg font-semibold text-[#0f172a]">This page is empty</p><p className="mt-1">Drag a section here, or open <b>Add</b> and tap one.</p></div>
              </div>
            ) : (
              <FunnelView slug={slug} theme={theme} page={page} preview edit={edit} wrap={wrap} merge={merge} nextHref={nextPage ? pagePath(slug, nextPage, pageIdx + 1) : undefined} />
            )}
            <button type="button" onClick={() => setPanel("add")} className="flex w-full items-center justify-center gap-2 border-t border-dashed border-[#cbd5e1] bg-[#f8fafc] py-4 text-sm font-medium text-[#475569] hover:bg-[#eef2f7]"><Plus className="size-4" />Add a section</button>
          </div>
        </main>

        {/* Right inspector (desktop) */}
        <aside className="hidden w-[340px] shrink-0 overflow-y-auto border-l border-border bg-surface p-4 lg:block" aria-label="Settings">{inspector}</aside>

        {/* Bottom sheet (phones and small tablets) */}
        <aside className="h-[44dvh] shrink-0 overflow-y-auto border-t border-border bg-surface p-4 lg:hidden" aria-label="Panel">{panel === "edit" ? inspector : leftContent(leftPanel)}</aside>
      </div>

      {/* Breadcrumb */}
      <nav aria-label="Selection path" className="flex items-center gap-1 overflow-x-auto border-t border-border bg-surface px-3 py-1.5 text-xs">
        <button type="button" onClick={() => setSel(null)} className={`rounded px-1.5 py-0.5 ${!sel ? "font-semibold text-primary" : "text-fg-muted hover:bg-surface-muted"}`}>Page</button>
        {trail.map((c, i) => (
          <span key={i} className="flex items-center gap-1"><ChevronRight className="size-3 text-fg-subtle" aria-hidden /><button type="button" onClick={() => setSel(c.ref)} className={`rounded px-1.5 py-0.5 ${i === trail.length - 1 ? "font-semibold text-primary" : "text-fg-muted hover:bg-surface-muted"}`}>{c.label}</button></span>
        ))}
      </nav>

      {welcome && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
          <div className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-2xl">
            <p className="text-3xl" aria-hidden>🎉</p>
            <h2 id="welcome-title" className="mt-2 text-xl font-bold">Your funnel is ready</h2>
            <ul className="mt-3 space-y-2 text-sm text-fg-muted">
              <li><b className="text-fg">Click any text</b> on the page and type to change it.</li>
              <li><b className="text-fg">Click a section, row, column or element</b> to style it. The path is shown along the bottom.</li>
              <li><b className="text-fg">Add:</b> sections, rows of 1 to 6 columns, elements and prebuilt sections. Drag them in.</li>
              <li><b className="text-fg">Tablet and Phone views</b> show how it looks on smaller screens, and let you hide or resize things for them.</li>
              <li><b className="text-fg">Everything saves by itself.</b> Press Publish when you love it.</li>
            </ul>
            <Button className="mt-5 w-full" onClick={() => { setWelcome(false); setPanel("design"); }}>Start designing</Button>
          </div>
        </div>
      )}

      {shortcutsOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="sc-title" onClick={() => setShortcutsOpen(false)}>
          <div className="w-full max-w-sm space-y-3 rounded-3xl bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between"><h2 id="sc-title" className="text-xl font-bold">Keyboard shortcuts</h2><Button size="icon" variant="ghost" aria-label="Close" onClick={() => setShortcutsOpen(false)}><X className="size-4" /></Button></div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {[["Ctrl/⌘ Z", "Undo"], ["Ctrl/⌘ Shift Z", "Redo"], ["Ctrl/⌘ C / V", "Copy / paste the selection"], ["Ctrl/⌘ D", "Duplicate"], ["Delete", "Delete the selection"], ["Alt + arrows", "Move among siblings"], ["Esc", "Select the parent"]].map(([k, v]) => <div key={k} className="contents"><dt className="font-mono text-xs text-fg-muted">{k}</dt><dd>{v}</dd></div>)}
            </dl>
          </div>
        </div>
      )}

      {domainOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="dom-title" onClick={() => setDomainOpen(false)}>
          <div className="w-full max-w-md space-y-3 rounded-3xl bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between"><h2 id="dom-title" className="text-xl font-bold">Connect your own domain</h2><Button size="icon" variant="ghost" aria-label="Close" onClick={() => setDomainOpen(false)}><X className="size-4" /></Button></div>
            <p className="rounded-xl bg-surface-muted p-3 text-sm"><b>Status: not connected.</b> Custom domains are not switched on for this platform yet, so nothing is simulated here.</p>
            <p className="text-sm text-fg-muted">Your funnel works today at its Maximus link. To use your own domain it will need your domain&apos;s DNS to point here, and a platform administrator to add the domain to the hosting project. Until then, share the link above.</p>
          </div>
        </div>
      )}

      {historyOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="hist-title" onClick={() => setHistoryOpen(false)}>
          <div className="flex max-h-[85dvh] w-full max-w-lg flex-col gap-3 rounded-3xl bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between"><h2 id="hist-title" className="text-xl font-bold">Version history</h2><Button size="icon" variant="ghost" aria-label="Close" onClick={() => setHistoryOpen(false)}><X className="size-4" /></Button></div>
            <div className="flex gap-2">
              <Input aria-label="Version name" placeholder="Name this version (optional)" maxLength={80} value={versionLabel} onChange={(e) => setVersionLabel(e.target.value)} />
              <Button onClick={saveVersion} disabled={busy}>Save version</Button>
            </div>
            {histMsg && <p role="status" className="text-sm">{histMsg}</p>}
            <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {versions === null && <li className="text-sm text-fg-muted">Loading…</li>}
              {versions?.length === 0 && <li className="text-sm text-fg-muted">No versions yet. Safety copies are saved automatically while you work, and each time you publish.</li>}
              {versions?.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3 text-sm">
                  <div className="min-w-0 flex-1"><p className="font-medium">{v.label || ({ auto: "Automatic copy", manual: "Saved version", publish: "Published", restore: "Before a restore" })[v.kind]}</p><p className="text-xs text-fg-subtle">{new Date(v.created_at).toLocaleString()}</p></div>
                  <Button size="sm" variant="outline" onClick={() => restore(v.id)} disabled={busy}>Restore to draft</Button>
                  <Button size="sm" variant="ghost" onClick={() => rollback(v.id)} disabled={busy}>Make live</Button>
                </li>
              ))}
            </ul>
            <p className="text-xs text-fg-subtle">The newest 50 versions are kept. Versions never change once saved.</p>
          </div>
        </div>
      )}

      {publishOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="pub-title" onClick={() => setPublishOpen(false)}>
          <div className="w-full max-w-md space-y-4 rounded-3xl bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between"><h2 id="pub-title" className="text-xl font-bold">Publish your funnel</h2><Button size="icon" variant="ghost" aria-label="Close" onClick={() => setPublishOpen(false)}><X className="size-4" /></Button></div>
            <div className="space-y-2 rounded-2xl border border-border p-3.5 text-sm">
              <p className="font-semibold">{published ? (unpublished ? "Live, with changes not published yet" : "Live: anyone with the link can see it") : "Not published: only you can see it"}</p>
              {liveAt && <p className="text-xs text-fg-subtle">Last published {new Date(liveAt).toLocaleString()}. Visitors only see what you publish; autosave never changes the live page.</p>}
              <div className="flex flex-wrap gap-2">
                <Button onClick={publish} disabled={busy || !SLUG_OK.test(slug)}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Rocket className="size-4" />}{published ? "Publish changes" : "Publish"}</Button>
                {published && <Button variant="outline" onClick={unpublish} disabled={busy}>Unpublish</Button>}
              </div>
              {pubMsg && <p role="status" className="text-xs">{pubMsg}</p>}
            </div>
            <Field label="Your link" htmlFor="slug" hint="Letters, numbers and dashes only.">
              <div className="flex items-center gap-1.5"><span className="shrink-0 text-xs text-fg-subtle">{origin.current.replace(/^https?:\/\//, "")}/f/</span><Input id="slug" value={slug} maxLength={40} onChange={(e) => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); touch(); }} /></div>
            </Field>
            {!SLUG_OK.test(slug) && <p role="alert" className="text-sm text-danger">The link needs 3 to 40 letters, numbers or dashes.</p>}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={copyLink}>{copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}{copied ? "Copied" : "Copy link"}</Button>
              <Link href={`/marketing/funnels/${funnel.id}/leads`} className="inline-flex h-11 items-center rounded-xl border border-border px-4 text-sm font-medium hover:bg-surface-muted">Leads &amp; orders</Link>
            </div>
            <p className="text-xs text-fg-subtle">{funnel.views} visits so far. {status === "saved" ? "All changes saved." : status === "error" ? saveMsg : "Saving…"}</p>
            <hr className="border-border" />
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="ghost" onClick={exportJson}>Export JSON</Button>
              <label className="inline-flex h-9 cursor-pointer items-center rounded-xl px-3 text-sm font-medium hover:bg-surface-muted">Import JSON<input type="file" accept="application/json,.json" hidden onChange={(e) => { void importJson(e.target.files?.[0]); e.target.value = ""; }} /></label>
            </div>
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
