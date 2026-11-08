# Offers page — Valentine Xavier

A self-contained offers page (no build step): five services, each with a Standard and a Premium package.

Views (hash links you can point buttons at):

| Link | Shows |
|---|---|
| `index.html#home` | Hero with "Start a project" + "See custom offers" buttons |
| `index.html#offers` | All five services |
| `index.html#automation` | Automation packages |
| `index.html#curriculum` | Curriculum & E-Learning packages |
| `index.html#websites` | Website Design packages |
| `index.html#marketing` | Marketing packages |
| `index.html#custom` | Custom Project packages |
| `index.html#start` | Start a project / contact |

## Edit offers
All names, prices, inclusions, bonuses and guarantees live in the `CATS` list near the top of the
`<script>` in `index.html` (look for "EDIT YOUR OFFERS HERE").
Prices, guarantees and monthly limits are suggestions — confirm them before going live.

## Deploy
- **Vercel:** New Project → import this repo → set *Root Directory* to `offers-site` → Framework preset "Other" → Deploy.
- **Netlify:** Add new site → import repo → *Base directory* `offers-site`, no build command, publish directory `offers-site`.
- Or upload `index.html` to any static host.

## Link it from your main website
Replace the "See selected work" link in your hero with:
`<a href="https://YOUR-OFFERS-URL/#offers">See custom offers →</a>`
