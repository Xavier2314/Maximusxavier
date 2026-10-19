/** Member portfolio websites (public at /p/<slug>). */
export type PortfolioService = { title: string; description: string; price?: string | null };
export type PortfolioProject = { title: string; description: string; link?: string | null };
export type Portfolio = {
  id: string; user_id: string; slug: string; title: string | null; published: boolean; headline: string | null; bio: string | null;
  skills: string[]; services: PortfolioService[]; projects: PortfolioProject[]; show_whatsapp: boolean; show_email: boolean;
  accent: string | null; views: number; updated_at: string;
  blocks: PortfolioBlock[]; socials: Socials; design: Design;
};
export const PORTFOLIO_COLUMNS = "id, user_id, slug, title, published, headline, bio, skills, services, projects, show_whatsapp, show_email, accent, views, updated_at, blocks, socials, design";

/** "Title | price | description" lines, one service per line. */
export const servicesToText = (list: PortfolioService[]) => list.map((s) => [s.title, s.price ?? "", s.description].join(" | ")).join("\n");
export function textToServices(text: string): PortfolioService[] {
  return text.split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((p) => p[0])
    .slice(0, 12).map(([title, price, ...rest]) => ({ title: title.slice(0, 80), price: price ? price.slice(0, 40) : null, description: rest.join(" | ").slice(0, 400) }));
}
/** "Title | link | description" lines, one project per line. */
export const projectsToText = (list: PortfolioProject[]) => list.map((p) => [p.title, p.link ?? "", p.description].join(" | ")).join("\n");
export function textToProjects(text: string): PortfolioProject[] {
  return text.split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((p) => p[0])
    .slice(0, 20).map(([title, link, ...rest]) => ({
      title: title.slice(0, 100), link: link && /^https?:\/\/\S+$/i.test(link) ? link.slice(0, 300) : null, description: rest.join(" | ").slice(0, 500),
    }));
}

// --- Media blocks, social links and page design ------------------------------

export type BlockType = "image" | "video" | "file" | "text" | "embed";
export type PortfolioBlock = {
  id: string; type: BlockType; title?: string | null; text?: string | null;
  /** Uploaded file (public URL) for image/video/file. */
  url?: string | null; name?: string | null;
  /** YouTube/Loom link for embed blocks. */
  provider?: "youtube" | "loom" | null; video_id?: string | null;
};

export const SOCIALS = [
  { key: "instagram", label: "Instagram", base: "https://instagram.com/" },
  { key: "facebook", label: "Facebook", base: "https://facebook.com/" },
  { key: "tiktok", label: "TikTok", base: "https://www.tiktok.com/@" },
  { key: "x", label: "X (Twitter)", base: "https://x.com/" },
  { key: "linkedin", label: "LinkedIn", base: "https://www.linkedin.com/in/" },
  { key: "youtube", label: "YouTube", base: "https://www.youtube.com/@" },
  { key: "upwork", label: "Upwork", base: "" },
  { key: "fiverr", label: "Fiverr", base: "https://www.fiverr.com/" },
  { key: "website", label: "Website", base: "" },
] as const;
export type SocialKey = (typeof SOCIALS)[number]["key"];
export type Socials = Partial<Record<SocialKey, string>>;

export const SECTIONS = [
  { key: "about", label: "About me" }, { key: "skills", label: "Skills" }, { key: "services", label: "Services" },
  { key: "gallery", label: "Portfolio (media)" }, { key: "work", label: "Work samples" }, { key: "contact", label: "Contact box" },
] as const;
export type SectionKey = (typeof SECTIONS)[number]["key"];
export type Design = {
  mode?: "light" | "dark"; layout?: "center" | "left"; font?: "modern" | "classic";
  cover_url?: string | null; button_text?: string | null; hide?: SectionKey[];
};
export const DEFAULT_DESIGN: Required<Pick<Design, "mode" | "layout" | "font">> = { mode: "light", layout: "center", font: "modern" };

const isHttps = (u: unknown): u is string => typeof u === "string" && /^https:\/\/\S+$/i.test(u) && u.length <= 600;

/** Turns a handle or link into a full profile URL, or null if it isn't usable. */
export function socialUrl(key: SocialKey, value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return isHttps(v.replace(/^http:/i, "https:")) ? v.replace(/^http:/i, "https:") : null;
  if (/^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(v)) return `https://${v}`;
  const s = SOCIALS.find((x) => x.key === key);
  const handle = v.replace(/^@/, "");
  return s?.base && /^[\w.-]{1,60}$/.test(handle) ? `${s.base}${handle}` : null;
}

export function cleanSocials(input: unknown): Socials {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: Socials = {};
  for (const s of SOCIALS) {
    const url = socialUrl(s.key, typeof o[s.key] === "string" ? (o[s.key] as string) : null);
    if (url) out[s.key] = url;
  }
  return out;
}

export function cleanDesign(input: unknown): Design {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return {
    mode: o.mode === "dark" ? "dark" : "light",
    layout: o.layout === "left" ? "left" : "center",
    font: o.font === "classic" ? "classic" : "modern",
    cover_url: isHttps(o.cover_url) && !/["'()<>\\]/.test(o.cover_url) ? o.cover_url : null,
    button_text: typeof o.button_text === "string" && o.button_text.trim() ? o.button_text.trim().slice(0, 40) : null,
    hide: Array.isArray(o.hide) ? (o.hide.filter((h) => SECTIONS.some((s) => s.key === h)) as SectionKey[]) : [],
  };
}

export function cleanBlocks(input: unknown): PortfolioBlock[] {
  if (!Array.isArray(input)) return [];
  const out: PortfolioBlock[] = [];
  for (const raw of input.slice(0, 40)) {
    const b = (raw ?? {}) as Record<string, unknown>;
    const base = {
      id: typeof b.id === "string" && /^[\w-]{1,40}$/.test(b.id) ? b.id : Math.random().toString(36).slice(2, 12),
      title: typeof b.title === "string" ? b.title.trim().slice(0, 120) || null : null,
    };
    if (b.type === "text" && typeof b.text === "string" && b.text.trim()) out.push({ ...base, type: "text", text: b.text.trim().slice(0, 3000) });
    else if ((b.type === "image" || b.type === "video" || b.type === "file") && isHttps(b.url)) {
      out.push({ ...base, type: b.type, url: b.url, name: typeof b.name === "string" ? b.name.slice(0, 120) : null, text: typeof b.text === "string" ? b.text.slice(0, 500) : null });
    } else if (b.type === "embed" && (b.provider === "youtube" || b.provider === "loom") && typeof b.video_id === "string" && /^[\w-]{11,32}$/.test(b.video_id)) {
      out.push({ ...base, type: "embed", provider: b.provider, video_id: b.video_id, text: typeof b.text === "string" ? b.text.slice(0, 500) : null });
    }
  }
  return out;
}
