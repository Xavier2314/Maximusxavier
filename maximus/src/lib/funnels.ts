/** Funnel builder: block types, validation and defaults. Pure data, safe on server and client. */

export type StyleKey = "clean" | "bold" | "luxe" | "wellness" | "midnight" | "sunrise" | "editorial" | "playful";
export const STYLE_KEYS: StyleKey[] = ["clean", "bold", "luxe", "wellness", "midnight", "sunrise", "editorial", "playful"];

export type FontKey = "inter" | "poppins" | "playfair" | "dmsans" | "spacegrotesk" | "lora";
export const FONT_KEYS: FontKey[] = ["inter", "poppins", "playfair", "dmsans", "spacegrotesk", "lora"];
export const FONT_LABELS: Record<FontKey, string> = { inter: "Inter (clean)", poppins: "Poppins (friendly)", playfair: "Playfair (elegant serif)", dmsans: "DM Sans (soft)", spacegrotesk: "Space Grotesk (techy)", lora: "Lora (editorial serif)" };

/** Global design tokens: the style sets the defaults, these override them across the whole funnel. */
export type FunnelTheme = {
  style: StyleKey; accent: string; mode: "light" | "dark";
  headingFont?: FontKey; bodyFont?: FontKey; radius?: "sharp" | "soft" | "round"; button?: "solid" | "gradient" | "neo";
};
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
  /** More product photos (the main one is imageUrl). */
  images: string[];
  /** Shown through merge fields like {{business.name}}. Only what the seller types is ever used. */
  business: { name: string; phone: string; email: string; address: string };
};
export const EMPTY_PRODUCT: FunnelProduct = { name: "", price: "", description: "", benefits: "", audience: "", offer: "", imageUrl: "", whatsapp: true, funnelType: "sales", images: [], business: { name: "", phone: "", email: "", address: "" } };
export const MAX_IMAGES = 8;

export type Bg = "none" | "tint" | "accent" | "dark" | "gradient" | "custom" | "image";
export type Space = "compact" | "normal" | "roomy";
export type Align = "left" | "center";
export type Radius = "none" | "soft" | "round";
export type Shadow = "none" | "soft" | "strong";
export type Anim = "none" | "fade" | "up" | "left" | "right" | "zoom";

/** Per-device overrides. Desktop is the base; tablet inherits desktop; mobile inherits tablet. */
export type Resp = { hidden?: boolean; space?: Space; scale?: number };
export type RespMap = { tablet?: Resp; mobile?: Resp };

// --- Nested layout: Section (block) > Row > Column > Element --------------------------------------
type ElCommon = { id: string; resp?: RespMap; anim?: Anim; align?: Align };
export type FunnelElement = ElCommon & (
  | { type: "heading"; text: string; level: 1 | 2 | 3 | 4 }
  | { type: "text"; text: string }
  | { type: "bullets"; items: string; icon: string }
  | { type: "button"; text: string; link: string; look: "solid" | "outline" | "soft"; full: boolean }
  | { type: "image"; url: string; alt: string; fit: "cover" | "contain"; ratio: "auto" | "1:1" | "4:3" | "16:9" | "3:4"; radius: Radius }
  | { type: "video"; url: string; caption: string }
  | { type: "divider" }
  | { type: "spacer"; size: "s" | "m" | "l" }
  | { type: "icon"; emoji: string; title: string; text: string }
  | { type: "social"; items: { platform: string; url: string }[] }
  | { type: "countdown"; label: string; endsAt: string }
  | { type: "progress"; label: string; value: number }
  | { type: "faq"; items: Faq[] }
  | { type: "form"; title: string; text: string; buttonText: string; successMessage: string; askPhone: boolean; askMessage: boolean }
);
export type ElementType = FunnelElement["type"];
export type FunnelColumn = { id: string; elements: FunnelElement[]; vAlign?: "top" | "center" | "bottom"; bg?: Bg; bgColor?: string; radius?: Radius; shadow?: Shadow; pad?: Space };
export type FunnelRow = { id: string; columns: FunnelColumn[]; widths?: string; gap?: "s" | "m" | "l"; stack?: "tablet" | "mobile" | "never"; reverse?: boolean };

