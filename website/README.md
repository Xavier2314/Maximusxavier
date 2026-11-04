# MAXIMUS — Official Brand & Community Website

**Fulfilment in Maximized Potential.**

A fast, static, multi-page website (no framework, no build dependencies) with a premium motion layer
(GSAP + ScrollTrigger + SplitText + Lenis, all self-hosted) and a Git-based CMS.

## Pages
`index` · `about` · `what-we-do` · `development` · `community` · `events` · `leadership` · `contact` · `privacy` · `terms` · `404`

## Develop
```bash
cd website
node build.mjs            # builds src/pages/*.html -> *.html
python3 -m http.server    # open http://localhost:8000
```
Edit page content in `src/pages/`, then rebuild. The shared head (SEO, Open Graph, JSON-LD),
navigation, footer, official logo and icons are injected by `build.mjs`.

- Styles: `assets/css/main.css` (brand tokens at the top)
- Motion & interaction: `assets/js/main.js`
- CMS rendering: `assets/js/content.js`
- Official logo vectors: `src/logo.json` (taken from the brand manual, unaltered)
- Photography: `src/photos.json` — free Unsplash License photos, hot-linked with credit

## Content management
All editable content lives in `content/*.json` and is managed at **`/admin/`** (Decap CMS, GitHub login).

| File | What it controls |
|---|---|
| `events.json` | Events (title, type, description, date, time, venue, registration). Only `published` + `verified` events with a future date are shown; past events disappear automatically. |
| `announcements.json` | Announcement banners (auto-expire). |
| `leadership.json` | Leadership profiles (published with consent). |
| `achievements.json` | Milestones, recognitions, growth stories (shown only when `verified`). |
| `programmes.json` | Learning resources, training sessions, programmes. |
| `site.json` | Site URL, official contact details, social links, form endpoints. |

Nothing is invented: empty collections show branded "coming soon" states with a newsletter sign-up.

### Before launch
1. In `content/site.json` set `url`, official contact details and social links (social links and the
   sitemap are written at build time — Vercel runs `node build.mjs` automatically via `vercel.json`).
2. Add form endpoints (e.g. Formspree) for contact, newsletter and event registration. Until then the
   forms validate but tell visitors submissions are being connected.
3. In `admin/config.yml` set `branch` to your deploy branch and, if not on Netlify, an OAuth `base_url`.
4. Have `privacy.html` / `terms.html` reviewed for your jurisdiction.

## Deploy
Static hosting with `website/` as the root (Vercel: set Root Directory to `website`).

## Accessibility & performance
Semantic landmarks, skip link, focus styles, ARIA on menu/modal/forms, focus trap in the modal,
`prefers-reduced-motion` support (all motion off, content fully visible), responsive `srcset` images,
lazy loading, self-hosted variable fonts with `font-display: swap`.
