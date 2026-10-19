import { createElement, type CSSProperties, type ElementType, type ReactNode } from "react";
import type { Ref } from "@/lib/funnel-doc";
import { pageCss } from "@/lib/funnel-css";
import { palette, rgba, SPACING, tokens, type Pal } from "@/lib/funnel-styles";
import { embedUrl, type Anim, type FunnelBlock, type FunnelColumn, type FunnelElement, type FunnelPage, type FunnelRow, type FunnelTheme } from "@/lib/funnels";
import { Reveal, ProductGallery } from "./funnel-bits";
import { Countdown, FunnelForm, LocalDate, type FormUi } from "./funnel-form";

export type EditApi = { onText: (blockId: string, path: (string | number)[], value: string) => void };
export type NodeKind = "block" | "row" | "column" | "element";
export type WrapMeta = { index: number; count: number };

export type FunnelViewProps = {
  slug: string;
  theme: FunnelTheme;
  page: FunnelPage;
  /** Where "#next" buttons and forms send the visitor: the next page of the funnel. */
  nextHref?: string;
  /** Owner's WhatsApp number (digits only), shown after an order if they allowed it. */
  whatsapp?: string;
  /** Merge fields the seller typed (business.name, business.phone, ...). Unknown fields render as nothing. */
  merge?: Record<string, string>;
  /** Builder preview: forms don't send anything. */
  preview?: boolean;
  /** Builder: makes text editable right on the page and shows per-device hidden items faded instead of removed. */
  edit?: EditApi;
  /** Lets the builder wrap every node (select, drag, toolbar). */
  wrap?: (kind: NodeKind, ref: Ref, node: ReactNode, meta: WrapMeta) => ReactNode;
};

const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
const MERGE_RE = /\{\{\s*([a-z_]+\.[a-z_]+)\s*\}\}/gi;
const ALIGN = (a?: string) => (a === "center" ? "text-center" : "text-left");
const PADS: Record<string, string> = { compact: "1rem", normal: "1.5rem", roomy: "2.5rem" };
const SOCIAL: Record<string, string> = { facebook: "f", instagram: "ig", whatsapp: "wa", tiktok: "tt", youtube: "yt", x: "x", linkedin: "in", telegram: "tg" };
const RATIO: Record<string, string> = { "1:1": "1 / 1", "4:3": "4 / 3", "16:9": "16 / 9", "3:4": "3 / 4" };
const H1 = "clamp(2.1rem, 1.2rem + 5.2cqw, 4.25rem)";
const H2 = "clamp(1.6rem, 0.9rem + 3.6cqw, 2.6rem)";

