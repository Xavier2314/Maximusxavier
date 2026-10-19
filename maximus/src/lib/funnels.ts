/** Funnel builder: block types, validation and defaults. Pure data, safe on server and client. */

export type FunnelTheme = { accent: string; mode: "light" | "dark"; font: "sans" | "serif" };
export const DEFAULT_THEME: FunnelTheme = { accent: "#305ee6", mode: "light", font: "sans" };

export type FunnelProduct = {
  name: string; price: string; description: string; benefits: string; audience: string; offer: string; imageUrl: string; whatsapp: boolean;
};
export const EMPTY_PRODUCT: FunnelProduct = { name: "", price: "", description: "", benefits: "", audience: "", offer: "", imageUrl: "", whatsapp: true };

type Item = { title: string; text: string };
type Quote = { name: string; quote: string };
type Faq = { q: string; a: string };

type Base = { id: string };
export type FunnelBlock = Base & (
  | { type: "hero"; headline: string; subheadline: string; buttonText: string; buttonLink: string; imageUrl: string }
  | { type: "text"; title: string; body: string }
  | { type: "benefits"; title: string; items: Item[] }
  | { type: "product"; name: string; price: string; description: string; imageUrl: string; buttonText: string }
  | { type: "image"; url: string; caption: string }
  | { type: "video"; url: string; caption: string }
  | { type: "testimonials"; title: string; items: Quote[] }
  | { type: "faq"; title: string; items: Faq[] }
  | { type: "countdown"; label: string; endsAt: string }
  | { type: "lead_form"; title: string; text: string; buttonText: string; successMessage: string; askPhone: boolean; askMessage: boolean }
  | { type: "order_form"; title: string; text: string; buttonText: string; successMessage: string; productName: string; price: string }
  | { type: "cta"; headline: string; text: string; buttonText: string; buttonLink: string }
  | { type: "footer"; text: string }
);
export type BlockType = FunnelBlock["type"];
export type FunnelPage = { id: string; name: string; slug: string; blocks: FunnelBlock[] };

export type Funnel = {
  id: string; user_id: string; title: string; slug: string; published: boolean;
  product: FunnelProduct; theme: FunnelTheme; pages: FunnelPage[]; views: number; updated_at: string;
};
export const FUNNEL_COLUMNS = "id, user_id, title, slug, published, product, theme, pages, views, updated_at";

export const BLOCK_LABELS: Record<BlockType, { label: string; hint: string }> = {
  hero: { label: "Hero", hint: "Big headline, short promise and a button" },
  text: { label: "Text", hint: "A heading and a paragraph" },
  benefits: { label: "Benefits", hint: "A list of reasons to buy" },
  product: { label: "Product", hint: "Photo, price and order button" },
  image: { label: "Image", hint: "A picture with an optional caption" },
  video: { label: "Video", hint: "YouTube or Vimeo link" },
  testimonials: { label: "Testimonials", hint: "Real customer quotes you provide" },
  faq: { label: "FAQ", hint: "Questions and answers" },
  countdown: { label: "Countdown", hint: "Timer to a date you choose" },
  lead_form: { label: "Lead form", hint: "Collect names, emails and phone numbers" },
  order_form: { label: "Order form", hint: "Take product orders" },
  cta: { label: "Call to action", hint: "A closing push with a button" },
  footer: { label: "Footer", hint: "Small print and disclaimer" },
};
export const BLOCK_TYPES = Object.keys(BLOCK_LABELS) as BlockType[];

export const uid = () => Math.random().toString(36).slice(2, 10);

export function newBlock(type: BlockType): FunnelBlock {
  const id = uid();
  switch (type) {
    case "hero": return { id, type, headline: "Your headline goes here", subheadline: "One clear sentence about what you offer and who it is for.", buttonText: "Order now", buttonLink: "#order", imageUrl: "" };
    case "text": return { id, type, title: "Heading", body: "Write something your customers want to know." };
    case "benefits": return { id, type, title: "Why you will love it", items: [{ title: "Benefit one", text: "What it does for your customer." }, { title: "Benefit two", text: "Another reason to buy." }, { title: "Benefit three", text: "One more good reason." }] };
    case "product": return { id, type, name: "Product name", price: "", description: "A short description of the product.", imageUrl: "", buttonText: "Order now" };
    case "image": return { id, type, url: "", caption: "" };
    case "video": return { id, type, url: "", caption: "" };
    case "testimonials": return { id, type, title: "What customers say", items: [{ name: "Customer name", quote: "Paste a real review here." }] };
    case "faq": return { id, type, title: "Questions", items: [{ q: "How do I order?", a: "Fill in the order form and we will contact you." }] };
    case "countdown": return { id, type, label: "Offer ends in", endsAt: "" };
    case "lead_form": return { id, type, title: "Get more information", text: "Leave your details and we will reach out.", buttonText: "Send my details", successMessage: "Thank you! We will contact you shortly.", askPhone: true, askMessage: false };
    case "order_form": return { id, type, title: "Place your order", text: "Fill in your details and we will confirm your order.", buttonText: "Order now", successMessage: "Thank you! Your order has been received. We will contact you to confirm.", productName: "", price: "" };
    case "cta": return { id, type, headline: "Ready to get started?", text: "Take the first step today.", buttonText: "Order now", buttonLink: "#order" };
    case "footer": return { id, type, text: "" };
  }
}

export function newPage(name: string, blocks: FunnelBlock[] = []): FunnelPage {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "page";
  return { id: uid(), name: name.slice(0, 40), slug, blocks };
}

