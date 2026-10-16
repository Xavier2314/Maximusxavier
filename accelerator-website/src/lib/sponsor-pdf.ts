/**
 * Builds a personalised sponsorship proposal PDF in the browser from the sponsor's form answers.
 * Uses jsPDF with the built-in Helvetica/Times fonts (no font downloads), brand colours and the logo.
 */
import { sponsorship } from "./site";

export type SponsorAnswers = {
  brand: string;
  contactName: string;
  role: string;
  phone: string;
  email: string;
  business: string;
  option: "Headline Partner" | "Showcase Partner" | "Gift Partner" | "Not sure yet";
  items: string[];
  otherItems: string;
  quantity: string;
  speak: "Yes" | "No" | "Maybe";
  message: string;
};

type RGB = [number, number, number];
const NAVY: RGB = [11, 30, 63], NAVY9: RGB = [7, 21, 48], RED: RGB = [225, 30, 45], ROYAL: RGB = [30, 75, 255];
const CREAM: RGB = [244, 241, 234], INK: RGB = [42, 50, 71], SKY: RGB = [157, 178, 255], GOLD: RGB = [196, 160, 98], WHITE: RGB = [255, 255, 255];

const OPTIONS: { name: SponsorAnswers["option"]; color: RGB; items: string[] }[] = [
  { name: "Headline Partner", color: GOLD, items: ["Speaking slot on the main stage", "Premium showcase space", "Live Q&A with guests", "Logo on the main flyer and slides", "Stage recognition and mentions", "Branded gifts to all guests"] },
  { name: "Showcase Partner", color: RED, items: ["Short brand presentation", "Showcase space", "Q&A at your stand", "Logo on event slides", "Community mentions", "Branded gifts for guests"] },
  { name: "Gift Partner", color: ROYAL, items: ["Your branded items in guests' hands", "Stage thank-you", "Community mentions"] },
];

async function loadImage(src: string): Promise<string | null> {
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    return await new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result as string); r.onerror = () => resolve(null); r.readAsDataURL(blob); });
  } catch { return null; }
}

export function proposalFileName(brand: string) {
  return `Sponsorship_Proposal_${brand.trim().replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "") || "Partner"}.pdf`;
}

