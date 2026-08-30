# PatientLoop AI — landing page

A single self-contained landing page: `index.html`. No build step, no dependencies to
install. Open the file in a browser, or drop it on any static host (Netlify, Vercel,
Cloudflare Pages, S3, GitHub Pages).

The only external request is the Google Fonts stylesheet — everything else (CSS,
JS, logo, icons, charts) is inline.

## Sections

Hero with a live SMS demo · integration marquee · the revenue-leak problem ·
five leaks fixed · five-step flow · demo video · before/after · database
reactivation · recovery calculator · who it's for · integrations · what we install ·
reporting dashboard · trust & consent · the audit offer · FAQ · final CTA · footer.

## Things to change before it goes live

| What | Where |
|---|---|
| Booking link — every CTA currently points at `#audit` or `mailto:hello@patientloop.ai` | search for `mailto:hello@patientloop.ai` and `href="#audit"` |
| Demo video — the dark box in the Demo section is a placeholder | replace `<div class="videobox">…</div>` with your embed iframe |
| Contact email, LinkedIn, Privacy / Terms links | `<footer>` |
| Hero conversation scripts (4 scenarios) | the `SCENARIOS` array in the script block |
| Integration names | `TOOLS_A` / `TOOLS_B` arrays |

## Numbers on the page

Every figure shown is illustrative and labelled as such — the reactivation funnel
("Example campaign"), the dashboard ("Demo data"), the dot diagram
("Illustrative"), and the calculator ("a planning model"). Swap them for real
figures only once you have client results you can stand behind, and drop the
labels at the same time.

## Colours and type

Palette and typography are CSS custom properties at the top of the file — edit
`:root` (plus the two dark-theme blocks below it) to rebrand. The page follows the
viewer's light/dark preference.
