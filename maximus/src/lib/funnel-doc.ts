/**
 * Command layer for the funnel document: pure functions over a page's block list.
 * Tree rules: Page > Section (block) > Row > Column > Element. Elements never contain nodes, rows only live in
 * sections, columns only in rows, so a node can never end up inside itself. Every command returns a new array.
 */
import {
  BLOCK_LABELS, cleanBlock, cleanElement, newColumn, newRow, uid,
  type Anim, type FunnelBlock, type FunnelColumn, type FunnelElement, type FunnelPage, type FunnelRow, type FunnelTheme, type RespMap, type Resp,
} from "@/lib/funnels";

export type Ref = { block: string; row?: string; col?: string; el?: string };
export type Kind = "block" | "row" | "column" | "element";
export type Device = "desktop" | "tablet" | "mobile";
export type Node = FunnelBlock | FunnelRow | FunnelColumn | FunnelElement;

export const kindOf = (r: Ref): Kind => (r.el ? "element" : r.col ? "column" : r.row ? "row" : "block");
export const sameRef = (a: Ref | null, b: Ref | null) => !!a && !!b && a.block === b.block && a.row === b.row && a.col === b.col && a.el === b.el;

export type Drop =
  | { kind: "block"; index: number }
  | { kind: "row"; block: string; index: number }
  | { kind: "column"; block: string; row: string; col: string; index: number };

// --- lookup ----------------------------------------------------------------------------------------

export function getNode(blocks: FunnelBlock[], r: Ref): Node | null {
  const b = blocks.find((x) => x.id === r.block);
  if (!b) return null;
  if (!r.row) return b;
  if (b.type !== "section") return null;
  const row = b.rows.find((x) => x.id === r.row);
  if (!row) return null;
  if (!r.col) return row;
  const col = row.columns.find((x) => x.id === r.col);
  if (!col) return null;
  if (!r.el) return col;
  return col.elements.find((x) => x.id === r.el) ?? null;
}

/** Breadcrumb: Section > Row > Column > Element, each as a Ref. */
export function crumbs(blocks: FunnelBlock[], r: Ref | null): { label: string; ref: Ref }[] {
  if (!r) return [];
  const out: { label: string; ref: Ref }[] = [];
  const b = blocks.find((x) => x.id === r.block);
  if (!b) return out;
  out.push({ label: b.name || (b.type === "section" ? "Section" : b.type), ref: { block: b.id } });
  if (b.type === "section" && r.row) {
    const ri = b.rows.findIndex((x) => x.id === r.row);
    if (ri >= 0) {
      const row = b.rows[ri];
      out.push({ label: `${row.columns.length} column row`, ref: { block: b.id, row: row.id } });
      if (r.col) {
        const ci = row.columns.findIndex((x) => x.id === r.col);
        if (ci >= 0) {
          out.push({ label: `${ordinal(ci + 1)} column`, ref: { block: b.id, row: row.id, col: row.columns[ci].id } });
          if (r.el) {
            const el = row.columns[ci].elements.find((x) => x.id === r.el);
            if (el) out.push({ label: el.type, ref: r });
          }
        }
      }
    }
  }
  return out;
}
const ordinal = (n: number) => `${n}${["th", "st", "nd", "rd"][n % 10 > 3 || [11, 12, 13].includes(n % 100) ? 0 : n % 10]}`;

/** The parent of a ref (selecting "up" the tree). */
export const parentRef = (r: Ref): Ref | null => (r.el ? { block: r.block, row: r.row, col: r.col } : r.col ? { block: r.block, row: r.row } : r.row ? { block: r.block } : null);

// --- fresh ids -------------------------------------------------------------------------------------

/** Deep copy with every id in the subtree replaced, so copies never collide with the original. */
export function reidentify<T extends Node>(node: T): T {
  const n = JSON.parse(JSON.stringify(node)) as Record<string, unknown>;
  const walk = (x: unknown) => {
    if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === "object") {
      const o = x as Record<string, unknown>;
      if (typeof o.id === "string") o.id = uid();
      Object.values(o).forEach(walk);
    }
  };
  walk(n);
  return n as T;
}