type Item = { icon: string; title: string; text: string };
type Quote = { name: string; role: string; quote: string; imageUrl: string };
type Faq = { q: string; a: string };
type Included = { title: string; text: string; value: string };
type Stat = { value: string; label: string };
type Pic = { url: string; caption: string };

type Common = {
  id: string; bg?: Bg; bgColor?: string; bgImage?: string; space?: Space; align?: Align; variant?: string;
  resp?: RespMap; anim?: Anim; radius?: Radius; shadow?: Shadow; name?: string; locked?: boolean;
};
export type FunnelBlock = Common & (
  | { type: "announcement"; text: string; link: string }
  | { type: "hero"; badge: string; headline: string; subheadline: string; buttonText: string; buttonLink: string; imageUrl: string }
  | { type: "text"; title: string; body: string }
  | { type: "benefits"; title: string; subtitle: string; items: Item[] }
  | { type: "steps"; title: string; items: Item[] }
  | { type: "product"; name: string; price: string; oldPrice: string; description: string; points: string; imageUrl: string; images: string[]; buttonText: string }
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
  | { type: "section"; rows: FunnelRow[] }
);
export type BlockType = FunnelBlock["type"];
export type PageSeo = { title: string; description: string; image: string; noIndex: boolean };
export type FunnelPage = { id: string; name: string; slug: string; blocks: FunnelBlock[]; seo?: PageSeo };

export type Funnel = {
  id: string; user_id: string; title: string; slug: string; published: boolean;
  product: FunnelProduct; theme: FunnelTheme; pages: FunnelPage[]; views: number; updated_at: string;
  live_at: string | null; live: { title?: string; theme?: unknown; product?: unknown; pages?: unknown } | null;
};
export const FUNNEL_COLUMNS = "id, user_id, title, slug, published, product, theme, pages, views, updated_at, live_at, live";

