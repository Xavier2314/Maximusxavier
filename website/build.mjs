#!/usr/bin/env node
// MAXIMUS website build.
// Wraps every page in src/pages with the shared layout (SEO head, navigation,
// footer, scripts), inlines the official logo and icons, resolves photo slots
// and writes static HTML files into this folder. No dependencies: `node build.mjs`.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const readJSON = (p, fallback) => {
  try { return JSON.parse(read(p)); } catch { return fallback; }
};

const site = readJSON("content/site.json", {});
const logo = readJSON("src/logo.json");
const photos = readJSON("src/photos.json", []);
const BASE_URL = (site.url || "").replace(/\/$/, "");
const VERSION = Date.now().toString(36);

/* ---------------------------------------------------------------- logo ---- */
const FILL = { blue: "#305EE6", green: "#7ED321" };
function logoSvg(variant = "full", { mono = false, cls = "", label = "MAXIMUS" } = {}) {
  const vb = variant === "mark" ? logo.MARK_VIEWBOX : logo.FULL_VIEWBOX;
  let out = `<svg class="logo logo--${variant} ${cls}" viewBox="${vb}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">`;
  logo.MARK_PATHS.forEach((p, i) => {
    out += `<path class="logo__mark logo__mark--${i}" d="${p.d}" fill="${mono ? "currentColor" : FILL[p.fill]}"/>`;
  });
  if (variant !== "mark") logo.WORDMARK_PATHS.forEach((d) => (out += `<path class="logo__word" d="${d}" fill="currentColor"/>`));
  if (variant === "full") logo.TAGLINE_PATHS.forEach((d) => (out += `<path class="logo__tag" d="${d}" fill="currentColor"/>`));
  return out + "</svg>";
}

/* --------------------------------------------------------------- icons ---- */
const ICONS = {
  arrow: '<path d="M5 12h14"/><path d="m13 5 7 7-7 7"/>',
  "arrow-up-right": '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>',
  "arrow-down": '<path d="M12 5v14"/><path d="m5 13 7 7 7-7"/>',
  laptop: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/>',
  sprout: '<path d="M7 20h10"/><path d="M12 20v-9"/><path d="M12 11c0-3.5-2.5-6-7-6 0 4 2.5 6.5 7 6Z"/><path d="M12 13c0-3 2-5.5 6.5-5.5 0 3.5-2 5.5-6.5 5.5Z"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M18 14.8c1.8.7 3 2.5 3.5 5.2"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  flame: '<path d="M12 21c-4 0-7-2.7-7-6.6 0-3.6 2.6-5.6 4-8.4.6 2 1.8 3 3 3.4C12 6 13.6 4 15 3c.4 3.8 4 6 4 11.2C19 18.3 16 21 12 21Z"/>',
  shield: '<path d="M12 3 4 6v6c0 4.6 3.4 8 8 9 4.6-1 8-4.4 8-9V6l-8-3Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
  book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17Z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v4"/>',
  handshake: '<path d="m11 17 2 2a1.4 1.4 0 0 0 2-2"/><path d="m14 14 2.5 2.5a1.4 1.4 0 0 0 2-2l-3.9-3.9a2.8 2.8 0 0 0-4 0l-.9.9a1.4 1.4 0 1 1-2-2l2.8-2.8a5.3 5.3 0 0 1 6.6-.7l.5.3a2.4 2.4 0 0 0 1.7.3L21 6"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1.4 1.4 0 0 0 2-2"/><path d="M3 4h8"/>',
  trophy: '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3"/><path d="M7 5H4v2a3 3 0 0 0 3 3"/>',
  spark: '<path d="M12 3v4"/><path d="M12 17v4"/><path d="M3 12h4"/><path d="M17 12h4"/><path d="m5.6 5.6 2.8 2.8"/><path d="m15.6 15.6 2.8 2.8"/><path d="m5.6 18.4 2.8-2.8"/><path d="m15.6 8.4 2.8-2.8"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-7"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"/>',
  message: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12Z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
  phone: '<path d="M5 3h3.5l1.8 4.5-2.3 1.4a11 11 0 0 0 7.1 7.1l1.4-2.3L21 15.5V19a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2Z"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3Z"/>',
  heart: '<path d="M12 20s-7.5-4.6-9.2-9.4C1.6 7.1 4 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4 20 4 22.4 7.1 21.2 10.6 19.5 15.4 12 20 12 20Z"/>',
  ladder: '<path d="M7 2v20"/><path d="M17 2v20"/><path d="M7 6h10"/><path d="M7 11h10"/><path d="M7 16h10"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  send: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7Z"/>',
  gem: '<path d="M6 3h12l4 6-10 12L2 9l4-6Z"/><path d="M2 9h20"/><path d="m12 21-4-12 4-6 4 6-4 12"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/>',
  linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7"/><path d="M8 7v.01"/><path d="M12 17v-4a2 2 0 0 1 4 0v4"/><path d="M12 10v7"/>',
  x: '<path d="M4 4l16 16"/><path d="M20 4 4 20"/>',
  youtube: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3V9Z"/>',
  facebook: '<path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V10H6v3.5h3V21h3.5v-7.5H15.5l.5-3.5h-3.5V7a1 1 0 0 1 1-1H16V3Z"/>',
  tiktok: '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.4 2.8 2.3 4.6 5 5"/>',
  whatsapp: '<path d="M3.5 20.5 5 16a8.5 8.5 0 1 1 3.2 3.1L3.5 20.5Z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 .8a4.6 4.6 0 0 1-2.3-2.3l.8-1-1-2L9.5 8"/>',
};
const icon = (name, cls = "") =>
  `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.spark}</svg>`;