// --- updates ---------------------------------------------------------------------------------------

function mapNode(blocks: FunnelBlock[], r: Ref, fn: (n: Node) => Node): FunnelBlock[] {
  return blocks.map((b) => {
    if (b.id !== r.block) return b;
    if (!r.row) return fn(b) as FunnelBlock;
    if (b.type !== "section") return b;
    return { ...b, rows: b.rows.map((row) => {
      if (row.id !== r.row) return row;
      if (!r.col) return fn(row) as FunnelRow;
      return { ...row, columns: row.columns.map((col) => {
        if (col.id !== r.col) return col;
        if (!r.el) return fn(col) as FunnelColumn;
        return { ...col, elements: col.elements.map((el) => (el.id === r.el ? (fn(el) as FunnelElement) : el)) };
      }) };
    }) };
  });
}
export const updateNode = (blocks: FunnelBlock[], r: Ref, patch: Record<string, unknown>) => mapNode(blocks, r, (n) => ({ ...n, ...patch }) as Node);

/** Sets an override for one device. `undefined` removes the override so the value is inherited again. */
export function setResp(blocks: FunnelBlock[], r: Ref, device: Exclude<Device, "desktop">, key: keyof Resp, value: Resp[keyof Resp] | undefined): FunnelBlock[] {
  return mapNode(blocks, r, (n) => {
    const cur: RespMap = { ...((n as { resp?: RespMap }).resp ?? {}) };
    const dev: Resp = { ...(cur[device] ?? {}) };
    if (value === undefined) delete dev[key]; else (dev as Record<string, unknown>)[key] = value;
    if (Object.keys(dev).length) cur[device] = dev; else delete cur[device];
    return { ...n, resp: Object.keys(cur).length ? cur : undefined } as Node;
  });
}

export const setAnim = (blocks: FunnelBlock[], r: Ref, anim: Anim) => updateNode(blocks, r, { anim: anim === "none" ? undefined : anim });

// --- structure -------------------------------------------------------------------------------------

export function deleteNode(blocks: FunnelBlock[], r: Ref): FunnelBlock[] {
  const k = kindOf(r);
  if (k === "block") return blocks.filter((b) => b.id !== r.block);
  return blocks.map((b) => {
    if (b.id !== r.block || b.type !== "section") return b;
    if (k === "row") return { ...b, rows: b.rows.filter((row) => row.id !== r.row) };
    return { ...b, rows: b.rows.map((row) => {
      if (row.id !== r.row) return row;
      if (k === "column") return row.columns.length > 1 ? { ...row, widths: undefined, columns: row.columns.filter((c) => c.id !== r.col) } : row;
      return { ...row, columns: row.columns.map((c) => (c.id === r.col ? { ...c, elements: c.elements.filter((e) => e.id !== r.el) } : c)) };
    }) };
  });
}

/** Inserts `node` right after `r` (same parent). Returns the new list and the new node's ref. */
export function insertAfter(blocks: FunnelBlock[], r: Ref, node: Node): { blocks: FunnelBlock[]; ref: Ref } {
  const k = kindOf(r);
  if (k === "block") {
    const i = blocks.findIndex((b) => b.id === r.block);
    const nb = node as FunnelBlock;
    return { blocks: [...blocks.slice(0, i + 1), nb, ...blocks.slice(i + 1)], ref: { block: nb.id } };
  }
  let ref: Ref = r;
  const out = blocks.map((b) => {
    if (b.id !== r.block || b.type !== "section") return b;
    if (k === "row") {
      const i = b.rows.findIndex((x) => x.id === r.row);
      const nr = node as FunnelRow;
      ref = { block: b.id, row: nr.id };
      return { ...b, rows: [...b.rows.slice(0, i + 1), nr, ...b.rows.slice(i + 1)] };
    }
    return { ...b, rows: b.rows.map((row) => {
      if (row.id !== r.row) return row;
      if (k === "column") return row;
      return { ...row, columns: row.columns.map((c) => {
        if (c.id !== r.col) return c;
        const i = c.elements.findIndex((x) => x.id === r.el);
        const ne = node as FunnelElement;
        ref = { block: b.id, row: row.id, col: c.id, el: ne.id };
        return { ...c, elements: [...c.elements.slice(0, i + 1), ne, ...c.elements.slice(i + 1)] };
      }) };
    }) };
  });
  return { blocks: out, ref };
}

