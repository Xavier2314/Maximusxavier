/** Branding: the platform look (white-label) and each office's own look. Safe to import on client and server. */

export type Brand = {
  name: string;
  tagline: string | null;
  logo: string | null;
  primary: string;
  accent: string;
  sidebar: string;
  /** Hide the platform name for this brand's members. */
  whiteLabel: boolean;
  /** True for the built-in Maximus look (uses the official logo). */
  isDefault: boolean;
};

export const DEFAULT_BRAND: Brand = {
  name: "Maximus", tagline: null, logo: null,
  primary: "#305ee6", accent: "#b5f44a", sidebar: "#0f172a",
  whiteLabel: false, isDefault: true,
};

export type OfficeBrandRow = {
  id: string; name: string; display_name: string | null; tagline: string | null; logo_url: string | null;
  primary_color: string | null; accent_color: string | null; sidebar_color: string | null; white_label: boolean;
};
export const OFFICE_BRAND_COLUMNS = "id, name, display_name, tagline, logo_url, primary_color, accent_color, sidebar_color, white_label";

export type PlatformBrandSetting = { app_name?: string; tagline?: string; logo_url?: string; primary?: string; accent?: string; sidebar?: string };

const HEX = /^#[0-9a-fA-F]{6}$/;
const hexOr = (v: string | null | undefined, fallback: string) => (v && HEX.test(v) ? v.toLowerCase() : fallback);

export function platformBrand(setting: PlatformBrandSetting | null | undefined): Brand {
  if (!setting || Object.keys(setting).length === 0) return DEFAULT_BRAND;
  return {
    name: setting.app_name?.trim() || DEFAULT_BRAND.name,
    tagline: setting.tagline?.trim() || null,
    logo: setting.logo_url || null,
    primary: hexOr(setting.primary, DEFAULT_BRAND.primary),
    accent: hexOr(setting.accent, DEFAULT_BRAND.accent),
    sidebar: hexOr(setting.sidebar, DEFAULT_BRAND.sidebar),
    whiteLabel: false,
    isDefault: !setting.app_name && !setting.logo_url,
  };
}

/** An office's brand, or null when the office hasn't customised anything. */
export function officeBrand(o: OfficeBrandRow | null | undefined, platform: Brand): Brand | null {
  if (!o) return null;
  const custom = o.display_name || o.logo_url || o.primary_color || o.accent_color || o.sidebar_color || o.white_label;
  if (!custom) return null;
  return {
    name: o.display_name || o.name,
    tagline: o.tagline,
    logo: o.logo_url,
    primary: hexOr(o.primary_color, platform.primary),
    accent: hexOr(o.accent_color, platform.accent),
    sidebar: hexOr(o.sidebar_color, platform.sidebar),
    whiteLabel: o.white_label,
    isDefault: false,
  };
}

/** CSS variables consumed by the `.branded` rule in globals.css. */
export function brandVars(b: Brand): Record<string, string> {
  return { "--brand-primary": b.primary, "--brand-accent": b.accent, "--brand-sidebar": b.sidebar };
}

// --- Contrast (WCAG) so a brand can never make text unreadable ---------------
function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/** Problems with a colour choice, in plain words. Empty when the colours are readable. */
export function brandProblems(primary: string, accent: string, sidebar: string): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!HEX.test(primary)) errors.primary = "Choose a colour";
  else if (contrast(primary, "#ffffff") < 3) errors.primary = "Too light: white button text won't be readable. Pick a darker shade.";
  if (!HEX.test(sidebar)) errors.sidebar = "Choose a colour";
  else if (contrast(sidebar, "#ffffff") < 7) errors.sidebar = "The menu background must be dark so its white text is readable.";
  if (!HEX.test(accent)) errors.accent = "Choose a colour";
  else if (HEX.test(sidebar) && contrast(accent, sidebar) < 3) errors.accent = "Not visible enough on the menu background. Pick a brighter shade.";
  return errors;
}
