/** Funnel builder: block types, validation and defaults. Pure data, safe on server and client. */

export type StyleKey = "clean" | "bold" | "luxe" | "wellness" | "midnight" | "sunrise" | "editorial" | "playful";
export const STYLE_KEYS: StyleKey[] = ["clean", "bold", "luxe", "wellness", "midnight", "sunrise", "editorial", "playful"];

export type FunnelTheme = { style: StyleKey; accent: string; mode: "light" | "dark" };
export const DEFAULT_THEME: FunnelTheme = { style: "clean", accent: "#2563eb", mode: "light" };

export type FunnelType = "sales" | "quick" | "leadmagnet" | "webinar" | "call";
export const FUNNEL_TYPES: { key: FunnelType; name: string; blurb: string; steps: string[] }[] = [
  { key: "sales", name: "Sales funnel", blurb: "A full sales page that builds desire, then a checkout step and a thank-you page. Best for products that need explaining.", steps: ["Sales page", "Order", "Thank you"] },
  { key: "quick", name: "One-page offer", blurb: "Everything on one page: promise, benefits, product and the order form. Fast to launch, great for simple products.", steps: ["Offer page", "Thank you"] },
  { key: "leadmagnet", name: "Lead magnet", blurb: "Give something free (a guide, a sample, a checklist) in exchange for a name and an email or phone number.", steps: ["Sign-up page", "Thank you"] },
  { key: "webinar", name: "Webinar or event", blurb: "Get people to register for a live session, a demo or a launch event, with the date shown clearly.", steps: ["Registration", "Confirmed"] },
  { key: "call", name: "Book a call", blurb: "Qualify people before you speak: they tell you about themselves, you reach out by phone or WhatsApp.", steps: ["Apply page", "Thank you"] },
];

export type FunnelProduct = {
  name: string; price: string; description: string; benefits: string; audience: string; offer: string; imageUrl: string; whatsapp: boolean; funnelType: FunnelType;
};
export const EMPTY_PRODUCT: FunnelProduct = { name: "", price: "", description: "", benefits: "", audience: "", offer: "", imageUrl: "", whatsapp: true, funnelType: "sales" };

export type Bg = "none" | "tint" | "accent" | "dark" | "gradient";
export type Space = "compact" | "normal" | "roomy";
export type Align = "left" | "center";

type Item = { icon: string; title: string; text: string };
type Quote = { name: string; role: string; quote: string; imageUrl: string };
type Faq = { q: string; a: string };
type Included = { title: string; text: string; value: string };
type Stat = { value: string; label: string };
type Pic = { url: string; caption: string };

type Common = { id: string; bg?: Bg; space?: Space; align?: Align; variant?: string };
export type FunnelBlock = Common & (
  | { type: "announcement"; text: string; link: string }
  | { type: "hero"; badge: string; headline: string; subheadline: string; buttonText: string; buttonLink: string; imageUrl: string }
  | { type: "text"; title: string; body: string }
  | { type: "benefits"; title: string; subtitle: string; items: Item[] }
  | { type: "steps"; title: string; items: Item[] }
  | { type: "product"; name: string; price: string; oldPrice: string; description: string; points: string; imageUrl: string; buttonText: string }
  | { type: "offer"; title: string; items: Included[]; totalValue: string; price: string; buttonText: string; note: string }
  | { type: "image"; url: string; caption: string }
  | { type: "video"; url: string; caption: string }
  | { type: "gallery"; title: string; items: Pic[] }
  | { type: "testimonials"; title: string; items: Quote[] }
  | { type: "stats"; items: Stat[] }
  | { type: "faq"; title: string; items: Faq[] }
  | { type: "guarantee"; title: string; text: string }
  | { type: "about"; title: string; name: string; text: string; imageUrl: string }
  | { type: "countdown"; label: string; endsAt: string }
  | { type: "event"; title: string; startsAt: string; where: string; note: string }
  | { type: "lead_form"; title: string; text: string; buttonText: string; successMessage: string; askPhone: boolean; askMessage: boolean; imageUrl: string }
  | { type: "order_form"; title: string; text: string; buttonText: string; successMessage: string; productName: string; price: string; bumpText: string; bumpPrice: string }
  | { type: "cta"; headline: string; text: string; buttonText: string; buttonLink: string }
  | { type: "button"; text: string; link: string }
  | { type: "spacer" }
  | { type: "footer"; text: string }
);
export type BlockType = FunnelBlock["type"];
export type FunnelPage = { id: string; name: string; slug: string; blocks: FunnelBlock[] };