export function duplicateNode(blocks: FunnelBlock[], r: Ref): { blocks: FunnelBlock[]; ref: Ref } {
  const n = getNode(blocks, r);
  if (!n || kindOf(r) === "column") return { blocks, ref: r };
  return insertAfter(blocks, r, reidentify(n));
}

export function insertBlock(blocks: FunnelBlock[], index: number, b: FunnelBlock): FunnelBlock[] {
  const i = Math.max(0, Math.min(blocks.length, index));
  return [...blocks.slice(0, i), b, ...blocks.slice(i)];
}

export function insertRow(blocks: FunnelBlock[], blockId: string, index: number, row: FunnelRow): FunnelBlock[] {
  return blocks.map((b) => {
    if (b.id !== blockId || b.type !== "section") return b;
    const i = Math.max(0, Math.min(b.rows.length, index));
    return { ...b, rows: [...b.rows.slice(0, i), row, ...b.rows.slice(i)] };
  });
}

export function insertElement(blocks: FunnelBlock[], d: Extract<Drop, { kind: "column" }>, el: FunnelElement): FunnelBlock[] {
  return blocks.map((b) => {
    if (b.id !== d.block || b.type !== "section") return b;
    return { ...b, rows: b.rows.map((row) => {
      if (row.id !== d.row) return row;
      return { ...row, columns: row.columns.map((c) => {
        if (c.id !== d.col) return c;
        const i = Math.max(0, Math.min(c.elements.length, d.index));
        return { ...c, elements: [...c.elements.slice(0, i), el, ...c.elements.slice(i)] };
      }) };
    }) };
  });
}

/** Moves a node to a drop target of the matching kind. Returns null when the move is not allowed. */
export function moveNode(blocks: FunnelBlock[], from: Ref, to: Drop): { blocks: FunnelBlock[]; ref: Ref } | null {
  const k = kindOf(from);
  const node = getNode(blocks, from);
  if (!node) return null;
  if (k === "block" && to.kind === "block") {
    const i = blocks.findIndex((b) => b.id === from.block);
    const rest = blocks.filter((b) => b.id !== from.block);
    rest.splice(to.index > i ? to.index - 1 : to.index, 0, node as FunnelBlock);
    return { blocks: rest, ref: { block: from.block } };
  }
  if (k === "row" && to.kind === "row") {
    const src = blocks.find((b) => b.id === from.block);
    if (!src || src.type !== "section") return null;
    const si = src.rows.findIndex((r) => r.id === from.row);
    const removed = deleteNode(blocks, from);
    // moving inside the same section: removing the row first shifts later indexes down by one
    const idx = to.block === from.block && to.index > si ? to.index - 1 : to.index;
    return { blocks: insertRow(removed, to.block, idx, node as FunnelRow), ref: { block: to.block, row: from.row } };
  }
  if (k === "element" && to.kind === "column") {
    const src = blocks.find((b) => b.id === from.block);
    if (!src || src.type !== "section") return null;
    const srcCol = src.rows.find((r) => r.id === from.row)?.columns.find((c) => c.id === from.col);
    const si = srcCol?.elements.findIndex((e) => e.id === from.el) ?? -1;
    const sameCol = to.block === from.block && to.row === from.row && to.col === from.col;
    const removed = deleteNode(blocks, from);
    const idx = sameCol && to.index > si ? to.index - 1 : to.index;
    return { blocks: insertElement(removed, { ...to, index: idx }, node as FunnelElement), ref: { block: to.block, row: to.row, col: to.col, el: from.el } };
  }
  return null;
}

