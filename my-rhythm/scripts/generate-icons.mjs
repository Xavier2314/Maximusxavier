// Generates PWA icons from an inline SVG (run: npm run icons)
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const mark = (pad = 0) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1b2a4d"/><stop offset="1" stop-color="#0b1222"/>
    </linearGradient>
    <linearGradient id="sun" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#c9c1f5"/><stop offset="1" stop-color="#8b7fd6"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${pad ? 0 : 112}" fill="url(#bg)"/>
  <g transform="translate(${pad} ${pad}) scale(${(512 - 2 * pad) / 512})">
    <circle cx="256" cy="232" r="92" fill="url(#sun)"/>
    <path d="M86 300 C 146 252, 206 252, 256 300 S 366 348, 426 300" stroke="#8fbf9c" stroke-width="30" fill="none" stroke-linecap="round"/>
    <path d="M86 360 C 146 312, 206 312, 256 360 S 366 408, 426 360" stroke="#fbf8f3" stroke-opacity="0.92" stroke-width="22" fill="none" stroke-linecap="round"/>
  </g>
</svg>`;

const badge = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
  <circle cx="36" cy="30" r="13" fill="#fff"/>
  <path d="M10 44 C 20 36, 28 36, 36 44 S 52 52, 62 44" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/>
</svg>`;

mkdirSync("public/icons", { recursive: true });
const out = [
  ["public/icons/icon-192.png", mark(), 192],
  ["public/icons/icon-512.png", mark(), 512],
  ["public/icons/maskable-512.png", mark(64), 512],
  ["public/apple-touch-icon.png", mark(40), 180],
  ["public/icons/badge-72.png", badge, 72],
];
for (const [file, svg, size] of out) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(file);
}
writeFileSync("public/icons/icon.svg", mark());
await sharp(Buffer.from(mark())).resize(32, 32).png().toFile("public/favicon.png");
console.log("icons written");
