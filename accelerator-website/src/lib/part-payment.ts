/**
 * Part-payment commitment letter: a member who has paid part of their registration fee signs
 * (types their name) to commit to paying the balance by a date they choose. The letter is
 * generated in the browser with jsPDF and the record is sent to /api/part-payment (Google Sheet).
 */
import { BANK_ACCOUNT } from "./fees";
import { sponsorship } from "./site";

export type PartPayment = {
  ref: string;
  fullName: string;
  phone: string;
  email: string;
  position: string;
  feeNaira: number;
  paidNaira: number;
  balanceNaira: number;
  receipts: number;
  balanceDate: string; // YYYY-MM-DD
  signedAt: string; // ISO timestamp
};

/** Latest date a balance can be promised for: the day before the event. */
export const BALANCE_LAST_DATE = "2026-12-04";

export const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;
/** The PDF's built-in Helvetica has no ₦ glyph, so amounts in the letter use "NGN". */
const ngn = (n: number) => `NGN ${Math.round(n).toLocaleString("en-NG")}`;
export const longDate = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export function newRef() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rnd = Array.from(crypto.getRandomValues(new Uint8Array(3))).map((b) => b.toString(36).padStart(2, "0")).join("").slice(0, 5).toUpperCase();
  return `PP-${ymd}-${rnd}`;
}

export function letterFileName(p: PartPayment) {
  return `Part_Payment_Letter_${p.fullName.trim().replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "") || "Member"}_${p.ref}.pdf`;
}

type RGB = [number, number, number];
const NAVY: RGB = [11, 30, 63], RED: RGB = [225, 30, 45], CREAM: RGB = [244, 241, 234], INK: RGB = [42, 50, 71], SLATE: RGB = [94, 102, 120], WHITE: RGB = [255, 255, 255];

async function loadImage(src: string): Promise<string | null> {
  try {
    const blob = await (await fetch(src)).blob();
    return await new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result as string); r.onerror = () => resolve(null); r.readAsDataURL(blob); });
  } catch { return null; }
}