/* -------------------------------------------------------------- photos ---- */
const byCat = photos.reduce((m, p) => ((m[p.category] ||= []).push(p), m), {});
const unsplash = (url, w) => `${url}?auto=format&fit=crop&q=72&w=${w}`;
function photo(cat, idx = 0, spec = "", sizes, eager = false) {
  sizes = (sizes || "").replace(/^\|+/, "") || "(max-width: 768px) 100vw, 50vw";
  const parts = spec.replace(/^:+/, "").split(/\s+/).filter(Boolean);
  const attrs = parts.filter((p) => p.startsWith("data-")).map((p) => {
    const [k, v] = p.split("=");
    return v === undefined ? ` ${k}` : ` ${k}="${v}"`;
  }).join("");
  const inline = parts.includes("inline");
  const cls = parts.filter((p) => !p.startsWith("data-") && p !== "inline" && p !== "eager").join(" ");
  const tag = inline ? "span" : "figure";
  const list = byCat[cat] || [];
  const p = list.length ? list[idx % list.length] : null;
  const inner = p && p.local
    ? `<img src="${p.local}-1600.jpg" srcset="${p.local}-800.jpg 800w, ${p.local}-1600.jpg 1600w" sizes="${sizes}" alt="${(p.alt || "").replace(/"/g, "&quot;")}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" onerror="this.remove()">`
    : p
    ? `<img src="${unsplash(p.url, 1200)}" srcset="${[600, 900, 1200, 1600, 2200].map((w) => `${unsplash(p.url, w)} ${w}w`).join(", ")}" sizes="${sizes}" alt="${(p.alt || "").replace(/"/g, "&quot;")}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" onerror="this.remove()">`
    : "";
  const credit = p && p.photographer ? ` data-credit="Photo: ${p.photographer} / Unsplash"` : "";
  const fb = inline ? "span" : "div";
  return `<${tag} class="ph ${cls}"${attrs}${credit}><${fb} class="ph__fallback" aria-hidden="true">${logoSvg("mark", { mono: true, label: "" })}</${fb}>${inner}</${tag}>`;
}

