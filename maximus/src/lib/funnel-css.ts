import type { FunnelElement, FunnelPage, FunnelRow, FunnelBlock, Resp } from "@/lib/funnels";

/**
 * Responsive and layout CSS for a page, generated from the document. Everything in it comes from validated
 * ids, enums and numbers (never free text), so it is safe to inject. Breakpoints are container queries on the
 * page wrapper, so the builder's phone/tablet canvas reflows exactly like a real phone or tablet.
 */
const PAD: Record<string, string> = { compact: "2rem", normal: "3rem", roomy: "4.5rem" };
const GAP: Record<string, string> = { s: "1rem", m: "2rem", l: "3rem" };
const TABLET = "(max-width: 1023px)";
const MOBILE = "(max-width: 639px)";

const safeId = (id: string) => id.replace(/[^a-z0-9]/gi, "");

function respRules(sel: string, r: Resp | undefined, ghost: boolean, inner?: string): string {
  if (!r) return "";
  let out = "";
  if (r.hidden) out += ghost ? `${sel}{opacity:.3;outline:2px dashed #94a3b8;outline-offset:-2px}` : `${sel}{display:none !important}`;
  if (r.space && inner) out += `${sel} ${inner}{padding-top:${PAD[r.space]};padding-bottom:${PAD[r.space]}}`;
  if (typeof r.scale === "number" && inner) out += `${sel} ${inner}{zoom:${(r.scale / 100).toFixed(2)}}`;
  return out;
}

function rowCss(row: FunnelRow): string {
  const id = safeId(row.id);
  const n = row.columns.length;
  const cols = row.widths ?? `repeat(${n},1fr)`;
  const sel = `[data-row="${id}"]`;
  let out = `${sel}{grid-template-columns:${cols};gap:${GAP[row.gap ?? "m"]}}`;
  const stack = row.stack ?? "mobile";
  const stacked = `${sel}{grid-template-columns:1fr}` + (row.reverse ? `${sel}>*:nth-child(1){order:2}` : "");
  if (stack === "tablet") out += `@container fv ${TABLET}{${stacked}}`;
  else if (stack === "mobile") out += `@container fv ${MOBILE}{${stacked}}`;
  return out;
}

function elCss(el: FunnelElement, ghost: boolean): string {
  const sel = `[data-el="${safeId(el.id)}"]`;
  const t = respRules(sel, el.resp?.tablet, ghost);
  const m = respRules(sel, el.resp?.mobile, ghost);
  return (t ? `@container fv ${TABLET}{${t}}` : "") + (m ? `@container fv ${MOBILE}{${m}}` : "");
}

function blockCss(b: FunnelBlock, ghost: boolean): string {
  const sel = `[data-block="${safeId(b.id)}"]`;
  let out = "";
  if (b.type === "section") for (const row of b.rows) { out += rowCss(row); for (const c of row.columns) for (const e of c.elements) out += elCss(e, ghost); }
  const t = respRules(sel, b.resp?.tablet, ghost, ".fv-in");
  const m = respRules(sel, b.resp?.mobile, ghost, ".fv-in");
  return out + (t ? `@container fv ${TABLET}{${t}}` : "") + (m ? `@container fv ${MOBILE}{${m}}` : "");
}

const BASE = [
  ".fv-a{opacity:0;transition:opacity .6s ease,transform .6s ease}",
  ".fv-a-up{transform:translateY(24px)}.fv-a-left{transform:translateX(-28px)}.fv-a-right{transform:translateX(28px)}.fv-a-zoom{transform:scale(.94)}",
  ".fv-a.fv-vis{opacity:1;transform:none}",
  "@media (prefers-reduced-motion:reduce){.fv-a{opacity:1;transform:none;transition:none}}",
  ".fv-row{display:grid}",
].join("");

export function pageCss(page: FunnelPage, ghost = false): string {
  return BASE + page.blocks.map((b) => blockCss(b, ghost)).join("");
}