export function FunnelView({ slug, theme, page, nextHref, whatsapp, merge, preview, edit, wrap }: FunnelViewProps) {
  const t = tokens(theme);
  const st = t.style;
  const firstForm = page.blocks.find((b) => b.type === "order_form" || b.type === "lead_form")?.id;
  const hasForm = Boolean(firstForm) || page.blocks.some((b) => b.type === "section" && b.rows.some((r) => r.columns.some((c) => c.elements.some((e) => e.type === "form"))));
  const orderHref = hasForm ? "#order" : nextHref ?? "#order";

  /** Merge fields: resolved on the live page, kept visible as {{field}} while editing. */
  const fill = (v: string) => (edit || !v.includes("{{") ? v : v.replace(MERGE_RE, (_, k: string) => merge?.[k.toLowerCase()] ?? ""));
  const resolve = (l: string) => {
    if (l === "#next") return nextHref ?? "#order";
    if (l === "#order") return orderHref;
    const f = fill(l);
    return /^(https?:|mailto:|tel:)/i.test(f) ? f.replace(/\s/g, "") : f.startsWith("#") ? f : "#";
  };

  const heading = (size: string, extra: CSSProperties = {}): CSSProperties => ({ fontFamily: st.heading, fontWeight: st.weight, letterSpacing: st.tracking, lineHeight: 1.08, fontSize: size, ...extra });
  const wrapN = (kind: NodeKind, ref: Ref, node: ReactNode, meta: WrapMeta) => (wrap ? wrap(kind, ref, node, meta) : node);
  const anim = (node: ReactNode, a?: Anim) => (!edit && a && a !== "none" ? <Reveal anim={a}>{node}</Reveal> : node);

  /** Text that becomes editable on the builder canvas. */
  const T = (id: string, path: (string | number)[], value: string, tag: ElementType, className = "", style?: CSSProperties, ph = "Type here", multi = false) => {
    if (!edit) { const v = fill(value); return v ? createElement(tag, { className, style }, v) : null; }
    return createElement(tag, {
      className: `${className} cursor-text rounded-sm outline-none focus:outline-2 focus:outline-dashed focus:outline-offset-2 focus:outline-[#6366f1] empty:before:opacity-50 empty:before:content-[attr(data-ph)]`,
      style, contentEditable: true, suppressContentEditableWarning: true, "data-ph": ph, spellCheck: true,
      onKeyDown: (e: { key: string; preventDefault: () => void; currentTarget: HTMLElement }) => { if (e.key === "Enter" && !multi) { e.preventDefault(); e.currentTarget.blur(); } },
      onBlur: (e: { currentTarget: HTMLElement }) => {
        const v = (e.currentTarget.innerText ?? "").replace(/ /g, " ").trim();
        if (v !== value) edit.onText(id, path, v);
      },
    }, value);
  };

  const radiusOf = (r?: string) => (r === "none" ? 0 : r === "round" ? 28 : st.radius);
  const cardStyle = (pal: Pal): CSSProperties => {
    const base: CSSProperties = { borderRadius: st.radius, background: pal.card, border: `1px solid ${pal.line}` };
    if (st.card === "neo") return { ...base, border: `2px solid ${pal.onDark ? pal.line : t.text}`, boxShadow: `6px 6px 0 ${pal.onDark ? pal.line : t.text}` };
    if (st.card === "glass") return { ...base, background: pal.onDark ? "rgba(255,255,255,0.06)" : pal.card, backdropFilter: "blur(8px)" };
    if (st.card === "flat") return { ...base, borderRadius: Math.min(st.radius, 8) };
    return { ...base, boxShadow: pal.onDark ? "none" : "0 1px 2px rgba(15,23,42,.05), 0 8px 24px -12px rgba(15,23,42,.12)" };
  };

  const btnStyle = (pal: Pal, big = true): CSSProperties => ({
    background: pal.btnBg, color: pal.btnText, borderRadius: st.btnRadius, fontFamily: st.body, fontWeight: 700,
    padding: big ? "1rem 1.75rem" : "0.7rem 1.25rem", fontSize: big ? "1.05rem" : "0.95rem", display: "inline-flex", alignItems: "center", justifyContent: "center", textAlign: "center",
    ...(st.btn === "neo" ? { border: `2px solid ${pal.onDark ? "#fff" : t.text}`, boxShadow: `4px 4px 0 ${pal.onDark ? "#fff" : t.text}` } : { boxShadow: pal.bgCss === "transparent" || pal.bgCss === t.alt ? `0 10px 24px -10px ${rgba(t.accent, 0.55)}` : "0 6px 18px -8px rgba(0,0,0,.35)" }),
  });

  const Btn = (id: string, textPath: (string | number)[], label: string, link: string, pal: Pal, big = true, extra = "", styleOver?: CSSProperties) => {
    if (!label && !edit) return null;
    return (
      <a href={resolve(link || "#order")} className={`transition-transform hover:-translate-y-0.5 active:scale-[0.98] ${extra}`} style={{ ...btnStyle(pal, big), ...styleOver }}>
        {T(id, textPath, label, "span", "", undefined, "Button text")}
      </a>
    );
  };

  const ui = (pal: Pal): FormUi => ({
    inputBg: pal.onDark ? "rgba(255,255,255,0.08)" : t.dark ? t.surface : "#ffffff", text: pal.onDark ? "#f8fafc" : t.text, border: pal.onDark ? "rgba(255,255,255,0.28)" : st.card === "neo" ? t.text : t.dark ? t.line : "#cbd5e1",
    accent: t.accent, btnBg: pal.btnBg, btnText: pal.btnText, btnStyle: btnStyle(pal), mute: pal.mute, radius: Math.min(st.radius, 14), neo: st.btn === "neo",
  });

  const shell = (b: FunnelBlock, pal: Pal, inner: ReactNode, opts: { width?: string; id?: string; bgOverride?: string; extra?: ReactNode; space?: string } = {}) => (
    <section id={opts.id} className="relative scroll-mt-4 overflow-hidden" style={{ background: opts.bgOverride ?? pal.bgCss, color: pal.text, fontFamily: st.body }}>
      {opts.extra}
      <div className={`fv-in relative mx-auto px-5 ${SPACING[opts.space ?? b.space ?? "normal"]} ${opts.width ?? "max-w-5xl"}`}>{inner}</div>
    </section>
  );
  const pb = (b: FunnelBlock, def: Parameters<typeof palette>[2] = "none") => palette(t, b.bg, def, { color: b.bgColor, image: b.bgImage });

  const sectionTitle = (b: FunnelBlock, value: string, pal: Pal, align: string, extra = "") =>
    T(b.id, ["title"], value, "h2", `${align === "left" ? "text-left" : "text-center"} ${extra}`, heading(H2, { color: pal.text }), "Heading");

  // --- Elements (inside Section > Row > Column) ---------------------------------------------------------
  const renderEl = (b: FunnelBlock & { type: "section" }, ri: number, ci: number, ei: number, el: FunnelElement, cp: Pal, defAlign: string): ReactNode => {
    const id = b.id;
    const row = b.rows[ri], col = row.columns[ci];
    const path = ["rows", ri, "columns", ci, "elements", ei];
    const al = el.align ?? defAlign;
    switch (el.type) {
      case "heading": {
        const tag = (`h${el.level}`) as ElementType;
        const size = el.level === 1 ? H1 : el.level === 2 ? H2 : el.level === 3 ? "1.45rem" : "1.15rem";
        return T(id, [...path, "text"], el.text, tag, ALIGN(al), heading(size, { color: cp.text }), "Headline");
      }
      case "text":
        return T(id, [...path, "text"], el.text, "p", `whitespace-pre-line text-lg leading-relaxed ${ALIGN(al)}`, { color: cp.mute }, "Write your text", true);
      case "bullets": {
        const items = el.items.split("\n").map((x) => x.trim()).filter(Boolean);
        return (
          <ul className="space-y-2.5">
            {items.map((x, n) => <li key={n} className="flex gap-3 text-lg"><span className="mt-0.5 shrink-0 font-bold" style={{ color: cp.accentText }}>{el.icon || "✓"}</span><span style={{ color: cp.text }}>{fill(x)}</span></li>)}
            {!items.length && edit && <li className="text-sm opacity-60">Add points in the settings panel.</li>}
          </ul>
        );
      }
      case "button": {
        const over: CSSProperties = el.look === "outline" ? { background: "transparent", color: cp.accentText, border: `2px solid ${cp.accentText}`, boxShadow: "none" } : el.look === "soft" ? { background: rgba(t.accent, 0.14), color: cp.accentText, boxShadow: "none" } : {};
        return <div className={ALIGN(al)}>{Btn(id, [...path, "text"], el.text, el.link, cp, true, el.full ? "w-full" : "", over)}</div>;
      }
      case "image": {
        if (!el.url) return edit ? <div className="grid aspect-video place-items-center text-sm opacity-60" style={{ borderRadius: radiusOf(el.radius), background: rgba(t.accent, 0.1) }}>Add an image in the settings panel</div> : null;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={el.url} alt={fill(el.alt)} loading="lazy" className="w-full" style={{ borderRadius: radiusOf(el.radius), objectFit: el.fit, aspectRatio: el.ratio === "auto" ? undefined : RATIO[el.ratio] }} />
        );
      }
      case "video": {
        const src = embedUrl(el.url);
        return src ? (
          <figure>
            <div className="aspect-video overflow-hidden" style={{ borderRadius: st.radius }}><iframe src={src} title={el.caption || "Video"} className="size-full" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div>
            {el.caption && <figcaption className="mt-2 text-center text-sm" style={{ color: cp.mute }}>{fill(el.caption)}</figcaption>}
          </figure>
        ) : edit ? <p className="text-sm opacity-60">Paste a YouTube or Vimeo link in the settings panel.</p> : null;
      }
      case "divider": return <hr style={{ borderColor: cp.line }} />;
      case "spacer": return <div style={{ height: el.size === "l" ? 64 : el.size === "s" ? 16 : 32 }} aria-hidden />;
      case "icon":
        return (
          <div className={`flex gap-4 ${al === "center" ? "flex-col items-center text-center" : ""}`}>
            <span className="grid size-12 shrink-0 place-items-center text-2xl" style={{ borderRadius: Math.min(st.radius, 14), background: cp.onDark ? "rgba(255,255,255,.14)" : rgba(t.accent, 0.12) }}>{el.emoji || "✨"}</span>
            <div>{T(id, [...path, "title"], el.title, "h3", "text-lg font-bold", { color: cp.text, fontFamily: st.heading }, "Title")}{(el.text || edit) && T(id, [...path, "text"], el.text, "p", "mt-1", { color: cp.mute }, "Details", true)}</div>
          </div>
        );
      case "social": {
        const items = el.items.filter((x) => x.url || edit);
        return (
          <div className={`flex flex-wrap gap-2.5 ${al === "center" ? "justify-center" : ""}`}>
            {items.map((x, n) => (
              <a key={n} href={x.url || "#"} target="_blank" rel="noopener noreferrer" aria-label={x.platform} className="grid size-11 place-items-center text-sm font-bold uppercase" style={{ borderRadius: 999, background: cp.btnBg, color: cp.btnText, opacity: x.url ? 1 : 0.4 }}>{SOCIAL[x.platform] ?? x.platform[0]}</a>
            ))}
          </div>
        );
      }
      case "countdown":
        return <Countdown label={el.label} endsAt={el.endsAt} bg={cp.btnBg} color={cp.btnText} radius={Math.min(st.radius, 16)} text={cp.text} />;
      case "progress":
        return (
          <div>
            {(el.label || edit) && <p className="mb-2 flex justify-between text-sm font-semibold" style={{ color: cp.text }}>{T(id, [...path, "label"], el.label, "span", "", undefined, "Label")}<span>{el.value}%</span></p>}
            <div className="h-3 overflow-hidden rounded-full" style={{ background: cp.line }} role="progressbar" aria-valuenow={el.value} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full" style={{ width: `${el.value}%`, background: cp.btnBg }} /></div>
          </div>
        );
      case "faq":
        return (
          <div className="space-y-3">
            {el.items.map((i, n) => (
              <details key={n} className="group p-4" style={cardStyle(cp)} open={edit ? true : undefined}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold" style={{ color: cp.text }}>{T(id, [...path, "items", n, "q"], i.q, "span", "", undefined, "Question")}<span className="shrink-0 text-xl transition-transform group-open:rotate-45" style={{ color: cp.accentText }} aria-hidden>+</span></summary>
                {T(id, [...path, "items", n, "a"], i.a, "p", "mt-3 whitespace-pre-line", { color: cp.mute }, "Answer", true)}
              </details>
            ))}
          </div>
        );
      case "form": {
        const fb = { id: el.id, type: "lead_form" as const, title: el.title, text: el.text, buttonText: el.buttonText, successMessage: el.successMessage, askPhone: el.askPhone, askMessage: el.askMessage, imageUrl: "" };
        return (
          <div className="p-6" style={cardStyle(cp)}>
            {(el.title || edit) && T(id, [...path, "title"], el.title, "h3", "text-xl font-bold", { color: cp.text, fontFamily: st.heading }, "Form heading")}
            {(el.text || edit) && T(id, [...path, "text"], el.text, "p", "mb-4 mt-1", { color: cp.mute }, "Short text", true)}
            <FunnelForm block={fb} slug={slug} pageId={page.id} nextHref={nextHref} whatsapp={whatsapp} ui={ui(cp)} preview={preview} editLabels={edit ? { onText: (p2, v) => edit.onText(id, [...path, ...p2], v) } : undefined} />
          </div>
        );
      }
    }
    void row; void col;
  };

  const renderSection = (b: FunnelBlock & { type: "section" }): ReactNode => {
    const pal = pb(b);
    const al = b.align ?? "left";
    const rows = b.rows.map((row: FunnelRow, ri) => {
      const cols = row.columns.map((col: FunnelColumn, ci) => {
        const cp = col.bg ? palette(t, col.bg, "none", { color: col.bgColor }) : pal;
        const boxed = Boolean(col.bg || col.radius || col.shadow || col.pad);
        const style: CSSProperties = {
          display: "flex", flexDirection: "column", gap: "1.1rem", minWidth: 0,
          justifyContent: col.vAlign === "center" ? "center" : col.vAlign === "bottom" ? "flex-end" : "flex-start",
          ...(boxed ? { padding: PADS[col.pad ?? "normal"], borderRadius: radiusOf(col.radius ?? "soft"), ...(col.bg ? { background: cp.bgCss, color: cp.text } : {}), boxShadow: col.shadow === "strong" ? "0 24px 48px -16px rgba(15,23,42,.35)" : col.shadow === "soft" ? "0 8px 24px -12px rgba(15,23,42,.25)" : undefined } : {}),
        };
        const els = col.elements.map((el, ei) => {
          const ref: Ref = { block: b.id, row: row.id, col: col.id, el: el.id };
          return <div key={el.id} data-el={el.id}>{wrapN("element", ref, anim(renderEl(b, ri, ci, ei, el, cp, al), el.anim), { index: ei, count: col.elements.length })}</div>;
        });
        const node = (
          <div data-col={col.id} style={style}>
            {els}
            {edit && !col.elements.length && <div className="grid min-h-20 place-items-center rounded-lg border-2 border-dashed text-xs opacity-70" style={{ borderColor: cp.line }}>Drop an element here</div>}
          </div>
        );
        return <div key={col.id} style={{ minWidth: 0 }}>{wrapN("column", { block: b.id, row: row.id, col: col.id }, node, { index: ci, count: row.columns.length })}</div>;
      });
      return <div key={row.id}>{wrapN("row", { block: b.id, row: row.id }, <div className="fv-row" data-row={row.id}>{cols}</div>, { index: ri, count: b.rows.length })}</div>;
    });
    return shell(b, pal, <div className="space-y-8">{rows}{edit && !b.rows.length && <p className="py-8 text-center text-sm opacity-70">This section has no rows. Add a row from the Add panel.</p>}</div>, { width: "max-w-6xl" });
  };

  // --- Sections (the smart, ready-made blocks) -----------------------------------------------------------
  const render = (b: FunnelBlock): ReactNode => {
    const align = b.align ?? (st.heroAlign === "left" && b.type !== "benefits" ? "left" : "center");
    const id = b.id;
    switch (b.type) {
      case "section": return renderSection(b);

      case "announcement": {
        const pal = palette(t, b.bg ?? (st.btn === "gradient" ? "gradient" : "accent"), "none", { color: b.bgColor });
        const inner = <p className="px-5 py-2.5 text-center text-sm font-semibold" style={{ color: pal.text }}>{T(id, ["text"], b.text, "span", "", undefined, "Announcement")}</p>;
        return <div style={{ background: pal.bgCss, fontFamily: st.body }}>{b.link ? <a href={resolve(b.link)}>{inner}</a> : inner}</div>;
      }

      case "hero": {
        const variant = b.variant ?? "center";
        const defaultBg = st.hero === "dark" || st.hero === "glow" ? "dark" : "none";
        const pal = pb(b, defaultBg);
        const heroBg = b.bg ? pal.bgCss : st.hero === "tint" ? `linear-gradient(180deg, ${rgba(t.accent, t.dark ? 0.18 : 0.12)}, transparent 85%)` : st.hero === "dark" ? `radial-gradient(60% 80% at 80% 0%, ${rgba(t.accent, 0.55)}, transparent 60%), linear-gradient(160deg, #0b1020, #141a33)` : st.hero === "glow" ? `radial-gradient(50% 60% at 50% 0%, ${rgba(t.accent, 0.35)}, transparent 70%), ${t.bg}` : "transparent";
        const dark = pal.onDark || ((st.hero === "dark" || st.hero === "glow") && !b.bg);
        const text = dark ? "#f8fafc" : pal.text;
        const mute = dark ? "#cbd5e1" : pal.mute;
        const hp: Pal = dark ? { ...pal, text, mute, onDark: true, btnBg: palette(t, "none").btnBg, btnText: palette(t, "none").btnText } : pal;
        const left = variant === "split" || align === "left";
        const copy = (
          <div className={left ? "text-left" : "text-center"}>
            {(b.badge || edit) && <span className="mb-5 inline-block rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider" style={{ background: dark ? "rgba(255,255,255,.12)" : rgba(t.accent, 0.12), color: dark ? "#fff" : t.accent }}>{T(id, ["badge"], b.badge, "span", "", undefined, "Badge (optional)")}</span>}
            {T(id, ["headline"], b.headline, "h1", "", heading(H1, { color: text }), "Your headline")}
            {(b.subheadline || edit) && T(id, ["subheadline"], b.subheadline, "p", `mt-5 text-lg @min-[640px]:text-xl ${left ? "" : "mx-auto max-w-2xl"}`, { color: mute, lineHeight: 1.55 }, "Sub-headline", true)}
            {(b.buttonText || edit) && <div className="mt-8">{Btn(id, ["buttonText"], b.buttonText, b.buttonLink, hp)}</div>}
          </div>
        );
        const pic = b.imageUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={b.imageUrl} alt="" className="w-full object-cover" style={{ borderRadius: st.radius + 6, aspectRatio: variant === "split" ? "1 / 1" : "16 / 9", boxShadow: "0 30px 60px -25px rgba(0,0,0,.45)", border: st.card === "neo" ? `2px solid ${t.text}` : undefined }} />
          : null;
        if (variant === "cover") {
          return (
            <section className="relative overflow-hidden" style={{ background: b.imageUrl ? `#0b1020 url("${b.imageUrl.replace(/[()]/g, encodeURIComponent)}") center/cover` : heroBg, color: "#f8fafc", fontFamily: st.body }}>
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(5,8,20,.55), rgba(5,8,20,.8))" }} />
              <div className={`fv-in relative mx-auto max-w-3xl px-5 ${SPACING[b.space ?? "roomy"]}`}>{copy}</div>
            </section>
          );
        }
        return (
          <section className="relative overflow-hidden" style={{ background: heroBg, color: text, fontFamily: st.body }}>
            <div className={`fv-in relative mx-auto px-5 ${SPACING[b.space ?? "roomy"]} ${variant === "split" ? "max-w-6xl" : "max-w-4xl"}`}>
              {variant === "split" ? (
                <div className="grid items-center gap-10 @min-[768px]:grid-cols-2">{copy}{pic ?? <div className="aspect-square w-full" style={{ borderRadius: st.radius + 6, background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`, opacity: 0.85 }} aria-hidden />}</div>
              ) : (
                <>{copy}{pic && <div className="mx-auto mt-12 max-w-3xl">{pic}</div>}</>
              )}
            </div>
          </section>
        );
      }

      case "text": {
        const pal = pb(b);
        const al = b.align ?? "left";
        return shell(b, pal, (
          <div className={al === "center" ? "text-center" : "text-left"}>
            {(b.title || edit) && T(id, ["title"], b.title, "h2", "", heading(H2, { color: pal.text }), "Heading")}
            {(b.body || edit) && T(id, ["body"], b.body, "p", "mt-4 whitespace-pre-line text-lg leading-relaxed", { color: pal.mute }, "Write your text", true)}
          </div>
        ), { width: "max-w-3xl" });
      }

      case "benefits": {
        const pal = pb(b);
        const v = b.variant ?? "cards";
        const items = b.items;
        const head = (
          <div className="mb-10 text-center">
            {sectionTitle(b, b.title, pal, "center")}
            {(b.subtitle || edit) && T(id, ["subtitle"], b.subtitle, "p", "mx-auto mt-3 max-w-2xl text-lg", { color: pal.mute }, "Sub-heading (optional)")}
          </div>
        );
        const dot = (ic: string) => <span className="grid size-11 shrink-0 place-items-center text-xl" style={{ borderRadius: Math.min(st.radius, 14), background: pal.onDark ? "rgba(255,255,255,.14)" : rgba(t.accent, 0.12), color: pal.onDark ? pal.text : t.accent }}>{ic || "✓"}</span>;
        return shell(b, pal, (
          <>
            {head}
            {v === "list" ? (
              <ul className="mx-auto grid max-w-3xl gap-x-8 gap-y-4 @min-[640px]:grid-cols-2">
                {items.map((i, n) => (
                  <li key={n} className="flex gap-3">{dot("✓")}<span>{T(id, ["items", n, "title"], i.title, "span", "block font-semibold", { color: pal.text }, "Benefit")}{(i.text || edit) && T(id, ["items", n, "text"], i.text, "span", "block text-[15px]", { color: pal.mute }, "Details (optional)")}</span></li>
                ))}
              </ul>
            ) : v === "icons" ? (
              <ul className={`grid gap-8 @min-[640px]:grid-cols-2 ${items.length === 4 ? "@min-[1024px]:grid-cols-4" : "@min-[1024px]:grid-cols-3"}`}>
                {items.map((i, n) => (
                  <li key={n} className="text-center"><span className="mx-auto mb-3 grid size-16 place-items-center text-3xl" style={{ borderRadius: 999, background: pal.onDark ? "rgba(255,255,255,.14)" : rgba(t.accent, 0.12) }}>{i.icon || "✨"}</span>{T(id, ["items", n, "title"], i.title, "h3", "text-lg font-bold", { color: pal.text, fontFamily: st.heading }, "Benefit")}{(i.text || edit) && T(id, ["items", n, "text"], i.text, "p", "mt-1", { color: pal.mute }, "Details", true)}</li>
                ))}
              </ul>
            ) : (
              <ul className={`grid gap-4 @min-[640px]:grid-cols-2 ${items.length === 4 ? "@min-[1024px]:grid-cols-2" : "@min-[1024px]:grid-cols-3"}`}>
                {items.map((i, n) => (
                  <li key={n} className="p-6" style={cardStyle(pal)}>{dot(i.icon)}<div className="mt-4">{T(id, ["items", n, "title"], i.title, "h3", "text-lg font-bold", { color: pal.text, fontFamily: st.heading }, "Benefit")}{(i.text || edit) && T(id, ["items", n, "text"], i.text, "p", "mt-1.5", { color: pal.mute }, "Details", true)}</div></li>
                ))}
              </ul>
            )}
          </>
        ));
      }

      case "steps": {
        const pal = pb(b);
        const col = b.variant === "column";
        return shell(b, pal, (
          <>
            <div className="mb-10">{sectionTitle(b, b.title, pal, "center")}</div>
            <ol className={col ? "mx-auto max-w-2xl space-y-6" : `grid gap-8 ${b.items.length === 3 ? "@min-[640px]:grid-cols-3" : b.items.length === 2 ? "@min-[640px]:grid-cols-2" : "@min-[640px]:grid-cols-2 @min-[1024px]:grid-cols-3"}`}>
              {b.items.map((i, n) => (
                <li key={n} className={col ? "flex gap-4" : "text-center"}>
                  <span className={`grid size-12 shrink-0 place-items-center text-lg font-extrabold ${col ? "" : "mx-auto mb-3"}`} style={{ borderRadius: 999, background: pal.btnBg, color: pal.btnText, fontFamily: st.heading }}>{n + 1}</span>
                  <div>{T(id, ["items", n, "title"], i.title, "h3", "text-lg font-bold", { color: pal.text, fontFamily: st.heading }, "Step")}{(i.text || edit) && T(id, ["items", n, "text"], i.text, "p", "mt-1", { color: pal.mute }, "Details", true)}</div>
                </li>
              ))}
            </ol>
          </>
        ));
      }

      case "product": {
        const pal = pb(b);
        const v = b.variant ?? "split";
        const photos = [b.imageUrl, ...b.images].filter(Boolean);
        const pts = b.points.split("\n").map((x) => x.trim()).filter(Boolean);
        const pic = photos.length
          ? <ProductGallery images={photos} alt={b.name} radius={st.radius} accent={t.accent} />
          : <div className="aspect-square w-full" style={{ borderRadius: st.radius, background: `linear-gradient(135deg, ${rgba(t.accent, 0.25)}, ${rgba(t.accent2, 0.25)})` }} aria-hidden />;
        const info = (
          <div className={v === "stacked" ? "text-center" : ""}>
            {T(id, ["name"], b.name, "h2", "", heading(H2, { color: pal.text }), "Product name")}
            <p className={`mt-3 flex items-baseline gap-3 ${v === "stacked" ? "justify-center" : ""}`}>
              {(b.price || edit) && T(id, ["price"], b.price, "span", "text-4xl font-extrabold", { color: pal.accentText, fontFamily: st.heading }, "Price")}
              {(b.oldPrice || edit) && T(id, ["oldPrice"], b.oldPrice, "s", "text-xl opacity-60", undefined, "Old price")}
            </p>
            {(b.description || edit) && T(id, ["description"], b.description, "p", "mt-4 whitespace-pre-line text-lg", { color: pal.mute }, "Describe the product", true)}
            {pts.length > 0 && <ul className={`mt-4 space-y-2 ${v === "stacked" ? "mx-auto inline-block text-left" : ""}`}>{pts.map((x, n) => <li key={n} className="flex gap-2"><span style={{ color: pal.accentText }}>✓</span><span>{fill(x)}</span></li>)}</ul>}
            {(b.buttonText || edit) && <div className="mt-6">{Btn(id, ["buttonText"], b.buttonText, "#order", pal)}</div>}
          </div>
        );
        return shell(b, pal, (
          <div className="p-6 @min-[640px]:p-8" style={cardStyle(pal)}>
            {v === "stacked" ? <div className="mx-auto max-w-lg"><div className="mb-6">{pic}</div>{info}</div> : (
              <div className="grid items-start gap-8 @min-[640px]:grid-cols-2"><div className={v === "reverse" ? "@min-[640px]:order-2" : ""}>{pic}</div>{info}</div>
            )}
          </div>
        ), { width: "max-w-4xl" });
      }

      case "offer": {
        const pal = pb(b);
        return shell(b, pal, (
          <div className="p-6 @min-[640px]:p-10" style={cardStyle(pal)}>
            {sectionTitle(b, b.title, pal, "center")}
            <ul className="mx-auto mt-8 max-w-2xl divide-y" style={{ borderColor: pal.line }}>
              {b.items.map((i, n) => (
                <li key={n} className="flex items-start gap-3 py-3.5" style={{ borderColor: pal.line }}>
                  <span style={{ color: pal.accentText }} className="mt-0.5">✓</span>
                  <span className="flex-1">{T(id, ["items", n, "title"], i.title, "span", "block font-semibold", { color: pal.text }, "What is included")}{(i.text || edit) && T(id, ["items", n, "text"], i.text, "span", "block text-[15px]", { color: pal.mute }, "Details")}</span>
                  {(i.value || edit) && T(id, ["items", n, "value"], i.value, "span", "whitespace-nowrap font-semibold opacity-70", undefined, "Value")}
                </li>
              ))}
            </ul>
            <div className="mt-8 text-center">
              {(b.totalValue || edit) && <p className="text-lg" style={{ color: pal.mute }}>Total value: {T(id, ["totalValue"], b.totalValue, "s", "", undefined, "₦0")}</p>}
              {(b.price || edit) && <p className="mt-1">{T(id, ["price"], b.price, "span", "text-5xl font-extrabold", { color: pal.accentText, fontFamily: st.heading }, "Your price")}</p>}
              {(b.note || edit) && T(id, ["note"], b.note, "p", "mt-2 text-sm", { color: pal.mute }, "Small note (optional)")}
              <div className="mt-6">{Btn(id, ["buttonText"], b.buttonText, "#order", pal)}</div>
            </div>
          </div>
        ), { width: "max-w-3xl" });
      }

      case "image": {
        const pal = pb(b);
        return shell(b, pal, b.url ? (
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.url} alt={b.caption} loading="lazy" className="w-full object-cover" style={{ borderRadius: st.radius }} />
            {(b.caption || edit) && T(id, ["caption"], b.caption, "figcaption", "mt-2 text-center text-sm", { color: pal.mute }, "Caption")}
          </figure>
        ) : <p className="py-6 text-center text-sm" style={{ color: pal.mute }}>Add an image in the settings panel.</p>, { width: "max-w-4xl", space: b.space ?? "compact" });
      }

      case "video": {
        const pal = pb(b);
        const src = embedUrl(b.url);
        return shell(b, pal, src ? (
          <figure>
            <div className="aspect-video overflow-hidden" style={{ borderRadius: st.radius, boxShadow: "0 20px 50px -20px rgba(0,0,0,.45)" }}>
              <iframe src={src} title={b.caption || "Video"} className="size-full" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
            </div>
            {(b.caption || edit) && T(id, ["caption"], b.caption, "figcaption", "mt-2 text-center text-sm", { color: pal.mute }, "Caption")}
          </figure>
        ) : <p className="py-6 text-center text-sm" style={{ color: pal.mute }}>Paste a YouTube or Vimeo link in the settings panel.</p>, { width: "max-w-4xl", space: b.space ?? "compact" });
      }

      case "gallery": {
        const pal = pb(b);
        const pics = b.items.filter((i) => i.url);
        return shell(b, pal, (
          <>
            {(b.title || edit) && <div className="mb-8">{sectionTitle(b, b.title, pal, "center")}</div>}
            {pics.length ? (
              <div className="grid grid-cols-2 gap-3 @min-[640px]:grid-cols-3">
                {pics.map((i, n) => (
                  <figure key={n}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={i.url} alt={i.caption} loading="lazy" className="aspect-square w-full object-cover" style={{ borderRadius: Math.min(st.radius, 18) }} />
                    {i.caption && <figcaption className="mt-1 text-center text-xs" style={{ color: pal.mute }}>{i.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            ) : <p className="py-6 text-center text-sm" style={{ color: pal.mute }}>Add pictures in the settings panel.</p>}
          </>
        ));
      }

      case "testimonials": {
        const pal = pb(b);
        const single = b.variant === "single";
        const av = (i: { name: string; imageUrl: string }) => i.imageUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={i.imageUrl} alt="" className="size-11 rounded-full object-cover" />
          : <span className="grid size-11 place-items-center rounded-full text-sm font-bold" style={{ background: rgba(t.accent, 0.15), color: pal.accentText }}>{initials(i.name) || "★"}</span>;
        return shell(b, pal, (
          <>
            <div className="mb-10">{sectionTitle(b, b.title, pal, "center")}</div>
            <div className={single ? "mx-auto max-w-3xl" : "grid gap-4 @min-[640px]:grid-cols-2"}>
              {(single ? b.items.slice(0, 1) : b.items).map((i, n) => (
                <blockquote key={n} className={single ? "text-center" : "p-6"} style={single ? undefined : cardStyle(pal)}>
                  <p className="mb-3 text-xl" style={{ color: pal.accentText }} aria-hidden>★★★★★</p>
                  {T(id, ["items", n, "quote"], i.quote, "p", single ? "text-2xl leading-relaxed @min-[640px]:text-3xl" : "leading-relaxed", { color: pal.text, fontFamily: single ? st.heading : undefined }, "What the customer said", true)}
                  <footer className={`mt-4 flex items-center gap-3 ${single ? "justify-center" : ""}`}>{av(i)}<span className="text-left">{T(id, ["items", n, "name"], i.name, "span", "block font-semibold", { color: pal.text }, "Name")}{(i.role || edit) && T(id, ["items", n, "role"], i.role, "span", "block text-sm", { color: pal.mute }, "Role (optional)")}</span></footer>
                </blockquote>
              ))}
            </div>
          </>
        ));
      }

      case "stats": {
        const pal = pb(b, "tint");
        return shell(b, pal, (
          <dl className="grid gap-6 text-center @min-[640px]:grid-cols-2 @min-[1024px]:grid-cols-4">
            {b.items.map((i, n) => (
              <div key={n}><dt className="sr-only">{i.label}</dt><dd>{T(id, ["items", n, "value"], i.value, "span", "block text-4xl font-extrabold @min-[640px]:text-5xl", { color: pal.accentText, fontFamily: st.heading }, "0")}{T(id, ["items", n, "label"], i.label, "span", "mt-1 block", { color: pal.mute }, "Label")}</dd></div>
            ))}
          </dl>
        ), { space: b.space ?? "compact" });
      }

      case "faq": {
        const pal = pb(b);
        return shell(b, pal, (
          <>
            <div className="mb-8">{sectionTitle(b, b.title, pal, "center")}</div>
            <div className="space-y-3">
              {b.items.map((i, n) => (
                <details key={n} className="group p-5" style={cardStyle(pal)} open={edit ? true : undefined}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold" style={{ color: pal.text }}>
                    {T(id, ["items", n, "q"], i.q, "span", "", undefined, "Question")}
                    <span className="shrink-0 text-xl transition-transform group-open:rotate-45" style={{ color: pal.accentText }} aria-hidden>+</span>
                  </summary>
                  {T(id, ["items", n, "a"], i.a, "p", "mt-3 whitespace-pre-line", { color: pal.mute }, "Answer", true)}
                </details>
              ))}
            </div>
          </>
        ), { width: "max-w-3xl" });
      }

      case "guarantee": {
        const pal = pb(b);
        return shell(b, pal, (
          <div className="p-8 text-center @min-[640px]:p-10" style={{ ...cardStyle(pal), border: `2px solid ${pal.accentText}` }}>
            <span className="mx-auto mb-4 grid size-16 place-items-center text-3xl" style={{ borderRadius: 999, background: rgba(t.accent, 0.14) }} aria-hidden>🛡️</span>
            {T(id, ["title"], b.title, "h2", "", heading(H2, { color: pal.text }), "Your guarantee")}
            {T(id, ["text"], b.text, "p", "mx-auto mt-3 max-w-xl text-lg", { color: pal.mute }, "Describe it", true)}
          </div>
        ), { width: "max-w-3xl" });
      }

      case "about": {
        const pal = pb(b);
        const right = b.variant === "right";
        return shell(b, pal, (
          <div className="grid items-center gap-8 @min-[768px]:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className={right ? "@min-[768px]:order-2" : ""}>
              {b.imageUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={b.imageUrl} alt={b.name} className="aspect-[4/5] w-full object-cover" style={{ borderRadius: st.radius + 4 }} />
                : <div className="grid aspect-[4/5] w-full place-items-center text-6xl font-bold" style={{ borderRadius: st.radius + 4, background: `linear-gradient(135deg, ${rgba(t.accent, 0.25)}, ${rgba(t.accent2, 0.25)})`, color: pal.accentText }}>{initials(b.name) || "👤"}</div>}
            </div>
            <div>
              {T(id, ["title"], b.title, "p", "text-sm font-bold uppercase tracking-widest", { color: pal.accentText }, "Small heading")}
              {T(id, ["name"], b.name, "h2", "mt-2", heading(H2, { color: pal.text }), "Name")}
              {T(id, ["text"], b.text, "p", "mt-4 whitespace-pre-line text-lg leading-relaxed", { color: pal.mute }, "Tell your story", true)}
            </div>
          </div>
        ), { width: "max-w-4xl" });
      }

      case "countdown": {
        const pal = pb(b, "tint");
        return shell(b, pal, <Countdown label={b.label} endsAt={b.endsAt} bg={pal.btnBg} color={pal.btnText} radius={Math.min(st.radius, 16)} text={pal.text} />, { space: b.space ?? "compact" });
      }

      case "event": {
        const pal = pb(b);
        return shell(b, pal, (
          <div className="mx-auto max-w-xl p-6 text-center @min-[640px]:p-8" style={cardStyle(pal)}>
            <span className="mb-2 block text-3xl" aria-hidden>📅</span>
            {T(id, ["title"], b.title, "h2", "", heading("1.7rem", { color: pal.text }), "Event name")}
            <p className="mt-3 text-lg font-semibold" style={{ color: pal.accentText }}>{b.startsAt ? <LocalDate iso={b.startsAt} /> : edit ? "Pick the date and time in the settings panel" : null}</p>
            {(b.where || edit) && T(id, ["where"], b.where, "p", "mt-1", { color: pal.mute }, "Where")}
            {(b.note || edit) && T(id, ["note"], b.note, "p", "mt-3 text-sm", { color: pal.mute }, "Note (optional)")}
          </div>
        ), { space: b.space ?? "compact", width: "max-w-3xl" });
      }

      case "lead_form":
      case "order_form": {
        const pal = pb(b);
        const split = b.type === "lead_form" && b.variant === "split";
        const formCard = (
          <div className="p-6 @min-[640px]:p-8" style={cardStyle(pal)}>
            {(b.title || edit) && T(id, ["title"], b.title, "h2", "", heading("clamp(1.5rem, 1rem + 2cqw, 1.9rem)", { color: pal.text }), "Form heading")}
            {(b.text || edit) && T(id, ["text"], b.text, "p", "mb-5 mt-2", { color: pal.mute }, "Short text", true)}
            <FunnelForm block={b} slug={slug} pageId={page.id} nextHref={nextHref} whatsapp={whatsapp} ui={ui(pal)} preview={preview} editLabels={edit ? { onText: (path, v) => edit.onText(id, path, v) } : undefined} />
          </div>
        );
        const imageUrl = b.type === "lead_form" ? b.imageUrl : "";
        return shell(b, pal, split ? (
          <div className="grid items-center gap-8 @min-[768px]:grid-cols-2">
            {imageUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={imageUrl} alt="" className="w-full object-cover" style={{ borderRadius: st.radius + 4, aspectRatio: "4 / 5" }} />
              : <div className="aspect-[4/5] w-full" style={{ borderRadius: st.radius + 4, background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`, opacity: 0.85 }} aria-hidden />}
            {formCard}
          </div>
        ) : formCard, { id: b.id === firstForm ? "order" : `b-${b.id}`, width: split ? "max-w-5xl" : "max-w-xl" });
      }

      case "cta": {
        const pal = pb(b, st.btn === "gradient" ? "gradient" : "accent");
        return shell(b, pal, (
          <div className="mx-auto max-w-2xl text-center">
            {T(id, ["headline"], b.headline, "h2", "", heading("clamp(1.8rem, 1rem + 4cqw, 3rem)", { color: pal.text }), "Closing headline")}
            {(b.text || edit) && T(id, ["text"], b.text, "p", "mt-4 text-lg opacity-90", { color: pal.text }, "Short text", true)}
            <div className="mt-8">{Btn(id, ["buttonText"], b.buttonText, b.buttonLink, pal)}</div>
          </div>
        ), { space: b.space ?? "roomy" });
      }

      case "button": {
        const pal = pb(b);
        return shell(b, pal, <div className={b.align === "left" ? "text-left" : "text-center"}>{Btn(id, ["text"], b.text, b.link, pal)}</div>, { space: b.space ?? "compact" });
      }

      case "spacer":
        return <div className="h-10 @min-[640px]:h-16" aria-hidden />;

      case "footer": {
        const pal = pb(b);
        return b.text || edit ? shell(b, pal, T(id, ["text"], b.text, "p", "text-center text-xs leading-relaxed", { color: pal.mute }, "Small print, disclaimer or contact details", true), { width: "max-w-3xl", space: "compact" }) : null;
      }
    }
  };

  return (
    <div style={{ background: t.bg, color: t.text, colorScheme: t.dark ? "dark" : "light", fontFamily: st.body, containerType: "inline-size", containerName: "fv" } as CSSProperties} className="min-h-full">
      <style dangerouslySetInnerHTML={{ __html: pageCss(page, Boolean(edit)) }} />
      <noscript><style>{".fv-a{opacity:1;transform:none}"}</style></noscript>
      {page.blocks.map((b, i) => (
        <div key={b.id} data-block={b.id}>{wrapN("block", { block: b.id }, anim(render(b), b.anim), { index: i, count: page.blocks.length })}</div>
      ))}
    </div>
  );
}
