import type { Bg, FontKey, FunnelTheme, StyleKey } from "@/lib/funnels";

/** Each style is a complete look: fonts, shapes, buttons, cards and how the hero is dressed. */
export type StyleDef = {
  key: StyleKey; name: string; blurb: string; mode: "light" | "dark"; accent: string;
  bg: string; surface: string; alt: string; text: string; mute: string; line: string;
  heading: string; body: string; weight: number; tracking: string;
  radius: number; btnRadius: number; btn: "solid" | "gradient" | "neo"; card: "soft" | "flat" | "glass" | "neo";
  hero: "tint" | "plain" | "dark" | "glow";
  heroAlign: "center" | "left";
  /** Suggested for these kinds of products; the AI uses this to pick a look. */
  goodFor: string;
};

const f = (v: string, fallback = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif") => `var(${v}), ${fallback}`;
const serif = "Georgia, 'Times New Roman', serif";

export const STYLES: Record<StyleKey, StyleDef> = {
  clean: { key: "clean", name: "Clean & modern", blurb: "Crisp white, friendly blue, easy to read. Works for anything.", mode: "light", accent: "#2563eb",
    bg: "#ffffff", surface: "#f8fafc", alt: "#f1f5f9", text: "#0f172a", mute: "#475569", line: "#e2e8f0", heading: f("--f-inter"), body: f("--f-inter"), weight: 800, tracking: "-0.025em",
    radius: 16, btnRadius: 12, btn: "solid", card: "soft", hero: "tint", heroAlign: "center", goodFor: "general products, services, everyday offers" },
  bold: { key: "bold", name: "Bold gradient", blurb: "A dark, confident hero with a vivid gradient. Built to stop the scroll.", mode: "light", accent: "#7c3aed",
    bg: "#ffffff", surface: "#f8fafc", alt: "#f5f3ff", text: "#0f172a", mute: "#475569", line: "#e5e7eb", heading: f("--f-poppins"), body: f("--f-inter"), weight: 800, tracking: "-0.03em",
    radius: 22, btnRadius: 999, btn: "gradient", card: "soft", hero: "dark", heroAlign: "center", goodFor: "launches, courses, tech, energy, money, ambition" },
  luxe: { key: "luxe", name: "Luxe & elegant", blurb: "Warm cream, fine serif headlines and gold details. Feels premium.", mode: "light", accent: "#9a6b12",
    bg: "#faf7f2", surface: "#ffffff", alt: "#f2ebdf", text: "#1c1917", mute: "#57534e", line: "#e6dccb", heading: f("--f-playfair", serif), body: f("--f-dmsans"), weight: 700, tracking: "-0.01em",
    radius: 6, btnRadius: 2, btn: "solid", card: "flat", hero: "plain", heroAlign: "center", goodFor: "beauty, skincare, jewellery, fashion, premium or gift products" },
  wellness: { key: "wellness", name: "Fresh wellness", blurb: "Soft greens, rounded shapes and calm spacing. Natural and trustworthy.", mode: "light", accent: "#2f855a",
    bg: "#f8fbf6", surface: "#ffffff", alt: "#e9f3e2", text: "#14281d", mute: "#3f5a48", line: "#d6e6cd", heading: f("--f-dmsans"), body: f("--f-dmsans"), weight: 700, tracking: "-0.02em",
    radius: 26, btnRadius: 999, btn: "solid", card: "soft", hero: "tint", heroAlign: "center", goodFor: "health, nutrition, supplements, fitness, home and family products" },
  midnight: { key: "midnight", name: "Midnight glow", blurb: "Deep dark background with a glowing accent. Modern and high-tech.", mode: "dark", accent: "#22d3ee",
    bg: "#070b16", surface: "#0f172a", alt: "#0a1020", text: "#f1f5f9", mute: "#94a3b8", line: "#1e293b", heading: f("--f-spacegrotesk"), body: f("--f-inter"), weight: 700, tracking: "-0.03em",
    radius: 18, btnRadius: 14, btn: "gradient", card: "glass", hero: "glow", heroAlign: "center", goodFor: "tech, gadgets, trading, gaming, nightlife, digital products" },
  sunrise: { key: "sunrise", name: "Warm sunrise", blurb: "Peachy warmth, rounded buttons and a friendly, human tone.", mode: "light", accent: "#d9480f",
    bg: "#fffaf5", surface: "#ffffff", alt: "#ffefe0", text: "#2b1a12", mute: "#7a5a46", line: "#f6dcc6", heading: f("--f-poppins"), body: f("--f-dmsans"), weight: 700, tracking: "-0.02em",
    radius: 22, btnRadius: 999, btn: "gradient", card: "soft", hero: "tint", heroAlign: "center", goodFor: "food, kids, community, events, everyday family products" },
  editorial: { key: "editorial", name: "Editorial", blurb: "Magazine style: huge serif headlines, strong lines, one red accent.", mode: "light", accent: "#c81e1e",
    bg: "#ffffff", surface: "#ffffff", alt: "#f6f6f4", text: "#111111", mute: "#505050", line: "#111111", heading: f("--f-lora", serif), body: f("--f-inter"), weight: 700, tracking: "-0.035em",
    radius: 0, btnRadius: 0, btn: "solid", card: "flat", hero: "plain", heroAlign: "left", goodFor: "coaching, books, personal brands, serious or story-led offers" },
  playful: { key: "playful", name: "Playful pop", blurb: "Bright colour, thick outlines and hard shadows. Fun and memorable.", mode: "light", accent: "#e11d48",
    bg: "#fffbeb", surface: "#ffffff", alt: "#fef3c7", text: "#111827", mute: "#374151", line: "#111827", heading: f("--f-spacegrotesk"), body: f("--f-dmsans"), weight: 700, tracking: "-0.03em",
    radius: 16, btnRadius: 14, btn: "neo", card: "neo", hero: "plain", heroAlign: "center", goodFor: "youth, fun products, snacks, accessories, giveaways, quick offers" },
};

// --- colour helpers --------------------------------------------------------------------------------

const clamp = (n: number, a = 0, b = 255) => Math.min(b, Math.max(a, n));
export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toHex = (r: number, g: number, b: number) => `#${[r, g, b].map((x) => clamp(Math.round(x)).toString(16).padStart(2, "0")).join("")}`;
export function rgba(hex: string, a: number) { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }
export function mix(a: string, b: string, t: number) {
  const [r1, g1, b1] = hexToRgb(a), [r2, g2, b2] = hexToRgb(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}
/** Readable text colour (dark or white) on top of a colour. */
export function onColor(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160 ? "#0f172a" : "#ffffff";
}
/** A neighbouring hue, used for gradients so any accent colour gets a matching partner. */
export function shiftHue(hex: string, deg: number): string {
  const [r, g, b] = hexToRgb(hex).map((x) => x / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  let h = 0, s = 0;
  if (d) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  h = (h + deg + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [rr, gg, bb] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return toHex((rr + m) * 255, (gg + m) * 255, (bb + m) * 255);
}

// --- resolved tokens -------------------------------------------------------------------------------

const FONT_VARS: Record<FontKey, string> = {
  inter: f("--f-inter"), poppins: f("--f-poppins"), playfair: f("--f-playfair", serif), dmsans: f("--f-dmsans"), spacegrotesk: f("--f-spacegrotesk"), lora: f("--f-lora", serif),
};
const RADII = { sharp: { card: 4, btn: 2 }, soft: { card: 16, btn: 12 }, round: { card: 28, btn: 999 } } as const;

export type Tokens = {
  style: StyleDef; dark: boolean; accent: string; accent2: string; onAccent: string;
  bg: string; surface: string; alt: string; text: string; mute: string; line: string;
};

/** The style's palette, or its light/dark counterpart when the seller switches mode. */
export function tokens(theme: FunnelTheme): Tokens {
  const st = STYLES[theme.style] ?? STYLES.clean;
  const dark = theme.mode === "dark";
  const base = dark === (st.mode === "dark")
    ? { bg: st.bg, surface: st.surface, alt: st.alt, text: st.text, mute: st.mute, line: st.line }
    : dark
      ? { bg: "#0b1220", surface: "#111827", alt: "#0f172a", text: "#f1f5f9", mute: "#cbd5e1", line: st.key === "editorial" || st.key === "playful" ? "#f1f5f9" : "#1f2937" }
      : { bg: "#ffffff", surface: "#f8fafc", alt: "#f1f5f9", text: "#0f172a", mute: "#475569", line: st.key === "editorial" || st.key === "playful" ? "#111827" : "#e2e8f0" };
  const accent = theme.accent;
  // Global tokens override the style's own fonts, corner shape and button treatment.
  const style: StyleDef = {
    ...st,
    heading: theme.headingFont ? FONT_VARS[theme.headingFont] : st.heading,
    body: theme.bodyFont ? FONT_VARS[theme.bodyFont] : st.body,
    radius: theme.radius ? RADII[theme.radius].card : st.radius,
    btnRadius: theme.radius ? RADII[theme.radius].btn : st.btnRadius,
    btn: theme.button ?? st.btn,
    card: theme.button === "neo" && st.card !== "neo" ? "neo" : st.card,
  };
  return { style, dark, accent, accent2: shiftHue(accent, 26), onAccent: onColor(accent), ...base };
}

/** Section palettes: what text/cards look like on each section background. */
export type Pal = { bgCss: string; text: string; mute: string; card: string; line: string; onDark: boolean; btnBg: string; btnText: string; accentText: string };
const cssUrl = (u: string) => `url("${u.replace(/\(/g, "%28").replace(/\)/g, "%29")}")`;
export function palette(t: Tokens, bg: Bg | undefined, defaultBg: Bg = "none", custom?: { color?: string; image?: string }): Pal {
  const kind = bg ?? defaultBg;
  const normalBtn = t.style.btn === "gradient" ? `linear-gradient(135deg, ${t.accent}, ${t.accent2})` : t.accent;
  const normalBtnText = t.style.btn === "gradient" ? onColor(mix(t.accent, t.accent2, 0.5)) : t.onAccent;
  if (kind === "tint") return { bgCss: t.alt, text: t.text, mute: t.mute, card: t.surface, line: t.line, onDark: false, btnBg: normalBtn, btnText: normalBtnText, accentText: t.accent };
  if (kind === "accent" || kind === "gradient") {
    const bgCss = kind === "gradient" ? `linear-gradient(135deg, ${t.accent}, ${t.accent2})` : t.accent;
    const on = kind === "gradient" ? onColor(mix(t.accent, t.accent2, 0.5)) : t.onAccent;
    return { bgCss, text: on, mute: on, card: rgba(on === "#ffffff" ? "#ffffff" : "#000000", 0.14), line: rgba(on === "#ffffff" ? "#ffffff" : "#000000", 0.28), onDark: on === "#ffffff", btnBg: on, btnText: on === "#ffffff" ? t.accent : "#ffffff", accentText: on };
  }
  if (kind === "custom" && custom?.color) {
    const on = onColor(custom.color);
    const light = on === "#ffffff";
    return { bgCss: custom.color, text: on, mute: light ? "rgba(255,255,255,.85)" : "rgba(15,23,42,.72)", card: light ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.6)", line: light ? "rgba(255,255,255,0.28)" : "rgba(15,23,42,0.14)", onDark: light, btnBg: normalBtn, btnText: normalBtnText, accentText: light ? "#ffffff" : t.accent };
  }
  if (kind === "image" && custom?.image) {
    return { bgCss: `linear-gradient(rgba(5,8,20,.62), rgba(5,8,20,.72)), ${cssUrl(custom.image)} center/cover no-repeat`, text: "#f8fafc", mute: "#e2e8f0", card: "rgba(255,255,255,0.1)", line: "rgba(255,255,255,0.22)", onDark: true, btnBg: normalBtn, btnText: normalBtnText, accentText: "#ffffff" };
  }
  if (kind === "dark") return { bgCss: "#0b1220", text: "#f8fafc", mute: "#cbd5e1", card: "rgba(255,255,255,0.07)", line: "rgba(255,255,255,0.16)", onDark: true, btnBg: normalBtn, btnText: normalBtnText, accentText: t.accent };
  return { bgCss: "transparent", text: t.text, mute: t.mute, card: t.surface, line: t.line, onDark: t.dark, btnBg: normalBtn, btnText: normalBtnText, accentText: t.accent };
}

export const SPACING: Record<string, string> = { compact: "py-8 @min-[640px]:py-10", normal: "py-12 @min-[640px]:py-16", roomy: "py-16 @min-[640px]:py-24" };
