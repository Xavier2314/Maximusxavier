import { parse } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";
import { cleanBlock, embedUrl, newBlock, newColumn, newElement, newRow, safeUrl, type FormField, type FunnelBlock, type FunnelColumn, type FunnelElement, type FunnelRow } from "@/lib/funnels";

type Node = DefaultTreeAdapterMap["node"];
type El = DefaultTreeAdapterMap["element"];
type Txt = DefaultTreeAdapterMap["textNode"];

export type HtmlImport = { title: string; blocks: FunnelBlock[]; warnings: string[]; stats: { sections: number; elements: number } };

export const MAX_HTML = 500_000;
const MAX_SECTIONS = 30, MAX_ELEMENTS = 400, MAX_PER_COLUMN = 14;

const isEl = (n: Node): n is El => "tagName" in n;
const isText = (n: Node): n is Txt => n.nodeName === "#text";
const attr = (e: El, name: string) => e.attrs.find((a) => a.name === name)?.value ?? "";
const kids = (n: Node): Node[] => ("childNodes" in n ? (n.childNodes as Node[]) : []);
const tag = (e: El) => e.tagName.toLowerCase();

// Never read into: scripts and styles, plugins, embedded documents we cannot control, and hidden machinery.
const SKIP = new Set(["script", "style", "noscript", "template", "svg", "canvas", "object", "embed", "link", "meta", "head", "title", "audio", "map", "dialog", "select", "option", "datalist"]);
const INLINE = new Set(["span", "a", "strong", "b", "em", "i", "u", "small", "mark", "code", "sup", "sub", "label", "abbr", "cite", "time", "s", "del", "ins", "font", "big", "q"]);
const WRAPPERS = new Set(["div", "section", "article", "main", "header", "footer", "aside", "figure", "figcaption", "center", "li", "ul-wrapper", "body", "span-block"]);

function plain(n: Node): string {
  if (isText(n)) return n.value;
  if (!isEl(n)) return "";
  const t = tag(n);
  if (SKIP.has(t)) return "";
  if (t === "br") return "\n";
  const inner = kids(n).map(plain).join("");
  return /^(p|div|li|h[1-6]|tr|section|article|blockquote)$/.test(t) ? `${inner}\n` : inner;
}
const clean = (s: string) => s.replace(/[ \t\f\r ]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
const textOf = (n: Node) => clean(plain(n));

const styleOf = (e: El) => attr(e, "style").toLowerCase();
const classOf = (e: El) => attr(e, "class").toLowerCase();

function hexOf(v: string): string {
  const m = v.match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/i);
  if (m) { const h = m[1]; return `#${h.length === 3 ? h.split("").map((c) => c + c).join("") : h}`.toLowerCase(); }
  const r = v.match(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
  if (r) return `#${[r[1], r[2], r[3]].map((x) => Math.min(255, Number(x)).toString(16).padStart(2, "0")).join("")}`;
  return "";
}
function bgOf(e: El): { color: string; image: string } {
  const st = styleOf(e);
  const color = hexOf((st.match(/background(?:-color)?\s*:\s*([^;]+)/)?.[1] ?? "").replace(/url\([^)]*\)/g, ""));
  const image = safeUrl((st.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/)?.[1] ?? "").trim());
  return { color, image };
}
const centered = (e: El) => /text-align\s*:\s*center/.test(styleOf(e)) || /\b(text-center|center|centered|has-text-centered)\b/.test(classOf(e));

type Ctx = { warnings: Set<string>; count: { n: number }; seenForms: number };
const warn = (c: Ctx, w: string) => c.warnings.add(w);
const take = (c: Ctx) => { c.count.n += 1; return c.count.n <= MAX_ELEMENTS; };