/* ---------------------------------------------------------- navigation ---- */
const NAV = [
  { id: "home", href: "index.html", label: "Home" },
  { id: "what-is", href: "what-is-maximus.html", label: "What is MAXIMUS?" },
  { id: "about", href: "about.html", label: "About" },
  { id: "what-we-do", href: "what-we-do.html", label: "What We Do" },
  { id: "development", href: "development.html", label: "Development" },
  { id: "community", href: "community.html", label: "Community" },
  { id: "events", href: "events.html", label: "Events" },
  { id: "leadership", href: "leadership.html", label: "Leadership" },
  { id: "contact", href: "contact.html", label: "Contact" },
];

const SOCIAL_KEYS = ["instagram", "linkedin", "x", "facebook", "youtube", "tiktok", "whatsapp"];
const SOCIAL_LABEL = { instagram: "Instagram", linkedin: "LinkedIn", x: "X", facebook: "Facebook", youtube: "YouTube", tiktok: "TikTok", whatsapp: "WhatsApp" };
function socials(cls = "") {
  const s = site.social || {};
  const set = SOCIAL_KEYS.filter((k) => s[k]);
  if (!set.length) return `<p class="socials-pending ${cls}">Official MAXIMUS social channels will be listed here once published.</p>`;
  return `<ul class="socials ${cls}">${set
    .map((k) => `<li><a href="${s[k]}" target="_blank" rel="noopener" aria-label="MAXIMUS on ${SOCIAL_LABEL[k]}" data-magnetic>${icon(k)}</a></li>`)
    .join("")}</ul>`;
}

function header(active) {
  const links = NAV.filter((n) => !["home", "development", "contact"].includes(n.id));
  return `
<a class="skip" href="#main">Skip to content</a>
<header class="nav" data-nav>
  <div class="nav__inner">
    <a class="nav__brand" href="index.html" aria-label="MAXIMUS home" data-magnetic="0.2">${logoSvg("horizontal", { label: "MAXIMUS" })}</a>
    <nav class="nav__links" aria-label="Primary">
      ${links.slice(0, 6).map((n) => `<a href="${n.href}" class="nav__link${n.id === active ? " is-active" : ""}"${n.id === active ? ' aria-current="page"' : ""}><span data-text="${n.label}">${n.label}</span></a>`).join("")}
    </nav>
    <a class="btn btn--sm btn--lime nav__cta" href="contact.html" data-magnetic><span>Join MAXIMUS</span>${icon("arrow-up-right")}</a>
    <button class="nav__burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="menu" data-burger><span></span><span></span></button>
  </div>
</header>
<div class="menu" id="menu" aria-hidden="true" data-menu>
  <div class="menu__bg"></div>
  <div class="menu__inner">
    <nav class="menu__links" aria-label="Mobile">
      ${NAV.map((n, i) => `<a href="${n.href}" class="menu__link${n.id === active ? " is-active" : ""}"><em>0${i + 1}</em><span>${n.label}</span></a>`).join("")}
    </nav>
    <div class="menu__foot">
      <p class="menu__tag">Fulfilment in Maximized Potential.</p>
      <a class="btn btn--lime" href="contact.html"><span>Take your next step</span>${icon("arrow")}</a>
    </div>
  </div>
</div>`;
}