export const BLOCK_GROUPS: { title: string; types: BlockType[] }[] = [
  { title: "Top of the page", types: ["announcement", "hero", "countdown", "event"] },
  { title: "Explain & sell", types: ["text", "benefits", "steps", "product", "offer", "guarantee"] },
  { title: "Show & prove", types: ["image", "video", "gallery", "testimonials", "stats", "about", "faq"] },
  { title: "Get the order", types: ["order_form", "lead_form", "cta", "button"] },
  { title: "Finish", types: ["spacer", "footer"] },
  { title: "Build your own", types: ["section"] },
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
  section: { label: "Custom section", hint: "Rows and columns you arrange yourself", emoji: "🧱" },
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

export const ELEMENT_GROUPS: { title: string; types: ElementType[] }[] = [
  { title: "Text", types: ["heading", "text", "bullets"] },
  { title: "Buttons & forms", types: ["button", "form"] },
  { title: "Media", types: ["image", "video", "icon"] },
  { title: "Extras", types: ["countdown", "progress", "social", "faq", "divider", "spacer"] },
];
export const ELEMENT_LABELS: Record<ElementType, { label: string; emoji: string }> = {
  heading: { label: "Headline", emoji: "🅷" }, text: { label: "Paragraph", emoji: "¶" }, bullets: { label: "Bullet list", emoji: "☰" },
  button: { label: "Button", emoji: "🔘" }, form: { label: "Form", emoji: "📥" }, image: { label: "Image", emoji: "🖼️" },
  video: { label: "Video", emoji: "🎬" }, icon: { label: "Icon + text", emoji: "⭐" }, countdown: { label: "Countdown", emoji: "⏳" },
  progress: { label: "Progress bar", emoji: "📶" }, social: { label: "Social icons", emoji: "🔗" }, faq: { label: "FAQ", emoji: "❓" },
  divider: { label: "Divider", emoji: "➖" }, spacer: { label: "Spacer", emoji: "↕️" },
};
export const ROW_PRESETS = [1, 2, 3, 4, 5, 6] as const;
export const SOCIAL_PLATFORMS = ["facebook", "instagram", "whatsapp", "tiktok", "youtube", "x", "linkedin", "telegram"] as const;

export function newElement(type: ElementType): FunnelElement {
  const id = uid();
  switch (type) {
    case "heading": return { id, type, text: "A clear headline", level: 2 };
    case "text": return { id, type, text: "Write something your visitors want to know." };
    case "bullets": return { id, type, items: "First point\nSecond point\nThird point", icon: "✓" };
    case "button": return { id, type, text: "Order now", link: "#order", look: "solid", full: false };
    case "image": return { id, type, url: "", alt: "", fit: "cover", ratio: "auto", radius: "soft" };
    case "video": return { id, type, url: "", caption: "" };
    case "divider": return { id, type };
    case "spacer": return { id, type, size: "m" };
    case "icon": return { id, type, emoji: "✨", title: "Feature", text: "Say what it does for them." };
    case "social": return { id, type, items: [{ platform: "whatsapp", url: "" }, { platform: "instagram", url: "" }] };
    case "countdown": return { id, type, label: "Offer ends in", endsAt: "" };
    case "progress": return { id, type, label: "Stock claimed", value: 70 };
    case "faq": return { id, type, items: [{ q: "A question?", a: "A clear answer." }] };
    case "form": return { id, type, title: "Get in touch", text: "We reply quickly.", buttonText: "Send", successMessage: "Thank you! We will be in touch shortly.", askPhone: true, askMessage: false };
  }
}
export const newColumn = (elements: FunnelElement[] = []): FunnelColumn => ({ id: uid(), elements });
export const newRow = (cols: number): FunnelRow => ({ id: uid(), columns: Array.from({ length: Math.min(6, Math.max(1, cols)) }, () => newColumn()), gap: "m", stack: "mobile" });

export const uid = () => Math.random().toString(36).slice(2, 10);

export function newBlock(type: BlockType): FunnelBlock {
  const id = uid();
  switch (type) {
    case "announcement": return { id, type, text: "Free delivery on orders this week", link: "" };
    case "hero": return { id, type, badge: "", headline: "Your headline goes here", subheadline: "One clear sentence about what you offer and who it is for.", buttonText: "Order now", buttonLink: "#order", imageUrl: "" };
    case "text": return { id, type, title: "Heading", body: "Write something your customers want to know." };
    case "benefits": return { id, type, title: "Why you will love it", subtitle: "", items: [{ icon: "✨", title: "Benefit one", text: "What it does for your customer." }, { icon: "💪", title: "Benefit two", text: "Another reason to buy." }, { icon: "🕒", title: "Benefit three", text: "One more good reason." }] };
    case "steps": return { id, type, title: "How it works", items: [{ icon: "", title: "Order", text: "Fill in the short form." }, { icon: "", title: "We confirm", text: "We call or message you." }, { icon: "", title: "Delivered", text: "Receive it at your door." }] };
    case "product": return { id, type, name: "Product name", price: "", oldPrice: "", description: "A short description of the product.", points: "", imageUrl: "", images: [], buttonText: "Order now" };
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
    case "section": return { id, type, rows: [{ ...newRow(2), columns: [newColumn([newElement("heading"), newElement("text")]), newColumn([newElement("image")])] }] };
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
  if (/^#[a-z0-9_-]{0,40}$/i.test(u)) return u;
  // tel: and mailto: links may contain merge fields such as {{business.phone}}; they are resolved (and re-checked) when rendered.
  if (/^(tel|mailto):[+a-z0-9@._{}\s-]{1,120}$/i.test(u)) return u;
  return safeUrl(u);
};
const arr = <T>(v: unknown, max: number, f: (x: Record<string, unknown>) => T | null): T[] =>
  (Array.isArray(v) ? v : []).slice(0, max).map((x) => (x && typeof x === "object" ? f(x as Record<string, unknown>) : null)).filter((x): x is T => x !== null);
const iso = (v: unknown) => { const t = s(v, 40); return Number.isFinite(Date.parse(t)) ? t : ""; };
const oneOf = <T extends string>(v: unknown, list: readonly T[]): T | undefined => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : undefined);

const ANIMS = ["none", "fade", "up", "left", "right", "zoom"] as const;
const hex = (v: unknown) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : undefined);
const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d);
const rid = (v: unknown) => (/^[a-z0-9]{4,12}$/i.test(String(v ?? "")) ? String(v) : uid());