/** Turns a YouTube/Vimeo embed or watch address into the plain link the video element expects. Anything else is refused. */
function watchUrl(src: string): string {
  const yt = src.match(/^https?:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{6,20})/i);
  if (yt) return `https://www.youtube.com/watch?v=${yt[1]}`;
  const vm = src.match(/^https?:\/\/player\.vimeo\.com\/video\/(\d{4,12})/i);
  if (vm) return `https://vimeo.com/${vm[1]}`;
  return embedUrl(src) ? safeUrl(src) : "";
}
function buttonLike(e: El): boolean {
  const t = tag(e);
  if (t === "button") return attr(e, "type") !== "submit" || true;
  if (t !== "a") return false;
  return /\b(btn|button|cta)\b/.test(classOf(e)) || attr(e, "role") === "button";
}
function mkButton(e: El): FunnelElement {
  const b = newElement("button");
  const href = attr(e, "href").trim();
  const link = /^(#[a-z0-9_-]{0,40}|https?:\/\/[^\s<>"']+|(tel|mailto):[^\s<>"']+)$/i.test(href) && href !== "#" ? href : "#order";
  const look = /outline|secondary|ghost|border/.test(classOf(e)) ? "outline" : "solid";
  return { ...b, type: "button", text: textOf(e).slice(0, 40) || "Order now", link, look, full: false } as FunnelElement;
}
function mkImage(e: El, base: string, c: Ctx): FunnelElement {
  const el = newElement("image");
  const raw = (attr(e, "src") || attr(e, "data-src") || "").trim();
  let url = safeUrl(raw);
  if (!url && base && raw && !/^(data|javascript|blob):/i.test(raw)) { try { url = safeUrl(new URL(raw, base).toString()); } catch { /* bad relative link */ } }
  if (!url) warn(c, "Some pictures had no usable web address (inline or relative images). They were left empty so you can upload them.");
  return { ...el, type: "image", url, alt: attr(e, "alt").slice(0, 200) } as FunnelElement;
}
function mkHeading(e: El, level: number): FunnelElement {
  return { ...newElement("heading"), type: "heading", text: textOf(e).slice(0, 300), level: (level <= 1 ? 1 : level >= 4 ? 4 : level) as 1 | 2 | 3 | 4 } as FunnelElement;
}
function mkText(text: string): FunnelElement { return { ...newElement("text"), type: "text", text: text.slice(0, 1500) } as FunnelElement; }

function mkForm(f: El, c: Ctx): FunnelElement {
  const el = newElement("form");
  const inputs: El[] = [];
  const walk = (n: Node) => { if (isEl(n)) { if (["input", "textarea"].includes(tag(n))) inputs.push(n); kids(n).forEach(walk); } };
  kids(f).forEach(walk);
  const labels = new Map<string, string>();
  const wrapped = new Map<El, string>();
  const findLabels = (n: Node) => {
    if (!isEl(n)) return;
    if (tag(n) === "label") {
      const t = textOf(n);
      if (attr(n, "for")) labels.set(attr(n, "for"), t);
      const mark = (x: Node) => { if (isEl(x)) { if (["input", "textarea"].includes(tag(x))) wrapped.set(x, t); kids(x).forEach(mark); } };
      kids(n).forEach(mark);
    }
    kids(n).forEach(findLabels);
  };
  findLabels(f);
  const nameOf = (i: El) => `${attr(i, "name")} ${attr(i, "id")} ${attr(i, "placeholder")} ${attr(i, "type")}`.toLowerCase();
  let askPhone = false, askMessage = false, consent = "";
  const fields: FormField[] = [];
  for (const i of inputs) {
    const type = attr(i, "type").toLowerCase() || "text";
    if (["hidden", "submit", "button", "image", "reset", "password", "file"].includes(type)) continue;
    const n = nameOf(i);
    const label = (labels.get(attr(i, "id")) || wrapped.get(i) || attr(i, "placeholder") || attr(i, "aria-label") || attr(i, "name")).replace(/[_-]+/g, " ").trim();
    if (tag(i) === "textarea") { askMessage = true; continue; }
    if (type === "tel" || /phone|mobile|whatsapp/.test(n)) { askPhone = true; continue; }
    if (type === "email" || /\be?-?mail\b/.test(n)) continue;
    if (/\bname\b|fullname|first.?name/.test(n) && type === "text") continue;
    if (type === "checkbox") { if (/agree|consent|accept|terms|privacy/.test(`${label} ${n}`)) consent = label.slice(0, 200); else if (label) fields.push({ label: label.slice(0, 80), type: "checkbox", options: "", required: i.attrs.some((a) => a.name === "required") }); continue; }
    if (label) fields.push({ label: label.slice(0, 80), type: type === "number" ? "text" : (["text", "email", "tel"] as string[]).includes(type) ? (type as FormField["type"]) : "text", options: "", required: i.attrs.some((a) => a.name === "required") });
  }
  const heading = (() => { let h = ""; const w = (n: Node) => { if (!h && isEl(n)) { if (/^(h[1-6]|legend)$/.test(tag(n))) h = textOf(n); else kids(n).forEach(w); } }; kids(f).forEach(w); return h; })();
  const btn = (() => { let b = ""; const w = (n: Node) => { if (isEl(n) && !b) { if (tag(n) === "button") b = textOf(n); else if (tag(n) === "input" && /submit|button/.test(attr(n, "type"))) b = attr(n, "value"); else kids(n).forEach(w); } }; kids(f).forEach(w); return b; })();
  warn(c, "Forms were rebuilt as our own form: they save leads and orders in this app. Check the questions and wording.");
  return { ...el, type: "form", title: (heading || "Get in touch").slice(0, 120), text: "", buttonText: (btn || "Send").slice(0, 40), successMessage: "Thank you! We will be in touch shortly.", askPhone, askMessage, fields: fields.slice(0, 8), consent } as FunnelElement;
}

/** Reads one node's block-level content into elements (inline runs become one paragraph). */
function elementsOf(parent: Node, base: string, c: Ctx, align: boolean): FunnelElement[] {
  const out: FunnelElement[] = [];
  let run = "";
  const flush = () => { const t = clean(run); run = ""; if (t) out.push(mkText(t)); };
  const push = (e: FunnelElement | null) => { if (e && take(c)) out.push(align ? ({ ...e, align: "center" } as FunnelElement) : e); };
  for (const n of kids(parent)) {
    if (isText(n)) { run += n.value; continue; }
    if (!isEl(n)) continue;
    const t = tag(n);
    if (SKIP.has(t)) { if (t === "script") warn(c, "Scripts were removed."); continue; }
    if (t === "br") { run += "\n"; continue; }
    if (INLINE.has(t) && !buttonLike(n)) { run += plain(n); continue; }
    flush();
    if (/^h[1-6]$/.test(t)) { if (textOf(n)) push(mkHeading(n, Number(t[1]))); }
    else if (t === "p") {
      const only = kids(n).filter((x) => !(isText(x) && !x.value.trim()));
      if (only.length === 1 && isEl(only[0]) && buttonLike(only[0])) push(mkButton(only[0]));
      else if (only.length === 1 && isEl(only[0]) && tag(only[0]) === "img") push(mkImage(only[0], base, c));
      else if (textOf(n)) push(mkText(textOf(n)));
    }
    else if (t === "ul" || t === "ol") {
      const items = kids(n).filter((x): x is El => isEl(x) && tag(x) === "li").map((li) => textOf(li).replace(/\n+/g, " ")).filter(Boolean).slice(0, 20);
      if (items.length) push({ ...newElement("bullets"), type: "bullets", items: items.join("\n").slice(0, 1500), icon: t === "ol" ? "•" : "✓" } as FunnelElement);
    }
    else if (t === "img") push(mkImage(n, base, c));
    else if (t === "picture") { const img = kids(n).find((x): x is El => isEl(x) && tag(x) === "img"); if (img) push(mkImage(img, base, c)); }
    else if (buttonLike(n)) { if (textOf(n)) push(mkButton(n)); }
    else if (t === "hr") push(newElement("divider"));
    else if (t === "form") { if (++c.seenForms <= 3) push(mkForm(n, c)); }
    else if (t === "iframe" || t === "video") {
      const src = attr(n, "src") || attr(kids(n).find((x): x is El => isEl(x) && tag(x) === "source") ?? n, "src");
      const url = watchUrl(src);
      if (url) push({ ...newElement("video"), type: "video", url } as FunnelElement);
      else warn(c, "Embedded videos and frames from other sites were skipped. Only YouTube and Vimeo links are kept.");
    }
    else if (t === "blockquote") { if (textOf(n)) push(mkText(`“${textOf(n)}”`)); }
    else if (t === "details") {
      const q = textOf(kids(n).find((x): x is El => isEl(x) && tag(x) === "summary") ?? n);
      const a = clean(kids(n).filter((x) => !(isEl(x) && tag(x) === "summary")).map(plain).join(""));
      const last = out[out.length - 1];
      if (last && last.type === "faq") last.items.push({ q: q.slice(0, 200), a: a.slice(0, 800) });
      else push({ ...newElement("faq"), type: "faq", items: [{ q: q.slice(0, 200), a: a.slice(0, 800) }] } as FunnelElement);
    }
    else if (t === "table") { const rows = clean(kids(n).flatMap(function rowsOf(x: Node): string[] { return isEl(x) ? (tag(x) === "tr" ? [kids(x).map(textOf).filter(Boolean).join(" | ")] : kids(x).flatMap(rowsOf)) : []; }).join("\n")); if (rows) push(mkText(rows)); warn(c, "Tables were turned into plain text lines."); }
    else if (t === "nav") warn(c, "Navigation menus were skipped. A funnel has no menu on purpose, so visitors focus on one action.");
    else { /* generic block container reached through elementsOf: flatten */ out.push(...elementsOf(n, base, c, align || centered(n))); }
  }
  flush();
  return out;
}

const significant = (e: El): El[] => kids(e).filter((x): x is El => isEl(x) && !SKIP.has(tag(x)) && textOf(x).length + (hasImg(x) ? 1 : 0) > 0);
function hasImg(n: Node): boolean { return isEl(n) && (tag(n) === "img" || kids(n).some(hasImg)); }

function looksLikeGrid(e: El): boolean {
  const ch = significant(e).filter((x) => !/^(h[1-6]|p|ul|ol|img|a|button|form|hr|blockquote|details|table|nav)$/.test(tag(x)));
  if (ch.length < 2 || ch.length > 12 || ch.length !== significant(e).length) return false;
  if (!ch.every((x) => WRAPPERS.has(tag(x)))) return false;
  const hint = /\b(row|grid|flex|columns?|cols?|col-|card|cards|features?|items?|split|two|three|four|benefits?|steps?|pricing|plans?)\b/.test(`${classOf(e)} ${ch.map(classOf).join(" ")}`) || /display\s*:\s*(flex|grid)/.test(styleOf(e));
  const same = ch.every((x) => classOf(x) && classOf(x) === classOf(ch[0]));
  return hint || same;
}

function gridRows(n: El, base: string, c: Ctx, centeredCtx: boolean): FunnelRow[] {
  const out: FunnelRow[] = [];
  const cols = significant(n);
  const size = cols.length > 4 ? 3 : 4;
  for (let i = 0; i < cols.length; i += size) {
    const group = cols.slice(i, i + size);
    const row = newRow(group.length);
    row.columns = group.map((g) => {
      const inner = rowsOf(g, base, c, centeredCtx || centered(g) || centered(n), true);
      if (inner.length > 1 || inner.some((r) => r.columns.length > 1)) warn(c, "Layouts nested inside a column were flattened into one column.");
      return newColumn(inner.flatMap((r) => r.columns.flatMap((k) => k.elements)).slice(0, MAX_PER_COLUMN));
    });
    out.push(row);
  }
  return out;
}

function rowsOf(container: El, base: string, c: Ctx, centeredCtx: boolean, insideColumn = false): FunnelRow[] {
  if (!insideColumn && looksLikeGrid(container)) return gridRows(container, base, c, centeredCtx || centered(container));
  const out: FunnelRow[] = [];
  let pending: FunnelElement[] = [];
  const flushPending = () => { if (pending.length) { const col: FunnelColumn = newColumn(pending.slice(0, MAX_PER_COLUMN)); out.push({ ...newRow(1), columns: [col] }); pending = []; } };
  // Walk children; wrappers are either grids (columns) or plain wrappers (flattened).
  const nodes = kids(container);
  let run: Node[] = [];
  const flushRun = () => { if (!run.length) return; const holder = { nodeName: "div", tagName: "div", attrs: [], childNodes: run } as unknown as El; pending.push(...elementsOf(holder, base, c, centeredCtx)); run = []; };
  for (const n of nodes) {
    if (isEl(n) && WRAPPERS.has(tag(n)) && !SKIP.has(tag(n)) && significant(n).length + (isText(n) ? 0 : 0) >= 0 && (looksLikeGrid(n) || significant(n).some((x) => WRAPPERS.has(tag(x))))) {
      flushRun();
      if (looksLikeGrid(n)) {
        flushPending();
        out.push(...gridRows(n, base, c, centeredCtx || centered(n)));
      } else {
        const inner = rowsOf(n, base, c, centeredCtx || centered(n), insideColumn);
        if (inner.length === 1 && inner[0].columns.length === 1) pending.push(...inner[0].columns[0].elements);
        else { flushPending(); out.push(...inner); }
      }
    } else run.push(n);
  }
  flushRun();
  flushPending();
  return out;
}

/** Converts a page of HTML into editable funnel sections. Only content is carried across: scripts, styles, event handlers and unknown attributes are never read. */
export function htmlToBlocks(html: string, opts: { baseUrl?: string } = {}): HtmlImport {
  const warnings = new Set<string>();
  const c: Ctx = { warnings, count: { n: 0 }, seenForms: 0 };
  const src = String(html ?? "").slice(0, MAX_HTML);
  if (/<script\b/i.test(src)) warnings.add("Scripts were removed.");
  const doc = parse(src);
  let title = "";
  const findTitle = (n: Node) => { if (!title && isEl(n) && tag(n) === "title") title = clean(kids(n).filter(isText).map((x) => x.value).join("")).slice(0, 80); else kids(n).forEach(findTitle); };
  findTitle(doc as unknown as Node);
  const body = (function find(n: Node): El | null { if (isEl(n) && tag(n) === "body") return n; for (const k of kids(n)) { const r = find(k); if (r) return r; } return null; })(doc as unknown as Node);
  if (!body) return { title, blocks: [], warnings: [...warnings], stats: { sections: 0, elements: 0 } };

  // Step into single wrapper elements (a page wrapped in <div id="app"> or <main>).
  let root: El = body;
  for (let i = 0; i < 3; i++) {
    const sig = significant(root).filter((x) => tag(x) !== "nav");
    const loose = kids(root).some((x) => isText(x) && x.value.trim());
    if (sig.length === 1 && !loose && WRAPPERS.has(tag(sig[0]))) root = sig[0]; else break;
  }

  if ((function hasNav(n: Node): boolean { return (isEl(n) && tag(n) === "nav") || kids(n).some(hasNav); })(body)) warnings.add("Navigation menus were skipped. A funnel has no menu on purpose, so visitors focus on one action.");
  const blocks: FunnelBlock[] = [];
  const addSection = (rows: FunnelRow[], from?: El) => {
    if (!rows.length || blocks.length >= MAX_SECTIONS) return;
    const sec = newBlock("section") as Extract<FunnelBlock, { type: "section" }>;
    sec.rows = rows.slice(0, 12);
    if (from) {
      const bg = bgOf(from);
      if (bg.image) { sec.bg = "image"; sec.bgImage = bg.image; } else if (bg.color && bg.color !== "#ffffff") { sec.bg = "custom"; sec.bgColor = bg.color; }
    }
    const cleaned = cleanBlock(sec);
    if (cleaned) blocks.push(cleaned);
  };

  const top = kids(root);
  let loose: Node[] = [];
  const flushLoose = () => { if (loose.length) { const holder = { nodeName: "div", tagName: "div", attrs: [], childNodes: loose } as unknown as El; addSection(rowsOf(holder, opts.baseUrl ?? "", c, false)); loose = []; } };
  for (const n of top) {
    if (isEl(n) && !SKIP.has(tag(n)) && /^(section|header|footer|main|article|div|aside)$/.test(tag(n))) { flushLoose(); addSection(rowsOf(n, opts.baseUrl ?? "", c, centered(n)), n); }
    else loose.push(n);
  }
  flushLoose();
  if (c.count.n > MAX_ELEMENTS) warnings.add("The page was very large, so only the first part was imported.");
  const elements = blocks.reduce((a, b) => a + (b.type === "section" ? b.rows.reduce((x, r) => x + r.columns.reduce((y, k) => y + k.elements.length, 0), 0) : 0), 0);
  if (/@media|font-family|<link[^>]+stylesheet/i.test(src)) warnings.add("Your own CSS and fonts are not carried over. Pick a look in Design, or ask the AI to rebuild the page in one of our styles.");
  return { title, blocks, warnings: [...warnings], stats: { sections: blocks.length, elements } };
}
