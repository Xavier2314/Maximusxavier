// Runs after build.mjs (see vercel.json). Adds the Offers page to the portfolio:
//  1. hero link "See selected work" -> "See custom offers" (/offers/)
//  2. "Offers" added to the main nav and the mobile menu on every page
//  3. dist/offers/index.html built from the site's own layout + the offers section
//  4. Cream / Ink Black / Burnt Orange theme: /assets/theme.css + Instrument Serif on every page
// Never fails the build: on any error it logs and leaves the site as built.
import fs from "node:fs";
import path from "node:path";
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), "dist");
const REPO = process.env.OFFERS_REPO_BASE ||
  "https://raw.githubusercontent.com/Xavier2314/Maximusxavier/d0a020bb7ecac165e0d8145921acb81028cc671b/offers-site/";
const get = async (name) => REPO.startsWith("file:")
  ? fs.readFileSync(new URL(name, REPO), "utf8")
  : await (await fetch(REPO + name)).text();
const HEAD_ADD = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap"><link rel="stylesheet" href="/assets/theme.css?v=d0a020b">';
const NAV_ITEM = '<li><a href="/offers/">Offers</a></li>';
const AFTER = '<li><a href="/services/">Services</a></li>';
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".html") ? [path.join(d, e.name)] : []);

function patchHtml(s) {
  let i;
  while ((i = s.indexOf("See selected work")) !== -1) {
    const a = s.lastIndexOf("<a ", i), gt = a === -1 ? -1 : s.indexOf(">", a);
    if (a !== -1 && gt < i && s.lastIndexOf("</a>", i) < a) {
      const tag = s.slice(a, gt + 1).replace(/href="[^"]*"/, 'href="/offers/"');
      s = s.slice(0, a) + tag + s.slice(gt + 1);
    }
    s = s.replace("See selected work", "See custom offers");
  }
  if (!s.includes('href="/offers/">Offers<')) s = s.split(AFTER).join(AFTER + NAV_ITEM);
  if (THEME && !s.includes("/assets/theme.css")) {
    s = s.replace(/(<link rel="stylesheet" href="\/styles\.css[^"]*">)/, "$1" + HEAD_ADD);
    s = s.replace('<meta name="theme-color" content="#060E22">', '<meta name="theme-color" content="#F3EEE3">');
  }
  return s;
}

let THEME = false;
async function main() {
  try {
    const css = await get("theme.css");
    if (!css.includes("Burnt Orange")) throw new Error("theme.css not found");
    fs.mkdirSync(path.join(OUT, "assets"), { recursive: true });
    fs.writeFileSync(path.join(OUT, "assets", "theme.css"), css);
    THEME = true;
    console.log("[offers-patch] theme.css added");
  } catch (e) { console.warn("[offers-patch] theme skipped:", e.message); }
  let pages = 0;
  for (const f of walk(OUT)) {
    const s = fs.readFileSync(f, "utf8"), t = patchHtml(s);
    if (t !== s) { fs.writeFileSync(f, t); pages++; }
  }
  console.log(`[offers-patch] updated ${pages} page(s)`);

  const tpl = fs.readFileSync(path.join(OUT, "index.html"), "utf8");
  const section = await get("section.html");
  if (!section.includes('id="vxo-app"')) throw new Error("offers section not found");
  const m0 = tpl.indexOf('<main id="main">'), m1 = tpl.indexOf("</main>");
  if (m0 === -1 || m1 === -1) throw new Error("no <main> in homepage template");
  const title = "Offers | Valentine Xavier";
  const desc = "Automation, curriculum & e-learning, website design, marketing and custom builds. Standard and Premium packages with fixed prices, timelines and guarantees.";
  let page = tpl.slice(0, m0) + '<main id="main">\n' + section + "</main>" + tpl.slice(m1 + 7);
  page = page
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, `$1${desc}`)
    .replace(/(<meta property="og:title" content=")[^"]*/, `$1${title}`)
    .replace(/(<meta name="twitter:title" content=")[^"]*/, `$1${title}`)
    .replace(/(<meta property="og:description" content=")[^"]*/, `$1${desc}`)
    .replace(/(<meta name="twitter:description" content=")[^"]*/, `$1${desc}`)
    .replace(/(<link rel="canonical" href="[^"]*?)\/?"/, '$1/offers/"')
    .replace(/(<meta property="og:url" content="[^"]*?)\/?"/, '$1/offers/"')
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "")
    .replace(/<link rel="preload" as="image"[^>]*>/g, "");
  fs.mkdirSync(path.join(OUT, "offers"), { recursive: true });
  fs.writeFileSync(path.join(OUT, "offers", "index.html"), page);
  console.log("[offers-patch] built /offers/ inside the site layout");
}
main().catch((e) => console.warn("[offers-patch] skipped:", e.message));