function cleanResp1(raw: unknown): Resp | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const out: Resp = {};
  if (r.hidden === true) out.hidden = true;
  const sp = oneOf(r.space, ["compact", "normal", "roomy"] as const);
  if (sp) out.space = sp;
  if (typeof r.scale === "number") out.scale = num(r.scale, 50, 150, 100);
  return Object.keys(out).length ? out : undefined;
}
export function cleanResp(raw: unknown): RespMap | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const out: RespMap = {};
  const t = cleanResp1(r.tablet), m = cleanResp1(r.mobile);
  if (t) out.tablet = t;
  if (m) out.mobile = m;
  return Object.keys(out).length ? out : undefined;
}

export function cleanElement(raw: unknown): FunnelElement | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  const id = rid(e.id);
  const c = { resp: cleanResp(e.resp), anim: oneOf(e.anim, ANIMS), align: oneOf(e.align, ["left", "center"] as const) };
  const out = ((): FunnelElement | null => {
    switch (e.type) {
      case "heading": return { id, type: "heading", text: s(e.text, 300), level: ([1, 2, 3, 4] as const).find((l) => l === e.level) ?? 2 };
      case "text": return { id, type: "text", text: s(e.text, 4000) };
      case "bullets": return { id, type: "bullets", items: s(e.items, 2000), icon: s(e.icon, 4) || "✓" };
      case "button": return { id, type: "button", text: s(e.text, 60), link: safeLink(e.link) || "#order", look: oneOf(e.look, ["solid", "outline", "soft"] as const) ?? "solid", full: e.full === true };
      case "image": return { id, type: "image", url: safeUrl(e.url), alt: s(e.alt, 200), fit: e.fit === "contain" ? "contain" : "cover", ratio: oneOf(e.ratio, ["auto", "1:1", "4:3", "16:9", "3:4"] as const) ?? "auto", radius: oneOf(e.radius, ["none", "soft", "round"] as const) ?? "soft" };
      case "video": return { id, type: "video", url: safeUrl(e.url), caption: s(e.caption, 200) };
      case "divider": return { id, type: "divider" };
      case "spacer": return { id, type: "spacer", size: oneOf(e.size, ["s", "m", "l"] as const) ?? "m" };
      case "icon": return { id, type: "icon", emoji: s(e.emoji, 8), title: s(e.title, 100), text: s(e.text, 400) };
      case "social": return { id, type: "social", items: arr(e.items, 8, (i) => { const platform = oneOf(i.platform, SOCIAL_PLATFORMS); return platform ? { platform, url: safeUrl(i.url) } : null; }) };
      case "countdown": return { id, type: "countdown", label: s(e.label, 80), endsAt: iso(e.endsAt) };
      case "progress": return { id, type: "progress", label: s(e.label, 80), value: num(e.value, 0, 100, 50) };
      case "faq": return { id, type: "faq", items: arr(e.items, 12, (i) => ({ q: s(i.q, 200), a: s(i.a, 800) })) };
      case "form": return { id, type: "form", title: s(e.title, 120), text: s(e.text, 300), buttonText: s(e.buttonText, 40), successMessage: s(e.successMessage, 200), askPhone: bool(e.askPhone, true), askMessage: bool(e.askMessage, false) };
      default: return null;
    }
  })();
  if (!out) return null;
  for (const [k, v] of Object.entries(c)) if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  return out;
}

