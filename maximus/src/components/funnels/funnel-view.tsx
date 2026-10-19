import type { CSSProperties, ReactNode } from "react";
import { embedUrl, type FunnelBlock, type FunnelPage, type FunnelTheme } from "@/lib/funnels";
import { Countdown, FunnelForm } from "./funnel-form";

/** Readable text colour (black or white) on top of a hex accent. */
export function onAccent(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#0f172a" : "#ffffff";
}

export type FunnelViewProps = {
  slug: string;
  theme: FunnelTheme;
  page: FunnelPage;
  /** Where forms send the visitor after a successful submit (next page of the funnel). */
  nextHref?: string;
  /** Owner's WhatsApp number (digits only), shown after an order if they allowed it. */
  whatsapp?: string;
  /** Editor mode: forms don't send anything. */
  preview?: boolean;
  /** Lets the editor wrap each block (select, drag, toolbar). */
  wrapBlock?: (block: FunnelBlock, index: number, node: ReactNode) => ReactNode;
};

const btn = "inline-flex items-center justify-center rounded-xl px-6 py-3.5 text-base font-semibold shadow-sm transition-transform active:scale-[0.98]";

export function FunnelView({ slug, theme, page, nextHref, whatsapp, preview, wrapBlock }: FunnelViewProps) {
  const dark = theme.mode === "dark";
  const accent = theme.accent;
  const on = onAccent(accent);
  const c = dark
    ? { bg: "#0b1220", text: "#f1f5f9", mute: "#cbd5e1", card: "#111827", line: "#1f2937" }
    : { bg: "#ffffff", text: "#0f172a", mute: "#475569", card: "#f8fafc", line: "#e2e8f0" };
  const style: CSSProperties = {
    background: c.bg, color: c.text, colorScheme: dark ? "dark" : "light",
    fontFamily: theme.font === "serif" ? "Georgia, 'Times New Roman', serif" : "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  };
  const firstForm = page.blocks.find((b) => b.type === "order_form" || b.type === "lead_form")?.id;

  const render = (b: FunnelBlock): ReactNode => {
    const anchor = b.id === firstForm ? "order" : `b-${b.id}`;
    switch (b.type) {
      case "hero":
        return (
          <section className="px-5 py-16 text-center sm:py-24" style={{ background: `linear-gradient(180deg, ${accent}1f, transparent)` }}>
            <div className="mx-auto max-w-3xl">
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">{b.headline}</h1>
              {b.subheadline && <p className="mx-auto mt-5 max-w-2xl text-lg" style={{ color: c.mute }}>{b.subheadline}</p>}
              {b.buttonText && <a href={b.buttonLink || "#order"} className={`${btn} mt-8`} style={{ background: accent, color: on }}>{b.buttonText}</a>}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {b.imageUrl && <img src={b.imageUrl} alt="" className="mx-auto mt-10 max-h-[28rem] w-full rounded-3xl object-cover shadow-lg" />}
            </div>
          </section>
        );
      case "text":
        return (
          <section className="mx-auto max-w-3xl px-5 py-12">
            {b.title && <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{b.title}</h2>}
            <p className="mt-3 whitespace-pre-line text-lg leading-relaxed" style={{ color: c.mute }}>{b.body}</p>
          </section>
        );
      case "benefits":
        return (
          <section className="mx-auto max-w-5xl px-5 py-12">
            {b.title && <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">{b.title}</h2>}
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {b.items.map((i, n) => (
                <li key={n} className="rounded-2xl border p-5" style={{ background: c.card, borderColor: c.line }}>
                  <span className="grid size-9 place-items-center rounded-full text-sm font-bold" style={{ background: accent, color: on }}>✓</span>
                  <h3 className="mt-3 text-lg font-semibold">{i.title}</h3>
                  {i.text && <p className="mt-1" style={{ color: c.mute }}>{i.text}</p>}
                </li>
              ))}
            </ul>
          </section>
        );
      case "product":
        return (
          <section className="mx-auto max-w-4xl px-5 py-12">
            <div className="grid items-center gap-8 rounded-3xl border p-6 sm:grid-cols-2 sm:p-8" style={{ background: c.card, borderColor: c.line }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {b.imageUrl ? <img src={b.imageUrl} alt={b.name} className="aspect-square w-full rounded-2xl object-cover" /> : <div className="aspect-square w-full rounded-2xl" style={{ background: `${accent}22` }} aria-hidden />}
              <div>
                <h2 className="text-2xl font-bold tracking-tight">{b.name}</h2>
                {b.price && <p className="mt-2 text-3xl font-extrabold" style={{ color: accent }}>{b.price}</p>}
                {b.description && <p className="mt-3 whitespace-pre-line" style={{ color: c.mute }}>{b.description}</p>}
                {b.buttonText && <a href="#order" className={`${btn} mt-6`} style={{ background: accent, color: on }}>{b.buttonText}</a>}
              </div>
            </div>
          </section>
        );
      case "image":
        return b.url ? (
          <figure className="mx-auto max-w-4xl px-5 py-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.url} alt={b.caption} loading="lazy" className="w-full rounded-3xl object-cover shadow-md" />
            {b.caption && <figcaption className="mt-2 text-center text-sm" style={{ color: c.mute }}>{b.caption}</figcaption>}
          </figure>
        ) : <p className="px-5 py-8 text-center text-sm" style={{ color: c.mute }}>Add an image link.</p>;
      case "video": {
        const src = embedUrl(b.url);
        return src ? (
          <figure className="mx-auto max-w-4xl px-5 py-8">
            <div className="aspect-video overflow-hidden rounded-3xl shadow-md">
              <iframe src={src} title={b.caption || "Video"} className="size-full" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
            </div>
            {b.caption && <figcaption className="mt-2 text-center text-sm" style={{ color: c.mute }}>{b.caption}</figcaption>}
          </figure>
        ) : <p className="px-5 py-8 text-center text-sm" style={{ color: c.mute }}>Paste a YouTube or Vimeo link.</p>;
      }
      case "testimonials":
        return (
          <section className="mx-auto max-w-5xl px-5 py-12">
            {b.title && <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">{b.title}</h2>}
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {b.items.map((i, n) => (
                <blockquote key={n} className="rounded-2xl border p-5" style={{ background: c.card, borderColor: c.line }}>
                  <p className="leading-relaxed">&ldquo;{i.quote}&rdquo;</p>
                  <footer className="mt-3 text-sm font-semibold" style={{ color: accent }}>{i.name}</footer>
                </blockquote>
              ))}
            </div>
          </section>
        );
      case "faq":
        return (
          <section className="mx-auto max-w-3xl px-5 py-12">
            {b.title && <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">{b.title}</h2>}
            <div className="mt-6 space-y-3">
              {b.items.map((i, n) => (
                <details key={n} className="rounded-2xl border p-4" style={{ background: c.card, borderColor: c.line }}>
                  <summary className="cursor-pointer font-semibold">{i.q}</summary>
                  <p className="mt-2" style={{ color: c.mute }}>{i.a}</p>
                </details>
              ))}
            </div>
          </section>
        );
      case "countdown":
        return <section className="px-5 py-10"><Countdown label={b.label} endsAt={b.endsAt} accent={accent} /></section>;
      case "lead_form":
      case "order_form":
        return (
          <section id={anchor} className="mx-auto max-w-xl scroll-mt-6 px-5 py-12">
            <div className="rounded-3xl border p-6 shadow-sm sm:p-8" style={{ background: c.card, borderColor: c.line }}>
              {b.title && <h2 className="text-2xl font-bold tracking-tight">{b.title}</h2>}
              {b.text && <p className="mt-2 mb-5" style={{ color: c.mute }}>{b.text}</p>}
              <div className="text-[#0f172a]">
                <FunnelForm block={b} slug={slug} pageId={page.id} nextHref={nextHref} whatsapp={whatsapp} accent={accent} onAccent={on} preview={preview} />
              </div>
            </div>
          </section>
        );
      case "cta":
        return (
          <section className="px-5 py-16 text-center" style={{ background: accent, color: on }}>
            <div className="mx-auto max-w-2xl">
              <h2 className="text-3xl font-extrabold tracking-tight">{b.headline}</h2>
              {b.text && <p className="mt-3 text-lg opacity-90">{b.text}</p>}
              {b.buttonText && <a href={b.buttonLink || "#order"} className={`${btn} mt-7`} style={{ background: on, color: accent === on ? "#000" : accent }}>{b.buttonText}</a>}
            </div>
          </section>
        );
      case "footer":
        return b.text ? <footer className="mx-auto max-w-3xl px-5 py-10 text-center text-xs leading-relaxed" style={{ color: c.mute }}>{b.text}</footer> : null;
    }
  };

  return (
    <div style={style} className="min-h-full">
      {page.blocks.map((b, i) => {
        const node = render(b);
        return <div key={b.id}>{wrapBlock ? wrapBlock(b, i, node) : node}</div>;
      })}
    </div>
  );
}
