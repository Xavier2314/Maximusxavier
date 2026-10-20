/** Pure helpers for the Contacts hub: clean phone numbers, tags, and CSV in and out. */

/** Digits only, international format without "+", as the contacts table expects. Nigerian local numbers (0803…) become 234803…. */
export function normalisePhone(raw: unknown): string | null {
  let d = String(raw ?? "").replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  d = d.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = `234${d.slice(1)}`;
  else if (d.length === 10 && /^[789]/.test(d)) d = `234${d}`;
  return /^\d{7,15}$/.test(d) ? d : null;
}

export function normaliseEmail(raw: unknown): string | null {
  const e = String(raw ?? "").trim().toLowerCase();
  return e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? e : null;
}

export const MAX_TAGS = 20;
/** Tags are short, trimmed, and unique ignoring case. Accepts a list or "a, b; c". */
export function cleanTags(input: unknown): string[] {
  const list = Array.isArray(input) ? input : String(input ?? "").split(/[,;\n]/);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of list) {
    const t = String(x).replace(/[<>"'`]/g, "").replace(/\s+/g, " ").trim().slice(0, 30);
    const k = t.toLowerCase();
    if (!t || seen.has(k)) continue;
    seen.add(k); out.push(t);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

/** Reads CSV (comma or semicolon, quoted cells, CRLF, BOM). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const first = src.split(/\r?\n/, 1)[0] ?? "";
  const delim = (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && src[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

export type ImportRow = { name: string; phone: string | null; email: string | null; tags: string[]; notes: string; source: string };
export type ImportResult = { rows: ImportRow[]; skipped: { line: number; reason: string }[] };
export const MAX_IMPORT = 2000;

const HEAD: Record<string, RegExp> = {
  name: /^(full ?name|name|contact( name)?|customer( name)?)$/i, first: /^first ?name$/i, last: /^(last|sur) ?name$/i,
  phone: /^(phone|mobile|whatsapp|tel|telephone|phone number|mobile number|whatsapp number)$/i, email: /^(e-?mail|email address)$/i,
  tags: /^(tags?|labels?)$/i, notes: /^(notes?|comments?|description)$/i, source: /^(source|origin|lead source)$/i,
};

/** Turns a CSV file into contacts. Rows without a name, or without a phone or email, are skipped with a reason. */
export function importContacts(text: string): ImportResult {
  const table = parseCsv(text);
  if (table.length < 2) return { rows: [], skipped: [] };
  const head = table[0].map((h) => h.trim());
  const idx = (k: keyof typeof HEAD) => head.findIndex((h) => HEAD[k].test(h));
  const col = { name: idx("name"), first: idx("first"), last: idx("last"), phone: idx("phone"), email: idx("email"), tags: idx("tags"), notes: idx("notes"), source: idx("source") };
  const out: ImportResult = { rows: [], skipped: [] };
  const seen = new Set<string>();
  table.slice(1, MAX_IMPORT + 1).forEach((r, i) => {
    const line = i + 2;
    const get = (c: number) => (c >= 0 ? (r[c] ?? "").trim() : "");
    const name = (get(col.name) || [get(col.first), get(col.last)].filter(Boolean).join(" ")).slice(0, 120);
    const phone = normalisePhone(get(col.phone));
    const email = normaliseEmail(get(col.email));
    if (!phone && !email) { out.skipped.push({ line, reason: "No valid phone number or email" }); return; }
    const key = phone ?? email!;
    if (seen.has(key) || (phone && email && seen.has(email))) { out.skipped.push({ line, reason: "Duplicate in this file" }); return; }
    seen.add(key); if (email) seen.add(email);
    out.rows.push({ name: name.length >= 2 ? name : email?.split("@")[0] ?? `+${phone}`, phone, email, tags: cleanTags(get(col.tags)), notes: get(col.notes).slice(0, 4000), source: (get(col.source) || "Imported").slice(0, 120) });
  });
  return out;
}

const cell = (v: string) => { const t = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v; return /[",\n\r;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
export type ExportContact = { full_name: string; phone: string | null; email: string | null; stage: string; source: string | null; tags: string[]; notes: string | null; created_at: string };
/** CSV for a spreadsheet. Cells starting with = + - @ are prefixed so a spreadsheet cannot run them as formulas. */
export function contactsToCsv(rows: ExportContact[]): string {
  const head = ["Name", "Phone", "Email", "Stage", "Source", "Tags", "Notes", "Added"].join(",");
  const lines = rows.map((r) => [r.full_name, r.phone ? `+${r.phone}` : "", r.email ?? "", r.stage, r.source ?? "", r.tags.join("; "), r.notes ?? "", r.created_at.slice(0, 10)].map((v) => cell(String(v))).join(","));
  return [head, ...lines].join("\r\n");
}
