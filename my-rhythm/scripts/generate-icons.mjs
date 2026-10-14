// Generates PWA icons from an inline SVG (run: npm run icons)
// Logo: blue tile, orange rising sun, white "rhythm" pulse line.
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const mark = (pad = 0, rounded = true) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2563eb"/><stop offset="1" stop-color="#0b1f5c"/>
    </linearGradient>
    <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fdba74"/><stop offset="1" stop-color="#f97316"/>
    </linearGradient>
    <clipPath id="horizon"><rect x="0" y="0" width="512" height="300"/></clipPath>
  </defs>
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="url(#bg)"/>
  <g transform="translate(${pad} ${pad}) scale(${(512 - 2 * pad) / 512})">
    <circle cx="256" cy="300" r="128" fill="url(#sun)" clip-path="url(#horizon)"/>
    <path d="M70 300 H188 L214 246 L246 362 L280 196 L312 330 L330 300 H442"
      stroke="#ffffff" stroke-width="30" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="120" y="372" width="272" height="22" rx="11" fill="#f97316" opacity="0.9"/>
  </g>
</svg>`;

const badge = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
  <path d="M8 40 H26 L30 32 L35 50 L40 22 L45 44 L48 40 H64" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

mkdirSync("public/icons", { recursive: true });
const out = [
  ["public/icons/icon-192.png", mark(), 192],
  ["public/icons/icon-512.png", mark(), 512],
  ["public/icons/maskable-512.png", mark(64, false), 512],
  ["public/apple-touch-icon.png", mark(40, false), 180],
  ["public/icons/badge-72.png", badge, 72],
];
for (const [file, svg, size] of out) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(file);
}
writeFileSync("public/icons/icon.svg", mark());
await sharp(Buffer.from(mark())).resize(32, 32).png().toFile("public/favicon.png");
console.log("icons written");
