# Funnel builder

A self-serve visual funnel and landing-page builder inside the app. Members pick a product, let the AI design a funnel (or start from a template), then edit it by dragging, clicking and typing on the page itself. Public pages carry the seller's own name only; no platform branding is hard-coded.

## Where things are

| Area | Location |
| --- | --- |
| Builder UI (toolbar, canvas, panels) | `src/app/builder/[id]/` (`builder.tsx`, `inspector.tsx`, `quick-add.tsx`, `layers-panel.tsx`, `design-panel.tsx`) |
| Document model, sanitising, constructors | `src/lib/funnels.ts` |
| Pure editing commands + AI change summary | `src/lib/funnel-doc.ts` |
| Styles, responsive CSS, fonts | `funnel-styles.ts`, `funnel-css.ts`, `funnel-fonts.ts` |
| Renderer (builder + public) | `src/components/funnels/funnel-view.tsx` |
| Public pages, lead/order capture | `src/app/f/` |
| Save / publish / history / library actions | `src/app/(app)/marketing/funnels/actions.ts`, `library-actions.ts` |
| AI | `src/lib/funnel-ai.ts` (uses `ANTHROPIC_API_KEY`; model override `FUNNEL_AI_MODEL`) |
| Database | `supabase/migrations/…049` to `…051`, tests in `supabase/tests/01_security_tests.sql` |

## Setup

1. Apply the migrations (`supabase/migrations`). They are additive.
2. Environment (see `.env.example`): Supabase URL and keys, `SUPABASE_SERVICE_ROLE_KEY` (public pages and form submissions are read/written server-side), `ANTHROPIC_API_KEY` for the AI features.
3. `npm install`, then `npm run dev`.

## Tests

- `npm test` runs the unit tests for the document model (tree commands, per-device overrides, sanitising hostile input, id uniqueness, SEO, form fields, AI change summary).
- `bash supabase/tests/run.sh` applies every migration to a throwaway PostgreSQL and runs the row-level-security suite (needs a local Postgres; run as a role that can create databases).

## How it works

- **Structure:** Page → Section → Row → Column → Element (plus ready-made section types). Every node has a stable id. Ids are made unique on save.
- **Responsive:** the canvas and public page use container queries, so Tablet and Phone views in the builder reflow exactly as a real device would. Each node can override visibility, spacing and scale per device; tablet inherits desktop and phone inherits tablet. Each override has a reset.
- **Safety:** every block, element, URL and colour is run through allow-list cleaners on save and on read. Only `http(s)`, `tel:` and `mailto:` links are accepted. Nothing from a funnel is rendered as raw HTML.
- **Autosave:** edits save after a short pause. Each save carries the version it was based on; if the funnel changed elsewhere, autosave pauses and offers Load latest / Keep mine / Save mine as a copy. Unsaved edits are also kept in the browser and offered for recovery.
- **Publishing:** the live page is a separate snapshot. Autosave never changes it. Publish copies the draft to live and records a version; Unpublish takes it offline; any saved version can be restored to the draft or made live again (rollback). The newest 50 versions are kept and cannot be edited.
- **Forms:** lead and order forms; the lead form and the form element support extra questions (text, email, phone, long text, dropdown, tick box), required flags and a consent tick box. Answers are stored with the lead and validated on the server against the *published* form, not what the browser sends. Honeypot field and a flood limit are on.
- **Library:** save any section as a reusable template (private to the member, up to 60); pick earlier uploads from a media picker; export or import a funnel as JSON (validated and cleaned on import).
- **AI:** whole-funnel design from product details, and edits by instruction (whole funnel or the selected section). Edits come back as a proposal with a plain-language summary; nothing changes until the member presses Apply, and Undo still works afterwards. The prompts forbid invented reviews, numbers, income or medical claims, and brand names the seller did not give.
- **Merge fields:** `{{business.name}}`, `{{business.phone}}`, `{{business.email}}`, `{{business.address}}`, `{{right_now.year}}`.

## Implemented

Nested layout editor with drag and drop, click-to-select breadcrumbs, layers panel (hide per device, lock), undo/redo, keyboard shortcuts, quick-add (sections, rows 1–6 columns, elements, prebuilt, saved), design panel (8 styles, brand colour, fonts, corner radius, button style, light/dark), entrance animations (respect reduced-motion), multiple product photos with a gallery, up to 6 pages per funnel, per-page SEO (title, description, share image, hide from search, canonical), leads and orders inbox, publish/versions/rollback, conflict handling, local recovery, saved sections, media picker, JSON import/export, AI design and AI edit with review.

## Not implemented (deferred, on purpose)

- **Custom domains:** the builder says honestly that none are connected. It needs DNS verification and host-based routing plus an administrator adding the domain to the hosting project. Funnels work at their `/f/<link>` address.
- **Real HTML/CSS export** (JSON export is provided).
- **Global header/footer shared across pages.**
- **Multi-select** and bulk editing.
- **Custom CSS / custom JavaScript** boxes and **popups**.
- **Desktop-only hiding** (hiding is per tablet and phone) and a **favicon** setting.
- **Online payment:** orders are captured as orders; collecting payment is not wired in.
- **Media library** lists uploads from the member's funnel folder only, with no folders, renaming or deleting.

## Honest limits

- The unit tests cover the document model and the database suite covers access rules. The browser behaviour (selection, drag and drop, responsive widths, publish/history dialogs) was checked by hand with a headless browser against a development harness; there is no automated end-to-end suite yet.
- AI generation, a real order submission, and dragging existing elements between columns have not been exercised end-to-end in a logged-in session during development. Please try them once after deploying.