export async function buildSponsorPdf(a: SponsorAnswers): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, H = 297, M = 20;
  const [logoRev, logoCol] = await Promise.all([loadImage("/brand/logo-horizontal-reversed.png"), loadImage("/brand/logo-horizontal-colour.png")]);

  const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const color = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const font = (family: "helvetica" | "times", style: "normal" | "bold" | "italic" | "bolditalic", size: number) => { doc.setFont(family, style); doc.setFontSize(size); };
  const eyebrow = (t: string, x: number, y: number, c: RGB = RED) => { font("helvetica", "bold", 8.5); color(c); doc.text(t.toUpperCase(), x, y, { charSpace: 1.2 }); };
  const para = (t: string, x: number, y: number, w: number, size = 10.5, c: RGB = INK, lh = 5.4) => { font("helvetica", "normal", size); color(c); const lines = doc.splitTextToSize(t, w); doc.text(lines, x, y); return y + lines.length * lh; };
  const rule = (x: number, y: number) => { fill(RED); doc.rect(x, y, 18, 1.2, "F"); };
  const footer = (n: number, dark = false) => { font("helvetica", "normal", 7.5); color(dark ? [154, 166, 196] : [94, 102, 120]); doc.text(`Accelerators Events 2026 · Sponsorship proposal for ${a.brand}`, M, H - 10); doc.text(String(n), W - M, H - 10, { align: "right" }); };
  const diamond = (x: number, y: number, s: number, c: RGB) => { fill(c); doc.triangle(x, y - s, x + s, y, x, y + s, "F"); doc.triangle(x, y - s, x - s, y, x, y + s, "F"); };
  const facets = () => { diamond(W - 6, 60, 14, RED); diamond(W - 20, 82, 10, ROYAL); diamond(W - 4, 104, 9, ROYAL); diamond(W - 20, 82, 3.5, CREAM); };

  // ---- Page 1: cover --------------------------------------------------------------------------
  fill(NAVY); doc.rect(0, 0, W, H, "F");
  fill(NAVY9); doc.rect(0, H * 0.62, W, H * 0.38, "F");
  facets();
  if (logoRev) doc.addImage(logoRev, "PNG", M, 20, 50, 17.2);
  eyebrow("Sponsorship & partnership proposal", M, 82, SKY);
  font("times", "bold", 46); color(WHITE); doc.text("The Summit", M, 102);
  font("times", "bolditalic", 46); color(RED); doc.text("of Excellence", M, 119);
  font("helvetica", "bold", 11); color(WHITE); doc.text("ACCELERATORS EVENTS 2026", M, 131, { charSpace: 1.4 });
  rule(M, 137);
  eyebrow("Prepared for", M, 156, SKY);
  font("times", "bold", 30); color(WHITE); doc.text(doc.splitTextToSize(a.brand, W - 2 * M), M, 170);
  font("helvetica", "normal", 11); color([214, 221, 240]); doc.text(`Attention: ${a.contactName}${a.role ? `, ${a.role}` : ""}`, M, 186);
  const boxY = 238;
  fill(RED); doc.rect(M, boxY, 62, 26, "F");
  font("helvetica", "bold", 7.5); color(WHITE); doc.text("DATE", M + 5, boxY + 8, { charSpace: 1 });
  font("times", "bold", 13); doc.text("Saturday 5 December", M + 5, boxY + 15); doc.text("2026", M + 5, boxY + 21);
  doc.setDrawColor(157, 178, 255); doc.setLineWidth(0.3);
  doc.rect(M + 66, boxY, 40, 26); doc.rect(M + 110, boxY, 60, 26);
  font("helvetica", "bold", 7.5); color(SKY); doc.text("VENUE", M + 71, boxY + 8, { charSpace: 1 }); doc.text("EXPECTED", M + 115, boxY + 8, { charSpace: 1 });
  font("times", "bold", 14); color(WHITE); doc.text("Ibadan", M + 71, boxY + 17); doc.text("500 – 1,000 guests", M + 115, boxY + 17);

  // ---- Page 2: letter -------------------------------------------------------------------------
  doc.addPage(); fill(CREAM); doc.rect(0, 0, W, H, "F");
  if (logoCol) doc.addImage(logoCol, "PNG", M, 20, 40, 13.8);
  eyebrow("An invitation", M, 52);
  font("times", "bold", 24); color(NAVY); doc.text(`Dear ${a.contactName},`, M, 64);
  rule(M, 69);
  let y = 82;
  const items = [...a.items, ...(a.otherItems.trim() ? [a.otherItems.trim()] : [])];
  y = para(`Thank you for your interest in partnering with Accelerators Events 2026: The Summit of Excellence, taking place on Saturday 5 December 2026 in Ibadan under the theme "Rise with Purpose. Lead with Power. Reign with Excellence."`, M, y, W - 2 * M) + 4;
  y = para(`We are expecting between 500 and 1,000 guests: ambitious members, team leaders and professionals from across the Accelerator community, gathered in one room for a full day of recognition, leadership training, speakers and networking.`, M, y, W - 2 * M) + 4;
  y = para(`We would love ${a.brand} to be part of it${a.business ? `, bringing ${a.business.trim().replace(/\.$/, "")} to our guests` : ""}. As a partner, ${a.brand} can showcase its business at the event, speak to the audience about its products, and answer questions directly from the people most likely to become its customers.`, M, y, W - 2 * M) + 4;
  y = para(`You indicated interest as a ${a.option === "Not sure yet" ? "partner (option to be agreed)" : a.option}${items.length ? `, supporting our guests with ${items.join(", ").toLowerCase()}` : ""}${a.quantity ? ` (about ${a.quantity})` : ""}. The pages that follow summarise the opportunity, the partnership options and the details you shared with us.`, M, y, W - 2 * M) + 10;
  font("helvetica", "bold", 10.5); color(NAVY); doc.text("Warm regards,", M, y); y += 10;
  doc.text("Accelerators Community", M, y); font("helvetica", "normal", 10.5); color(INK); doc.text("Accelerators Events 2026", M, y + 5.5);
  footer(2);

  // ---- Page 3: opportunity + options ----------------------------------------------------------
  doc.addPage(); fill(CREAM); doc.rect(0, 0, W, H, "F");
  eyebrow(`The opportunity for ${a.brand}`, M, 26);
  font("times", "bold", 22); color(NAVY); doc.text(doc.splitTextToSize("Showcase your brand to 500–1,000 people in one day", W - 2 * M), M, 37);
  rule(M, 52);
  const cards = [["Showcase & exhibit", "A dedicated space to display your products, meet guests face to face and collect contacts."],
                 ["Speak on stage", "A speaking slot to introduce your business and products to the full audience."],
                 ["Live questions", "Guests ask your team about your brand and products directly."],
                 ["Gifts that travel home", "Your branded items go home with guests and stay in daily use."]];
  cards.forEach(([t, d], i) => {
    const cx = M + (i % 2) * 87, cy = 60 + Math.floor(i / 2) * 36;
    fill(WHITE); doc.rect(cx, cy, 83, 32, "F"); fill(RED); doc.rect(cx, cy, 83, 1.2, "F");
    font("times", "bold", 12.5); color(NAVY); doc.text(t, cx + 5, cy + 9);
    para(d, cx + 5, cy + 15, 73, 9, INK, 4.4);
  });
  eyebrow("Partnership options", M, 145);
  OPTIONS.forEach((o, i) => {
    const cx = M + i * 57.5, cy = 151, cw = 54, ch = 84, chosen = o.name === a.option;
    fill(WHITE); doc.rect(cx, cy, cw, ch, "F"); fill(o.color); doc.rect(cx, cy, cw, 1.6, "F");
    if (chosen) { doc.setDrawColor(RED[0], RED[1], RED[2]); doc.setLineWidth(0.8); doc.rect(cx, cy, cw, ch); fill(RED); doc.rect(cx + cw - 26, cy + 4, 22, 6, "F"); font("helvetica", "bold", 6.5); color(WHITE); doc.text("YOUR CHOICE", cx + cw - 15, cy + 8.2, { align: "center" }); }
    font("times", "bold", 12); color(NAVY); doc.text(o.name, cx + 4, cy + 17);
    let iy = cy + 25;
    o.items.forEach((it) => { diamond(cx + 5.5, iy - 1.2, 1.2, RED); iy = para(it, cx + 9, iy, cw - 13, 8.5, INK, 4) + 1.6; });
  });
  para("Contributions are agreed with each partner: cash, branded items, or a mix. Exact visibility, timings and space are confirmed together.", M, 247, W - 2 * M, 9, [94, 102, 120], 4.6);
  footer(3);

  // ---- Page 4: details + next steps -----------------------------------------------------------
  doc.addPage(); fill(NAVY); doc.rect(0, 0, W, H, "F"); facets();
  if (logoRev) doc.addImage(logoRev, "PNG", M, 18, 40, 13.8);
  eyebrow("Your partnership details", M, 46, SKY);
  font("times", "bold", 26); color(WHITE); doc.text(doc.splitTextToSize(`${a.brand} at the Summit`, W - 2 * M - 20), M, 58);
  rule(M, 64);
  const rows: [string, string][] = [
    ["Brand / company", a.brand], ["Contact person", a.contactName + (a.role ? ` (${a.role})` : "")], ["Phone / WhatsApp", a.phone], ["Email", a.email],
    ["What you do", a.business || "-"], ["Partnership option", a.option], ["Items for guests", items.length ? items.join(", ") : "-"], ["Approx. quantity", a.quantity || "-"],
    ["Speak on stage?", a.speak], ["Message", a.message || "-"],
  ];
  fill(WHITE); doc.rect(M, 72, W - 2 * M, 128, "F");
  let ry = 82;
  rows.forEach(([k, v], i) => {
    font("helvetica", "bold", 8); color([94, 102, 120]); doc.text(k.toUpperCase(), M + 6, ry, { charSpace: 0.6 });
    font("helvetica", "normal", 10); color(NAVY); const lines = doc.splitTextToSize(v, 100).slice(0, 3); doc.text(lines, M + 58, ry);
    ry += Math.max(6, lines.length * 5) + 4.5;
    if (i < rows.length - 1) { doc.setDrawColor(220, 213, 198); doc.setLineWidth(0.2); doc.line(M + 6, ry - 6, W - M - 6, ry - 6); }
  });
  eyebrow("Next steps", M, 214, SKY);
  const steps = [["01", "We review your details and reach out to confirm your partnership."], ["02", "Share your logo and items; we confirm your speaking time and showcase space."], ["03", "Meet your audience: Saturday 5 December 2026, Ibadan."]];
  steps.forEach(([n, t], i) => { font("times", "bolditalic", 16); color(RED); doc.text(n, M, 225 + i * 9); font("helvetica", "normal", 10); color([214, 221, 240]); doc.text(t, M + 12, 225 + i * 9); });
  fill(WHITE); doc.rect(M, 254, W - 2 * M, 26, "F");
  font("helvetica", "bold", 7.5); color(RED); doc.text("CONTACT", M + 6, 262, { charSpace: 1 }); doc.text("REACH US", M + 90, 262, { charSpace: 1 });
  font("helvetica", "bold", 11); color(NAVY); doc.text(sponsorship.contactName, M + 6, 269);
  font("helvetica", "normal", 9.5); color(INK); doc.text(sponsorship.contactOrg, M + 6, 274.5);
  doc.text(`WhatsApp only: ${sponsorship.whatsappDisplay}`, M + 90, 269); doc.text(`Email: ${sponsorship.email}`, M + 90, 274.5);
  footer(4, true);

  return doc.output("blob");
}

/** Short text summary used for the WhatsApp / email hand-off to the organisers. */
export function summary(a: SponsorAnswers) {
  const items = [...a.items, ...(a.otherItems.trim() ? [a.otherItems.trim()] : [])];
  return [
    "Hello Accelerators Community, we'd like to sponsor Accelerators Events 2026.",
    "",
    `Brand: ${a.brand}`,
    `Contact: ${a.contactName}${a.role ? ` (${a.role})` : ""}`,
    `Phone/WhatsApp: ${a.phone}`,
    `Email: ${a.email}`,
    a.business ? `What we do: ${a.business}` : "",
    `Option: ${a.option}`,
    items.length ? `Items for guests: ${items.join(", ")}` : "",
    a.quantity ? `Approx. quantity: ${a.quantity}` : "",
    `Speak on stage: ${a.speak}`,
    a.message ? `Message: ${a.message}` : "",
    "",
    "(Our proposal PDF was generated on your website.)",
  ].filter((l, i, arr) => l !== "" || (i > 0 && arr[i - 1] !== "")).join("\n");
}