/** Sibling move by keyboard (Alt+Arrow): delta -1 up/left, +1 down/right. */
export function nudge(blocks: FunnelBlock[], r: Ref, delta: -1 | 1): { blocks: FunnelBlock[]; ref: Ref } | null {
  const k = kindOf(r);
  const swap = <T,>(a: T[], i: number): T[] | null => { const j = i + delta; if (i < 0 || j < 0 || j >= a.length) return null; const c = [...a]; [c[i], c[j]] = [c[j], c[i]]; return c; };
  if (k === "block") { const n = swap(blocks, blocks.findIndex((b) => b.id === r.block)); return n ? { blocks: n, ref: r } : null; }
  let ok = false;
  const out = blocks.map((b) => {
    if (b.id !== r.block || b.type !== "section") return b;
    if (k === "row") { const n = swap(b.rows, b.rows.findIndex((x) => x.id === r.row)); if (n) { ok = true; return { ...b, rows: n }; } return b; }
    return { ...b, rows: b.rows.map((row) => {
      if (row.id !== r.row) return row;
      if (k === "column") { const n = swap(row.columns, row.columns.findIndex((c) => c.id === r.col)); if (n) { ok = true; return { ...row, widths: undefined, columns: n }; } return row; }
      return { ...row, columns: row.columns.map((c) => { if (c.id !== r.col) return c; const n = swap(c.elements, c.elements.findIndex((e) => e.id === r.el)); if (n) { ok = true; return { ...c, elements: n }; } return c; }) };
    }) };
  });
  return ok ? { blocks: out, ref: r } : null;
}

/** Changes how many columns a row has. Extra columns' elements move into the last remaining column (nothing is lost). */
export function setColumnCount(blocks: FunnelBlock[], r: Ref, count: number): FunnelBlock[] {
  const n = Math.min(6, Math.max(1, Math.round(count)));
  return mapNode(blocks, { block: r.block, row: r.row }, (node) => {
    const row = node as FunnelRow;
    if (n === row.columns.length) return row;
    let cols = row.columns;
    if (n > cols.length) cols = [...cols, ...Array.from({ length: n - cols.length }, () => newColumn())];
    else {
      const keep = cols.slice(0, n);
      const spill = cols.slice(n).flatMap((c) => c.elements);
      keep[n - 1] = { ...keep[n - 1], elements: [...keep[n - 1].elements, ...spill] };
      cols = keep;
    }
    return { ...row, columns: cols, widths: undefined };
  });
}

// --- copy / paste ----------------------------------------------------------------------------------

export type Clip = { kind: Kind; node: Node };
export const copyNode = (blocks: FunnelBlock[], r: Ref): Clip | null => { const node = getNode(blocks, r); return node ? { kind: kindOf(r), node: JSON.parse(JSON.stringify(node)) as Node } : null; };

/** Pastes a copied node after the selection (or into the selected column/section when kinds differ). */
export function pasteNode(blocks: FunnelBlock[], clip: Clip, at: Ref | null): { blocks: FunnelBlock[]; ref: Ref } | null {
  const fresh = reidentify(clip.node);
  if (!at) {
    if (clip.kind !== "block") return null;
    const b = fresh as FunnelBlock;
    return { blocks: [...blocks, b], ref: { block: b.id } };
  }
  const here = kindOf(at);
  if (clip.kind === here) return insertAfter(blocks, at, fresh);
  if (clip.kind === "element" && here === "column") {
    const col = getNode(blocks, at) as FunnelColumn;
    const e = fresh as FunnelElement;
    return { blocks: insertElement(blocks, { kind: "column", block: at.block, row: at.row!, col: at.col!, index: col.elements.length }, e), ref: { ...at, el: e.id } };
  }
  if (clip.kind === "row" && here === "block") {
    const b = blocks.find((x) => x.id === at.block);
    if (b?.type !== "section") return null;
    const r = fresh as FunnelRow;
    return { blocks: insertRow(blocks, at.block, b.rows.length, r), ref: { block: at.block, row: r.id } };
  }
  if (clip.kind === "block") {
    const bref: Ref = { block: at.block };
    return insertAfter(blocks, bref, fresh);
  }
  return null;
}