const WIDTHS = ["1fr", "1fr 1fr", "1fr 2fr", "2fr 1fr", "1fr 1fr 1fr", "1fr 2fr 1fr", "1fr 1fr 1fr 1fr", "1fr 1fr 1fr 1fr 1fr", "1fr 1fr 1fr 1fr 1fr 1fr"] as const;
function cleanColumn(raw: Record<string, unknown>): FunnelColumn {
  const col: FunnelColumn = { id: rid(raw.id), elements: arr(raw.elements, 24, cleanElement) };
  const v = oneOf(raw.vAlign, ["top", "center", "bottom"] as const); if (v) col.vAlign = v;
  const bg = oneOf(raw.bg, ["none", "tint", "accent", "dark", "gradient", "custom"] as const); if (bg) col.bg = bg;
  const bc = hex(raw.bgColor); if (bc) col.bgColor = bc;
  const r = oneOf(raw.radius, ["none", "soft", "round"] as const); if (r) col.radius = r;
  const sh = oneOf(raw.shadow, ["none", "soft", "strong"] as const); if (sh) col.shadow = sh;
  const pad = oneOf(raw.pad, ["compact", "normal", "roomy"] as const); if (pad) col.pad = pad;
  return col;
}
function cleanRow(raw: Record<string, unknown>): FunnelRow | null {
  const columns = arr(raw.columns, 6, cleanColumn);
  if (!columns.length) return null;
  const row: FunnelRow = { id: rid(raw.id), columns };
  const w = oneOf(raw.widths, WIDTHS);
  if (w && w.split(" ").length === columns.length) row.widths = w;
  const g = oneOf(raw.gap, ["s", "m", "l"] as const); if (g) row.gap = g;
  const st = oneOf(raw.stack, ["tablet", "mobile", "never"] as const); if (st) row.stack = st;
  if (raw.reverse === true) row.reverse = true;
  return row;
}

/** Every id in a document must be unique (selection, copy/paste and CSS targeting depend on it). Duplicates get fresh ids. */
export function ensureUniqueIds(pages: FunnelPage[]): FunnelPage[] {
  const seen = new Set<string>();
  const fix = (id: string) => { if (seen.has(id)) id = uid(); while (seen.has(id)) id = uid(); seen.add(id); return id; };
  return pages.map((p) => ({
    ...p, id: fix(p.id),
    blocks: p.blocks.map((b) => {
      const nb: FunnelBlock = { ...b, id: fix(b.id) };
      if (nb.type === "section") nb.rows = nb.rows.map((r) => ({ ...r, id: fix(r.id), columns: r.columns.map((c) => ({ ...c, id: fix(c.id), elements: c.elements.map((e) => ({ ...e, id: fix(e.id) })) })) }));
      return nb;
    }),
  }));
}

export function cleanBlock(raw: unknown): FunnelBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  const id = /^[a-z0-9]{4,12}$/i.test(String(b.id ?? "")) ? String(b.id) : uid();
  const type = String(b.type ?? "") as BlockType;
  const common: Omit<Common, "id"> = {
    bg: oneOf(b.bg, ["none", "tint", "accent", "dark", "gradient", "custom", "image"] as const),
    bgColor: hex(b.bgColor), bgImage: safeUrl(b.bgImage) || undefined,
    space: oneOf(b.space, ["compact", "normal", "roomy"] as const),
    align: oneOf(b.align, ["left", "center"] as const),
    variant: oneOf(b.variant, (VARIANTS[type] ?? []).map((v) => v.key)),
    resp: cleanResp(b.resp), anim: oneOf(b.anim, ANIMS), radius: oneOf(b.radius, ["none", "soft", "round"] as const),
    shadow: oneOf(b.shadow, ["none", "soft", "strong"] as const), name: s(b.name, 60) || undefined, locked: b.locked === true ? true : undefined,
  };
  const out = ((): FunnelBlock | null => {
    switch (type) {
      case "announcement": return { id, type, text: s(b.text, 160), link: safeLink(b.link) };
      case "hero": return { id, type, badge: s(b.badge, 60), headline: s(b.headline, 160), subheadline: s(b.subheadline, 400), buttonText: s(b.buttonText, 40), buttonLink: safeLink(b.buttonLink) || "#order", imageUrl: safeUrl(b.imageUrl) };
      case "text": return { id, type, title: s(b.title, 120), body: s(b.body, 3000) };
      case "benefits": return { id, type, title: s(b.title, 120), subtitle: s(b.subtitle, 240), items: arr(b.items, 9, (i) => ({ icon: s(i.icon, 8), title: s(i.title, 80), text: s(i.text, 300) })) };
      case "steps": return { id, type, title: s(b.title, 120), items: arr(b.items, 5, (i) => ({ icon: "", title: s(i.title, 80), text: s(i.text, 300) })) };
      case "product": return { id, type, name: s(b.name, 120), price: s(b.price, 40), oldPrice: s(b.oldPrice, 40), description: s(b.description, 1200), points: s(b.points, 800), imageUrl: safeUrl(b.imageUrl), images: (Array.isArray(b.images) ? b.images : []).slice(0, MAX_IMAGES).map((u) => safeUrl(u)).filter(Boolean), buttonText: s(b.buttonText, 40) };
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
      case "section": return { id, type, rows: arr(b.rows, 8, cleanRow) };
      default: return null;
    }
  })();
  if (!out) return null;
  for (const [k, v] of Object.entries(common)) if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  return out;
}