function footer() {
  return `
<footer class="footer">
  <div class="footer__glow" aria-hidden="true"></div>
  <div class="wrap">
    <div class="footer__top">
      <div class="footer__brand">
        <a href="index.html" aria-label="MAXIMUS home">${logoSvg("full", { label: "MAXIMUS — Fulfilment in Maximized Potential." })}</a>
        <p>An environment dedicated to personal growth, freelancing, entrepreneurship and the development of meaningful careers.</p>
        ${socials()}
      </div>
      <nav class="footer__nav" aria-label="Footer">
        <h2 class="footer__h">Explore</h2>
        ${NAV.filter((n) => n.id !== "leadership").map((n) => `<a href="${n.href}">${n.label}</a>`).join("")}
      </nav>
      <nav class="footer__nav" aria-label="More">
        <h2 class="footer__h">More</h2>
        <a href="leadership.html">Leadership &amp; Achievements</a>
        <a href="privacy.html">Privacy Policy</a>
        <a href="terms.html">Terms of Use</a>
      </nav>
      <form class="footer__news" data-form="newsletter" novalidate>
        <h2 class="footer__h">The MAXIMUS Letter</h2>
        <p>Ideas on growth, skills and independence — plus verified event announcements.</p>
        <div class="newsfield">
          <label class="sr-only" for="news-email">Email address</label>
          <input id="news-email" name="email" type="email" placeholder="you@email.com" autocomplete="email" required>
          <button class="btn btn--lime btn--icon" type="submit" aria-label="Subscribe">${icon("arrow")}</button>
        </div>
        <p class="form-status" role="status" aria-live="polite"></p>
      </form>
    </div>
    <div class="footer__giant" aria-hidden="true">${logoSvg("horizontal", { mono: true, label: "" })}</div>
    <div class="footer__bottom">
      <p>© <span data-year>${new Date().getFullYear()}</span> MAXIMUS. Fulfilment in Maximized Potential.</p>
      <p><a href="privacy.html">Privacy</a> · <a href="terms.html">Terms</a> · <button class="totop" type="button" data-totop>Back to top ${icon("arrow-up-right")}</button></p>
    </div>
  </div>
</footer>`;
}

function head(meta) {
  const title = meta.id === "home" ? "MAXIMUS — Fulfilment in Maximized Potential." : `${meta.title} — MAXIMUS`;
  const url = BASE_URL ? `${BASE_URL}/${meta.file === "index.html" ? "" : meta.file}` : "";
  const ogImg = BASE_URL ? `${BASE_URL}/assets/img/og.jpg` : "assets/img/og.jpg";
  const ld = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "MAXIMUS",
    slogan: "Fulfilment in Maximized Potential.",
    description: "A personal growth, freelancing, entrepreneurship and career-development community empowering young, driven individuals to maximise their potential.",
    logo: BASE_URL ? `${BASE_URL}/assets/brand/icon-512.png` : undefined,
    url: BASE_URL || undefined,
    sameAs: Object.values(site.social || {}).filter(Boolean),
  };
  return `<!doctype html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
<meta name="description" content="${meta.description}">
<meta name="theme-color" content="#0F172A">
<meta name="color-scheme" content="light">
${url ? `<link rel="canonical" href="${url}">` : ""}
<meta property="og:type" content="website">
<meta property="og:site_name" content="MAXIMUS">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${meta.description}">
<meta property="og:image" content="${ogImg}">
${url ? `<meta property="og:url" content="${url}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/brand/logo-mark.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="assets/brand/apple-touch-icon.png">
<link rel="manifest" href="site.webmanifest">
<link rel="preload" href="assets/fonts/sora.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preconnect" href="https://images.unsplash.com">
<link rel="stylesheet" href="assets/css/main.css?v=${VERSION}">
<script>document.documentElement.classList.replace("no-js","js");</script>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>`;
}

function chrome() {
  return `
<div class="preloader" data-preloader aria-hidden="true">
  <div class="preloader__panel preloader__panel--a"></div>
  <div class="preloader__panel preloader__panel--b"></div>
  <div class="preloader__core">
    ${logoSvg("mark", { cls: "preloader__mark", label: "" })}
    <div class="preloader__count"><span data-count>0</span>%</div>
    <p class="preloader__tag">Fulfilment in Maximized Potential.</p>
  </div>