/** Clean a pasted/imported node the same way loaded documents are cleaned. */
export const sanitizeBlock = (raw: unknown) => cleanBlock(raw);
export const sanitizeElement = (raw: unknown) => cleanElement(raw);

// --- helpers for the UI ----------------------------------------------------------------------------

/** Make sure a section always has somewhere to drop an element. */
export function sectionWith(el: FunnelElement): FunnelBlock {
  const row = newRow(1);
  row.columns[0].elements.push(el);
  return { id: uid(), type: "section", rows: [row] };
}

/** The value the given device actually shows (mobile inherits tablet, which inherits desktop). */
export function effective<K extends keyof Resp>(resp: RespMap | undefined, device: Device, key: K): { value: Resp[K] | undefined; own: boolean } {
  if (device === "desktop") return { value: undefined, own: false };
  const own = resp?.[device]?.[key];
  if (own !== undefined) return { value: own, own: true };
  if (device === "mobile") { const t = resp?.tablet?.[key]; if (t !== undefined) return { value: t, own: false }; }
  return { value: undefined, own: false };
}

export type DocChange = { kind: "added" | "removed" | "changed"; text: string };

/** Plain-language summary of what an AI proposal would change, so the member can review before applying. */
export function diffDocs(before: { pages: FunnelPage[]; theme: FunnelTheme }, after: { pages: FunnelPage[]; theme: FunnelTheme }): DocChange[] {
  const out: DocChange[] = [];
  const label = (b: FunnelBlock) => BLOCK_LABELS[b.type]?.label ?? b.type;
  const beforeById = new Map(before.pages.map((p) => [p.id, p]));
  const afterIds = new Set(after.pages.map((p) => p.id));
  for (const p of before.pages) if (!afterIds.has(p.id)) out.push({ kind: "removed", text: `Page “${p.name}”` });
  for (const p of after.pages) {
    const old = beforeById.get(p.id);
    if (!old) { out.push({ kind: "added", text: `Page “${p.name}” with ${p.blocks.length} section${p.blocks.length === 1 ? "" : "s"}` }); continue; }
    if (old.name !== p.name) out.push({ kind: "changed", text: `Page renamed “${old.name}” → “${p.name}”` });
    const oldBlocks = new Map(old.blocks.map((b) => [b.id, b]));
    const newIds = new Set(p.blocks.map((b) => b.id));
    for (const b of old.blocks) if (!newIds.has(b.id)) out.push({ kind: "removed", text: `${label(b)} on “${p.name}”` });
    for (const b of p.blocks) {
      const o = oldBlocks.get(b.id);
      if (!o) out.push({ kind: "added", text: `${label(b)} on “${p.name}”` });
      else if (JSON.stringify(o) !== JSON.stringify(b)) out.push({ kind: "changed", text: `${label(b)} on “${p.name}”` });
    }
    const order = (x: FunnelBlock[]) => x.filter((b) => oldBlocks.has(b.id)).map((b) => b.id).join();
    if (order(p.blocks) !== old.blocks.filter((b) => newIds.has(b.id)).map((b) => b.id).join()) out.push({ kind: "changed", text: `Section order on “${p.name}”` });
  }
  const t0 = before.theme, t1 = after.theme;
  if (t0.style !== t1.style) out.push({ kind: "changed", text: `Style ${t0.style} → ${t1.style}` });
  if (t0.accent !== t1.accent) out.push({ kind: "changed", text: `Accent colour ${t0.accent} → ${t1.accent}` });
  if (t0.mode !== t1.mode) out.push({ kind: "changed", text: `Light/dark mode → ${t1.mode}` });
  return out;
}