export async function buildPartPaymentLetter(p: PartPayment): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const W = 210, H = 297, M = 20;
  const logo = await loadImage("/brand/logo-horizontal-colour.png");
  const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const color = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const font = (family: "helvetica" | "times", style: "normal" | "bold" | "italic" | "bolditalic", size: number) => { doc.setFont(family, style); doc.setFontSize(size); };
  const para = (t: string, y: number, size = 10.5) => { font("helvetica", "normal", size); color(INK); const l = doc.splitTextToSize(t, W - 2 * M); doc.text(l, M, y); return y + l.length * 5.3; };

  fill(WHITE); doc.rect(0, 0, W, H, "F");
  fill(NAVY); doc.rect(0, 0, W, 6, "F"); fill(RED); doc.rect(0, 6, W, 1.5, "F");
  if (logo) doc.addImage(logo, "PNG", M, 16, 44, 15.1);
  font("helvetica", "bold", 8); color(SLATE);
  doc.text(`REF: ${p.ref}`, W - M, 21, { align: "right", charSpace: 0.6 });
  doc.text(`DATE: ${longDate(p.signedAt).toUpperCase()}`, W - M, 26, { align: "right", charSpace: 0.6 });

  font("helvetica", "bold", 8.5); color(RED); doc.text("ACCELERATORS EVENTS 2026 · THE SUMMIT OF EXCELLENCE", M, 46, { charSpace: 1 });
  font("times", "bold", 22); color(NAVY); doc.text("Part Payment Commitment Letter", M, 57);
  fill(RED); doc.rect(M, 61, 18, 1.2, "F");

  let y = 72;
  font("helvetica", "normal", 10.5); color(INK);
  doc.text("To: Accelerators Community, Accelerators Events 2026 organising team", M, y); y += 10;

  y = para(`I, ${p.fullName}, registering as ${p.position} for Accelerators Events 2026 (Saturday 5 December 2026, Ibadan), confirm that I have made a part payment towards my registration fee into the official account (${BANK_ACCOUNT.bank} ${BANK_ACCOUNT.accountNumber}, ${BANK_ACCOUNT.accountName}).`, y) + 4;
  y = para(`I commit to paying the outstanding balance in full into the same official account on or before ${longDate(p.balanceDate)}, and to sending the receipt to the organising team.`, y) + 4;
  y = para("I understand that my registration is completed only when the full fee has been paid and verified by the team.", y) + 8;

  // Summary table
  const rows: [string, string][] = [
    ["Full name", p.fullName], ["Phone / WhatsApp", p.phone], ["Email", p.email || "-"], ["Membership position", p.position],
    ["Registration fee", ngn(p.feeNaira)], ["Amount paid", `${ngn(p.paidNaira)}  (${p.receipts} receipt${p.receipts === 1 ? "" : "s"})`],
    ["Balance to pay", ngn(p.balanceNaira)], ["Balance due on or before", longDate(p.balanceDate)],
  ];
  const top = y;
  fill(CREAM); doc.rect(M, top, W - 2 * M, rows.length * 9 + 6, "F");
  y = top + 9;
  rows.forEach(([k, v]) => {
    const hi = k === "Balance to pay" || k === "Balance due on or before";
    font("helvetica", "bold", 8); color(SLATE); doc.text(k.toUpperCase(), M + 6, y, { charSpace: 0.5 });
    font("helvetica", hi ? "bold" : "normal", hi ? 11.5 : 10.5); color(hi ? RED : NAVY); doc.text(v, M + 68, y);
    y += 9;
  });
  y = top + rows.length * 9 + 18;

  // Signature
  font("helvetica", "bold", 8); color(SLATE); doc.text("SIGNED (TYPED NAME)", M, y, { charSpace: 0.6 }); doc.text("DATE SIGNED", M + 100, y, { charSpace: 0.6 });
  font("times", "bolditalic", 18); color(NAVY); doc.text(p.fullName, M, y + 10);
  font("helvetica", "normal", 10.5); doc.text(longDate(p.signedAt), M + 100, y + 10);
  doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]); doc.setLineWidth(0.3); doc.line(M, y + 13, M + 85, y + 13); doc.line(M + 100, y + 13, W - M, y + 13);
  y += 26;
  font("helvetica", "italic", 9); color(SLATE);
  doc.text(doc.splitTextToSize("Signed electronically on the Accelerators Events 2026 registration page by typing the full name above and ticking the agreement box.", W - 2 * M), M, y);

  // Footer
  fill(NAVY); doc.rect(0, H - 24, W, 24, "F");
  font("helvetica", "bold", 8); color(WHITE);
  doc.text("Accelerators Community · Accelerators Events 2026", M, H - 14);
  font("helvetica", "normal", 8); color([184, 194, 217]);
  doc.text(`Questions: WhatsApp ${sponsorship.whatsappDisplay} (WhatsApp only) · ${sponsorship.email}`, M, H - 9);

  return doc.output("blob");
}

/** Text for the WhatsApp hand-off to the organisers. */
export function partPaymentSummary(p: PartPayment) {
  return [
    "Hello Accelerators Community, I have made a PART PAYMENT for Accelerators Events 2026.",
    "",
    `Ref: ${p.ref}`,
    `Name: ${p.fullName}`,
    `Phone: ${p.phone}`,
    p.email ? `Email: ${p.email}` : "",
    `Position: ${p.position}`,
    `Fee: ${naira(p.feeNaira)}`,
    `Paid: ${naira(p.paidNaira)}`,
    `Balance: ${naira(p.balanceNaira)}`,
    `I will pay the balance on or before: ${longDate(p.balanceDate)}`,
    "",
    "My signed commitment letter is attached.",
  ].filter((l, i, a) => l !== "" || (i > 0 && a[i - 1] !== "")).join("\n");
}