</div>
<div class="pt" data-pt aria-hidden="true"><div class="pt__a"></div><div class="pt__b"></div><div class="pt__logo">${logoSvg("mark", { label: "" })}</div></div>
<div class="cursor" aria-hidden="true"><div class="cursor__dot"></div><div class="cursor__ring"><span class="cursor__label"></span></div></div>
<div class="grain" aria-hidden="true"></div>
<div class="progress" aria-hidden="true"><span data-progress></span></div>
<div class="modal" data-modal aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="reg-title">
  <div class="modal__bg" data-modal-close></div>
  <div class="modal__box">
    <button class="modal__close" type="button" aria-label="Close registration" data-modal-close>${icon("x")}</button>
    <p class="eyebrow">Event registration</p>
    <h2 class="h3" id="reg-title" data-modal-title>Register</h2>
    <p class="muted" data-modal-meta></p>
    <form class="form" data-form="register" novalidate>
      <input type="hidden" name="event" value="">
      <div class="field full"><input id="r-name" name="name" type="text" placeholder=" " autocomplete="name" required><label for="r-name">Full name *</label><p class="field__err">Please enter your name.</p></div>
      <div class="field"><input id="r-email" name="email" type="email" placeholder=" " autocomplete="email" required><label for="r-email">Email *</label><p class="field__err">Please enter a valid email.</p></div>
      <div class="field"><input id="r-phone" name="phone" type="tel" placeholder=" " autocomplete="tel"><label for="r-phone">Phone</label><p class="field__err">Please enter a valid phone number.</p></div>
      <div class="sr-only" aria-hidden="true"><input name="_gotcha" tabindex="-1" autocomplete="off" aria-label="Leave empty"></div>
      <div class="full" style="display:flex;flex-wrap:wrap;gap:16px;align-items:center"><button class="btn" type="submit"><span>Confirm registration</span>${icon("arrow")}</button><p class="form-status" role="status" aria-live="polite"></p></div>
    </form>
  </div>
</div>`;
}

const SCRIPTS = `
<script src="assets/vendor/gsap.min.js" defer></script>
<script src="assets/vendor/ScrollTrigger.min.js" defer></script>
<script src="assets/vendor/SplitText.min.js" defer></script>
<script src="assets/vendor/CustomEase.min.js" defer></script>
<script src="assets/vendor/lenis.min.js" defer></script>
<script src="assets/js/content.js?v=${VERSION}" defer></script>
<script src="assets/js/main.js?v=${VERSION}" defer></script>`;

/* ---------------------------------------------------------- templating ---- */
function render(src) {
  return src
    .replace(/\{\{logo:(\w+)(?::(mono))?\}\}/g, (_, v, m) => logoSvg(v, { mono: !!m }))
    .replace(/\{\{icon:([\w-]+)(?::([\w -]+))?\}\}/g, (_, n, c) => icon(n, c || ""))
    .replace(/\{\{ph:([\w-]+)(?::(\d+))?(?::([^}|]*))?(?:\|([^}]*))?\}\}/g, (_, cat, i, spec, sizes) =>
      photo(cat, Number(i || 0), spec || "", sizes, /\beager\b/.test(spec || "")))
    .replace(/\{\{socials\}\}/g, () => socials("socials--lg"));
}

const pagesDir = path.join(ROOT, "src/pages");
const sitemap = [];
for (const file of fs.readdirSync(pagesDir).filter((f) => f.endsWith(".html"))) {
  const raw = fs.readFileSync(path.join(pagesDir, file), "utf8");
  const m = raw.match(/^<!--(\{[\s\S]*?\})-->\s*/);
  if (!m) throw new Error(`${file}: missing meta header`);
  const meta = { ...JSON.parse(m[1]), file };
  const body = render(raw.slice(m[0].length));
  const html = `${head(meta)}
<body data-page="${meta.id}" class="theme-${meta.theme || "light"}">
${chrome()}
${header(meta.id)}
<main id="main" class="main" data-lenis-content>
${body}
</main>
${footer()}
${SCRIPTS}
</body>
</html>
`;
  fs.writeFileSync(path.join(ROOT, file), html);
  if (!meta.noindex) sitemap.push(file === "index.html" ? "" : file);
  console.log("built", file);
}

if (BASE_URL) {
  fs.writeFileSync(
    path.join(ROOT, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap
      .map((p) => `  <url><loc>${BASE_URL}/${p}</loc></url>`)
      .join("\n")}\n</urlset>\n`
  );
}
fs.writeFileSync(
  path.join(ROOT, "robots.txt"),
  `User-agent: *\nAllow: /\nDisallow: /admin/\n${BASE_URL ? `Sitemap: ${BASE_URL}/sitemap.xml\n` : ""}`
);
