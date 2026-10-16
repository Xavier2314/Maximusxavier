/**
 * Reads the text of a bank-transfer receipt (from on-device OCR) and pulls out:
 *  - the amount transferred
 *  - whether the receipt shows the official account (number or account name)
 *
 * This is a guard against honest mistakes (wrong amount, wrong account). It is NOT proof of
 * payment: screenshots can be edited. The events team still confirms every payment against
 * the bank statement.
 */

export type ReceiptReading = {
  amountNaira: number | null;
  toOfficialAccount: boolean;
};

const SKIP_LINE = /(balance|charge|fee\b|fees\b|vat|stamp\s*duty|commission|cashback|reward|points)/i;
const AMOUNT_HINT = /(amount|sent|paid|transfer(red)?|debit(ed)?|total|you\s+(sent|paid))/i;
const MAX_NAIRA = 5_000_000;

function toNaira(whole: string, kobo?: string) {
  const n = Number(whole.replace(/[,.\s]/g, ""));
  if (!Number.isFinite(n)) return null;
  const v = n + (kobo ? Number(kobo) / 100 : 0);
  return v > 0 && v <= MAX_NAIRA ? v : null;
}

/** Money values on one line. Prefixed values (₦, NGN, N, #) are strong; bare grouped numbers are weak. */
function amountsIn(line: string): { value: number; strong: boolean }[] {
  const out: { value: number; strong: boolean }[] = [];
  // ₦50,000.00 | NGN 50000 | N50,000 | #50,000  (OCR often reads ₦ as N, # or §)
  const strong = /(?<![a-z0-9])(?:₦|ngn|n|[#§%]){1,2}\s?(\d{1,3}(?:[,.\s]\d{3})+|\d{2,7})(?:[.,](\d{2}))?(?!\d)/gi;
  for (const m of line.matchAll(strong)) {
    const v = toNaira(m[1], m[2]);
    if (v != null) out.push({ value: v, strong: true });
  }
  if (out.length) return out;
  // 50,000.00 | 50,000
  const weak = /(?<![\d*])(\d{1,3}(?:,\d{3})+)(?:\.(\d{2}))?(?![\d,])/g;
  for (const m of line.matchAll(weak)) {
    const v = toNaira(m[1], m[2]);
    if (v != null) out.push({ value: v, strong: false });
  }
  return out;
}

export function readReceipt(text: string): ReceiptReading {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Amount: prefer a money value on a line (or the line after a label) that says "amount", "sent", "paid"...
  const hinted: number[] = [];
  const strong: number[] = [];
  const weak: number[] = [];
  lines.forEach((line, i) => {
    if (SKIP_LINE.test(line)) return;
    const found = amountsIn(line);
    const hint = AMOUNT_HINT.test(line) || (i > 0 && AMOUNT_HINT.test(lines[i - 1]) && !SKIP_LINE.test(lines[i - 1]) && amountsIn(lines[i - 1]).length === 0);
    for (const a of found) {
      if (hint) hinted.push(a.value);
      (a.strong ? strong : weak).push(a.value);
    }
  });
  const pick = hinted.length ? hinted : strong.length ? strong : weak;
  const amountNaira = pick.length ? Math.max(...pick) : null;

  // Recipient: full or masked account number, or the account name.
  const compact = text.replace(/[\s-]/g, "");
  const toOfficialAccount =
    compact.includes("8115774517") ||
    /811[*x•·.]{2,}\d{0,4}4?517/i.test(compact) ||
    /[*x•·]{3,}4517/i.test(compact) ||
    /a[l1i|]uele/i.test(text) ||
    /valentine\s*emmanuel/i.test(text) ||
    /emmanuel\s*valentine/i.test(text);

  return { amountNaira, toOfficialAccount };
}

/** SHA-256 of a file, used to stop the same receipt being counted twice. */
export async function fileFingerprint(file: File) {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