export type Funnel = {
  id: string; user_id: string; title: string; slug: string; published: boolean;
  product: FunnelProduct; theme: FunnelTheme; pages: FunnelPage[]; views: number; updated_at: string;
};
export const FUNNEL_COLUMNS = "id, user_id, title, slug, published, product, theme, pages, views, updated_at";

export const BLOCK_GROUPS: { title: string; types: BlockType[] }[] = [
  { title: "Top of the page", types: ["announcement", "hero", "countdown", "event"] },
  { title: "Explain & sell", types: ["text", "benefits", "steps", "product", "offer", "guarantee"] },
  { title: "Show & prove", types: ["image", "video", "gallery", "testimonials", "stats", "about", "faq"] },
  { title: "Get the order", types: ["order_form", "lead_form", "cta", "button"] },
  { title: "Finish", types: ["spacer", "footer"] },
];

export const BLOCK_LABELS: Record<BlockType, { label: string; hint: string; emoji: string }> = {
  announcement: { label: "Announcement bar", hint: "A slim strip with a short message", emoji: "📣" },
  hero: { label: "Hero", hint: "Big headline, promise and button", emoji: "🚀" },
  text: { label: "Text", hint: "A heading and a paragraph", emoji: "📝" },
  benefits: { label: "Benefits", hint: "Cards, a checklist or icons", emoji: "✅" },
  steps: { label: "How it works", hint: "Numbered steps", emoji: "🔢" },
  product: { label: "Product", hint: "Photo, price and order button", emoji: "🛍️" },
  offer: { label: "What you get", hint: "The full offer stack with value and price", emoji: "🎁" },
  image: { label: "Image", hint: "A picture with a caption", emoji: "🖼️" },
  video: { label: "Video", hint: "YouTube or Vimeo", emoji: "🎬" },
  gallery: { label: "Gallery", hint: "A grid of pictures", emoji: "📸" },
  testimonials: { label: "Testimonials", hint: "Real customer quotes you provide", emoji: "💬" },
  stats: { label: "Numbers", hint: "Real figures you can stand behind", emoji: "📊" },
  faq: { label: "FAQ", hint: "Questions and answers", emoji: "❓" },
  guarantee: { label: "Guarantee", hint: "A promise that removes risk", emoji: "🛡️" },
  about: { label: "About", hint: "Who is behind this", emoji: "👤" },
  countdown: { label: "Countdown", hint: "A timer to a date you choose", emoji: "⏳" },
  event: { label: "Event details", hint: "Date, time and place", emoji: "📅" },
  lead_form: { label: "Sign-up form", hint: "Collect names, emails and numbers", emoji: "📥" },
  order_form: { label: "Order form", hint: "Take orders, with an optional add-on", emoji: "🧾" },
  cta: { label: "Call to action", hint: "A closing push with a button", emoji: "👉" },
  button: { label: "Button", hint: "A single button", emoji: "🔘" },
  spacer: { label: "Spacer", hint: "Empty space", emoji: "↕️" },
  footer: { label: "Footer", hint: "Small print and disclaimer", emoji: "🔻" },
};
export const BLOCK_TYPES = BLOCK_GROUPS.flatMap((g) => g.types);

/** Layout choices per block (the first is the default). */
export const VARIANTS: Partial<Record<BlockType, { key: string; label: string }[]>> = {
  hero: [{ key: "center", label: "Centered" }, { key: "split", label: "Text + image" }, { key: "cover", label: "Image behind" }],
  benefits: [{ key: "cards", label: "Cards" }, { key: "list", label: "Checklist" }, { key: "icons", label: "Icons" }],
  product: [{ key: "split", label: "Image left" }, { key: "reverse", label: "Image right" }, { key: "stacked", label: "Stacked" }],
  testimonials: [{ key: "grid", label: "Grid" }, { key: "single", label: "One large quote" }],
  steps: [{ key: "row", label: "In a row" }, { key: "column", label: "In a column" }],
  about: [{ key: "left", label: "Photo left" }, { key: "right", label: "Photo right" }],
  lead_form: [{ key: "card", label: "Card" }, { key: "split", label: "With picture" }],
};

export const uid = () => Math.random().toString(36).slice(2, 10);