export function starterPages(productName = ""): FunnelPage[] {
  return [
    newPage("Landing page", [
      { ...newBlock("hero"), headline: productName || "Your headline goes here" } as FunnelBlock,
      newBlock("benefits"), newBlock("product"), newBlock("order_form"), newBlock("faq"), newBlock("footer"),
    ]),
    newPage("Thank you", [
      { ...newBlock("text"), title: "Thank you!", body: "We have received your details and will be in touch very soon." } as FunnelBlock,
    ]),
  ];
}

// --- Sanitising (everything from the browser or the AI goes through here) -----------------------

const s = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
/** http(s) links and in-page anchors only. Blocks javascript:, data: and the like. */
export function safeUrl(v: unknown, max = 500): string {
  const u = s(v, max);
  return /^https?:\/\/[^\s<>"']+$/i.test(u) ? u : "";
}
const safeLink = (v: unknown) => {
  const u = s(v, 500);
  return /^#[a-z0-9_-]{0,40}$/i.test(u) ? u : safeUrl(u);
};
const arr = <T>(v: unknown, max: number, f: (x: Record<string, unknown>) => T | null): T[] =>
  (Array.isArray(v) ? v : []).slice(0, max).map((x) => (x && typeof x === "object" ? f(x as Record<string, unknown>) : null)).filter((x): x is T => x !== null);

export function cleanBlock(raw: unknown): FunnelBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  const id = /^[a-z0-9]{4,12}$/i.test(String(b.id ?? "")) ? String(b.id) : uid();
  switch (b.type) {
    case "hero": return { id, type: "hero", headline: s(b.headline, 160), subheadline: s(b.subheadline, 400), buttonText: s(b.buttonText, 40), buttonLink: safeLink(b.buttonLink) || "#order", imageUrl: safeUrl(b.imageUrl) };
    case "text": return { id, type: "text", title: s(b.title, 120), body: s(b.body, 3000) };
    case "benefits": return { id, type: "benefits", title: s(b.title, 120), items: arr(b.items, 8, (i) => ({ title: s(i.title, 80), text: s(i.text, 300) })) };
    case "product": return { id, type: "product", name: s(b.name, 120), price: s(b.price, 40), description: s(b.description, 1200), imageUrl: safeUrl(b.imageUrl), buttonText: s(b.buttonText, 40) };
    case "image": return { id, type: "image", url: safeUrl(b.url), caption: s(b.caption, 200) };
    case "video": return { id, type: "video", url: safeUrl(b.url), caption: s(b.caption, 200) };
    case "testimonials": return { id, type: "testimonials", title: s(b.title, 120), items: arr(b.items, 8, (i) => ({ name: s(i.name, 80), quote: s(i.quote, 500) })) };
    case "faq": return { id, type: "faq", title: s(b.title, 120), items: arr(b.items, 12, (i) => ({ q: s(i.q, 200), a: s(i.a, 800) })) };
    case "countdown": {
      const t = s(b.endsAt, 40);
      return { id, type: "countdown", label: s(b.label, 80), endsAt: Number.isFinite(Date.parse(t)) ? t : "" };
    }
    case "lead_form": return { id, type: "lead_form", title: s(b.title, 120), text: s(b.text, 300), buttonText: s(b.buttonText, 40), successMessage: s(b.successMessage, 200), askPhone: bool(b.askPhone, true), askMessage: bool(b.askMessage, false) };
    case "order_form": return { id, type: "order_form", title: s(b.title, 120), text: s(b.text, 300), buttonText: s(b.buttonText, 40), successMessage: s(b.successMessage, 200), productName: s(b.productName, 120), price: s(b.price, 40) };
    case "cta": return { id, type: "cta", headline: s(b.headline, 160), text: s(b.text, 300), buttonText: s(b.buttonText, 40), buttonLink: safeLink(b.buttonLink) || "#order" };
    case "footer": return { id, type: "footer", text: s(b.text, 600) };
    default: return null;
  }
}

export function cleanPages(raw: unknown): FunnelPage[] {
  const seen = new Set<string>();
  return arr(raw, 6, (p) => {
    const name = s(p.name, 40) || "Page";
    let slug = s(p.slug, 30).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || newPage(name).slug;
    while (seen.has(slug)) slug = `${slug}-2`.slice(0, 30);
    seen.add(slug);
    const id = /^[a-z0-9]{4,12}$/i.test(String(p.id ?? "")) ? String(p.id) : uid();
    const blocks = arr(p.blocks, 40, (b) => cleanBlock(b));
    return { id, name, slug, blocks };
  });
}

export function cleanTheme(raw: unknown): FunnelTheme {
  const t = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    accent: typeof t.accent === "string" && /^#[0-9a-fA-F]{6}$/.test(t.accent) ? t.accent : DEFAULT_THEME.accent,
    mode: t.mode === "dark" ? "dark" : "light",
    font: t.font === "serif" ? "serif" : "sans",
  };
}

export function cleanProduct(raw: unknown): FunnelProduct {
  const p = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    name: s(p.name, 120), price: s(p.price, 40), description: s(p.description, 2000), benefits: s(p.benefits, 2000),
    audience: s(p.audience, 300), offer: s(p.offer, 400), imageUrl: safeUrl(p.imageUrl), whatsapp: bool(p.whatsapp, true),
  };
}

/** The page's link inside a funnel: the first page lives at /f/<slug>, the rest at /f/<slug>/<page>. */
export const pagePath = (funnelSlug: string, page: FunnelPage, index: number) => (index === 0 ? `/f/${funnelSlug}` : `/f/${funnelSlug}/${page.slug}`);

/** Converts a YouTube / Vimeo link to an embeddable URL. */
export function embedUrl(url: string): string | null {
  const yt = url.match(/^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vm = url.match(/^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/i);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}