export function cleanPages(raw: unknown): FunnelPage[] {
  const seen = new Set<string>();
  return ensureUniqueIds(arr(raw, 6, (p) => {
    const name = s(p.name, 40) || "Page";
    let slug = s(p.slug, 30).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || newPage(name).slug;
    while (seen.has(slug)) slug = `${slug}-2`.slice(0, 30);
    seen.add(slug);
    const id = /^[a-z0-9]{4,12}$/i.test(String(p.id ?? "")) ? String(p.id) : uid();
    const blocks = arr(p.blocks, 60, (b) => cleanBlock(b));
    const out: FunnelPage = { id, name, slug, blocks };
    const seo = p.seo && typeof p.seo === "object" ? (p.seo as Record<string, unknown>) : null;
    if (seo) out.seo = { title: s(seo.title, 120), description: s(seo.description, 320), image: safeUrl(seo.image), noIndex: seo.noIndex === true };
    return out;
  }));
}

export function cleanTheme(raw: unknown): FunnelTheme {
  const t = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    style: oneOf(t.style, STYLE_KEYS) ?? DEFAULT_THEME.style,
    accent: typeof t.accent === "string" && /^#[0-9a-fA-F]{6}$/.test(t.accent) ? t.accent : DEFAULT_THEME.accent,
    mode: t.mode === "dark" ? "dark" : "light",
    ...(oneOf(t.headingFont, FONT_KEYS) ? { headingFont: oneOf(t.headingFont, FONT_KEYS) } : {}),
    ...(oneOf(t.bodyFont, FONT_KEYS) ? { bodyFont: oneOf(t.bodyFont, FONT_KEYS) } : {}),
    ...(oneOf(t.radius, ["sharp", "soft", "round"] as const) ? { radius: oneOf(t.radius, ["sharp", "soft", "round"] as const) } : {}),
    ...(oneOf(t.button, ["solid", "gradient", "neo"] as const) ? { button: oneOf(t.button, ["solid", "gradient", "neo"] as const) } : {}),
  };
}

export function cleanProduct(raw: unknown): FunnelProduct {
  const p = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    name: s(p.name, 120), price: s(p.price, 40), description: s(p.description, 2000), benefits: s(p.benefits, 2000),
    audience: s(p.audience, 300), offer: s(p.offer, 400), imageUrl: safeUrl(p.imageUrl), whatsapp: bool(p.whatsapp, true),
    images: (Array.isArray(p.images) ? p.images : []).slice(0, MAX_IMAGES).map((u) => safeUrl(u)).filter(Boolean),
    business: (() => { const b = (p.business && typeof p.business === "object" ? p.business : {}) as Record<string, unknown>; return { name: s(b.name, 120), phone: s(b.phone, 40), email: s(b.email, 254), address: s(b.address, 240) }; })(),
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