export function newBlock(type: BlockType): FunnelBlock {
  const id = uid();
  switch (type) {
    case "announcement": return { id, type, text: "Free delivery on orders this week", link: "" };
    case "hero": return { id, type, badge: "", headline: "Your headline goes here", subheadline: "One clear sentence about what you offer and who it is for.", buttonText: "Order now", buttonLink: "#order", imageUrl: "" };
    case "text": return { id, type, title: "Heading", body: "Write something your customers want to know." };
    case "benefits": return { id, type, title: "Why you will love it", subtitle: "", items: [{ icon: "✨", title: "Benefit one", text: "What it does for your customer." }, { icon: "💪", title: "Benefit two", text: "Another reason to buy." }, { icon: "🕒", title: "Benefit three", text: "One more good reason." }] };
    case "steps": return { id, type, title: "How it works", items: [{ icon: "", title: "Order", text: "Fill in the short form." }, { icon: "", title: "We confirm", text: "We call or message you." }, { icon: "", title: "Delivered", text: "Receive it at your door." }] };
    case "product": return { id, type, name: "Product name", price: "", oldPrice: "", description: "A short description of the product.", points: "", imageUrl: "", buttonText: "Order now" };
    case "offer": return { id, type, title: "Everything you get", items: [{ title: "Main product", text: "", value: "" }, { title: "Bonus", text: "", value: "" }], totalValue: "", price: "", buttonText: "Order now", note: "" };
    case "image": return { id, type, url: "", caption: "" };
    case "video": return { id, type, url: "", caption: "" };
    case "gallery": return { id, type, title: "", items: [{ url: "", caption: "" }, { url: "", caption: "" }, { url: "", caption: "" }] };
    case "testimonials": return { id, type, title: "What customers say", items: [{ name: "Customer name", role: "", quote: "Paste a real review here.", imageUrl: "" }] };
    case "stats": return { id, type, items: [{ value: "1,000+", label: "Happy customers" }, { value: "4.9/5", label: "Average rating" }, { value: "7 days", label: "Support" }] };
    case "faq": return { id, type, title: "Questions", items: [{ q: "How do I order?", a: "Fill in the order form and we will contact you." }] };
    case "guarantee": return { id, type, title: "Our promise to you", text: "Describe your guarantee in plain words." };
    case "about": return { id, type, title: "Meet your guide", name: "Your name", text: "A few lines about you and why you do this.", imageUrl: "" };
    case "countdown": return { id, type, label: "Offer ends in", endsAt: "" };
    case "event": return { id, type, title: "Join us live", startsAt: "", where: "Online (link sent after you register)", note: "" };
    case "lead_form": return { id, type, title: "Get your free copy", text: "Leave your details and we will send it to you.", buttonText: "Send it to me", successMessage: "Thank you! We will be in touch shortly.", askPhone: true, askMessage: false, imageUrl: "" };
    case "order_form": return { id, type, title: "Place your order", text: "Fill in your details and we will confirm your order.", buttonText: "Order now", successMessage: "Thank you! Your order has been received. We will contact you to confirm.", productName: "", price: "", bumpText: "", bumpPrice: "" };
    case "cta": return { id, type, headline: "Ready to get started?", text: "Take the first step today.", buttonText: "Order now", buttonLink: "#order", bg: "gradient" };
    case "button": return { id, type, text: "Order now", link: "#order", align: "center" };
    case "spacer": return { id, type };
    case "footer": return { id, type, text: "" };
  }
}

export function newPage(name: string, blocks: FunnelBlock[] = []): FunnelPage {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "page";
  return { id: uid(), name: name.slice(0, 40), slug, blocks };
}

// --- Sanitising (everything from the browser or the AI goes through here) -----------------------

const s = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
/** http(s) links only. Blocks javascript:, data: and the like. */
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
const iso = (v: unknown) => { const t = s(v, 40); return Number.isFinite(Date.parse(t)) ? t : ""; };
const oneOf = <T extends string>(v: unknown, list: readonly T[]): T | undefined => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : undefined);

