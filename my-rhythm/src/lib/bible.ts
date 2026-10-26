import { DateTime } from "luxon";

/** Protestant canon: book names and chapter counts (structure only — no Scripture text). */
export const BOOKS: [string, number][] = [
  ["Genesis", 50], ["Exodus", 40], ["Leviticus", 27], ["Numbers", 36], ["Deuteronomy", 34], ["Joshua", 24], ["Judges", 21], ["Ruth", 4],
  ["1 Samuel", 31], ["2 Samuel", 24], ["1 Kings", 22], ["2 Kings", 25], ["1 Chronicles", 29], ["2 Chronicles", 36], ["Ezra", 10], ["Nehemiah", 13],
  ["Esther", 10], ["Job", 42], ["Psalms", 150], ["Proverbs", 31], ["Ecclesiastes", 12], ["Song of Solomon", 8], ["Isaiah", 66], ["Jeremiah", 52],
  ["Lamentations", 5], ["Ezekiel", 48], ["Daniel", 12], ["Hosea", 14], ["Joel", 3], ["Amos", 9], ["Obadiah", 1], ["Jonah", 4], ["Micah", 7],
  ["Nahum", 3], ["Habakkuk", 3], ["Zephaniah", 3], ["Haggai", 2], ["Zechariah", 14], ["Malachi", 4],
  ["Matthew", 28], ["Mark", 16], ["Luke", 24], ["John", 21], ["Acts", 28], ["Romans", 16], ["1 Corinthians", 16], ["2 Corinthians", 13],
  ["Galatians", 6], ["Ephesians", 6], ["Philippians", 4], ["Colossians", 4], ["1 Thessalonians", 5], ["2 Thessalonians", 3], ["1 Timothy", 6],
  ["2 Timothy", 4], ["Titus", 3], ["Philemon", 1], ["Hebrews", 13], ["James", 5], ["1 Peter", 5], ["2 Peter", 3], ["1 John", 5], ["2 John", 1],
  ["3 John", 1], ["Jude", 1], ["Revelation", 22],
];

export const OT = BOOKS.slice(0, 39).map((b) => b[0]);
export const NT = BOOKS.slice(39).map((b) => b[0]);
export const TOTAL_CHAPTERS = BOOKS.reduce((s, b) => s + b[1], 0);

export const PRESETS: { id: string; name: string; books: string[]; days: number }[] = [
  { id: "bible-1y", name: "Whole Bible in a year", books: BOOKS.map((b) => b[0]), days: 365 },
  { id: "nt-90", name: "New Testament in 90 days", books: NT, days: 90 },
  { id: "gospels-30", name: "The Gospels in 30 days", books: ["Matthew", "Mark", "Luke", "John"], days: 30 },
  { id: "psalms-prov-60", name: "Psalms & Proverbs in 60 days", books: ["Psalms", "Proverbs"], days: 60 },
  { id: "ot-1y", name: "Old Testament in a year", books: OT, days: 365 },
];

export interface PlanDay {
  day: number;
  date: string;
  readings: { book: string; chapter: number }[];
}

/**
 * Distribute every chapter of the chosen books over `days` days as evenly as
 * possible (chapter counts per day differ by at most one).
 */
export function generatePlan(books: string[], startDate: string, days: number): PlanDay[] {
  const chapters: { book: string; chapter: number }[] = [];
  const order = BOOKS.filter(([b]) => books.includes(b));
  for (const [book, n] of order) for (let c = 1; c <= n; c++) chapters.push({ book, chapter: c });
  const d = Math.max(1, Math.min(days, chapters.length || 1));
  const base = Math.floor(chapters.length / d);
  const extra = chapters.length % d;
  const out: PlanDay[] = [];
  let i = 0;
  for (let day = 0; day < d; day++) {
    const take = base + (day < extra ? 1 : 0);
    out.push({ day: day + 1, date: DateTime.fromISO(startDate).plus({ days: day }).toISODate()!, readings: chapters.slice(i, i + take) });
    i += take;
  }
  return out;
}

export function readingLabel(readings: { book: string; chapter: number }[]): string {
  const parts: string[] = [];
  let cur: { book: string; from: number; to: number } | null = null;
  for (const r of readings) {
    if (cur && cur.book === r.book && r.chapter === cur.to + 1) cur.to = r.chapter;
    else {
      if (cur) parts.push(cur.from === cur.to ? `${cur.book} ${cur.from}` : `${cur.book} ${cur.from}–${cur.to}`);
      cur = { book: r.book, from: r.chapter, to: r.chapter };
    }
  }
  if (cur) parts.push(cur.from === cur.to ? `${cur.book} ${cur.from}` : `${cur.book} ${cur.from}–${cur.to}`);
  return parts.join(", ");
}