export function cleanBlock(raw: unknown): FunnelBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  const id = /^[a-z0-9]{4,12}$/i.test(String(b.id ?? "")) ? String(b.id) : uid();
  const type = String(b.type ?? "") as BlockType;
  const common: Omit<Common, "id"> = {
    bg: oneOf(b.bg, ["none", "tint", "accent", "dark", "gradient"] as const),
    space: oneOf(b.space, ["compact", "normal", "roomy"] as const),
    align: oneOf(b.align, ["left", "center"] as const),
    variant: oneOf(b.variant, (VARIANTS[type] ?? []).map((v) => v.key)),
  };
  const out = ((): FunnelBlock | null => {
    switch (type) {
      case "announcement": return { id, type, text: s(b.text, 160), link: safeLink(b.link) };
      case "hero": return { id, type, badge: s(b.badge, 60), headline: s(b.headline, 160), subheadline: s(b.subheadline, 400), buttonText: s(b.buttonText, 40), buttonLink: safeLink(b.buttonLink) || "#order", imageUrl: safeUrl(b.imageUrl) };
      case "text": return { id, type, title: s(b.title, 120), body: s(b.body, 3000) };
      case "benefits": return { id, type, title: s(b.title, 120), subtitle: s(b.subtitle, 240), items: arr(b.items, 9, (i) => ({ icon: s(i.icon, 8), title: s(i.title, 80), text: s(i.text, 300) })) };
      case "steps": return { id, type, title: s(b.title, 120), items: arr(b.items, 5, (i) => ({ icon: "", title: s(i.title, 80), text: s(i.text, 300) })) };
      case "product": return { id, type, name: s(b.name, 120), price: s(b.price, 40), oldPrice: s(b.oldPrice, 40), description: s(b.description, 1200), points: s(b.points, 800), imageUrl: safeUrl(b.imageUrl), buttonText: s(b.buttonText, 40) };
      case "offer": return { id, type, title: s(b.title, 120), items: arr(b.items, 10, (i) => ({ title: s(i.title, 100), text: s(i.text, 240), value: s(i.value, 40) })), totalValue: s(b.totalValue, 40), price: s(b.price, 40), buttonText: s(b.buttonText, 40), note: s(b.note, 240) };
      case "image": return { id, type, url: safeUrl(b.url), caption: s(b.caption, 200) };
      case "video": return { id, type, url: safeUrl(b.url), caption: s(b.caption, 200) };
      case "gallery": return { id, type, title: s(b.title, 120), items: arr(b.items, 9, (i) => ({ url: safeUrl(i.url), caption: s(i.caption, 120) })) };
      case "testimonials": return { id, type, title: s(b.title, 120), items: arr(b.items, 8, (i) => ({ name: s(i.name, 80), role: s(i.role, 80), quote: s(i.quote, 500), imageUrl: safeUrl(i.imageUrl) })) };
      case "stats": return { id, type, items: arr(b.items, 4, (i) => ({ value: s(i.value, 24), label: s(i.label, 60) })) };
      case "faq": return { id, type, title: s(b.title, 120), items: arr(b.items, 12, (i) => ({ q: s(i.q, 200), a: s(i.a, 800) })) };
      case "guarantee": return { id, type, title: s(b.title, 120), text: s(b.text, 600) };
      case "about": return { id, type, title: s(b.title, 120), name: s(b.name, 80), text: s(b.text, 1200), imageUrl: safeUrl(b.imageUrl) };
      case "countdown": return { id, type, label: s(b.label, 80), endsAt: iso(b.endsAt) };
      case "event": return { id, type, title: s(b.title, 120), startsAt: iso(b.startsAt), where: s(b.where, 200), note: s(b.note, 300) };
      case "lead_form": return { id, type, title: s(b.title, 120), text: s(b.text, 300), buttonText: s(b.buttonText, 40), successMessage: s(b.successMessage, 200), askPhone: bool(b.askPhone, true), askMessage: bool(b.askMessage, false), imageUrl: safeUrl(b.imageUrl) };
      case "order_form": return { id, type, title: s(b.title, 120), text: s(b.text, 300), buttonText: s(b.buttonText, 40), successMessage: s(b.successMessage, 200), productName: s(b.productName, 120), price: s(b.price, 40), bumpText: s(b.bumpText, 160), bumpPrice: s(b.bumpPrice, 40) };
      case "cta": return { id, type, headline: s(b.headline, 160), text: s(b.text, 300), buttonText: s(b.buttonText, 40), buttonLink: safeLink(b.buttonLink) || "#order" };
      case "button": return { id, type, text: s(b.text, 40), link: safeLink(b.link) || "#order" };
      case "spacer": return { id, type };
      case "footer": return { id, type, text: s(b.text, 600) };
      default: return null;
    }
  })();
  if (!out) return null;
  for (const [k, v] of Object.entries(common)) if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  return out;
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
    style: oneOf(t.style, STYLE_KEYS) ?? DEFAULT_THEME.style,
    accent: typeof t.accent === "string" && /^#[0-9a-fA-F]{6}$/.test(t.accent) ? t.accent : DEFAULT_THEME.accent,
    mode: t.mode === "dark" ? "dark" : "light",
  };
}

export function cleanProduct(raw: unknown): FunnelProduct {
  const p = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    name: s(p.name, 120), price: s(p.price, 40), description: s(p.description, 2000), benefits: s(p.benefits, 2000),
    audience: s(p.audience, 300), offer: s(p.offer, 400), imageUrl: safeUrl(p.imageUrl), whatsapp: bool(p.whatsapp, true),
    funnelType: oneOf(p.funnelType, FUNNEL_TYPES.map((t) => t.key)) ?? "sales",
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
