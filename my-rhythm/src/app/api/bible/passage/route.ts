import { HttpError, route } from "@/lib/api";

/**
 * Passage text from the World English Bible (public domain) via bible-api.com.
 * Text is shown verbatim from the source; nothing is generated.
 */
export const GET = route(async (req) => {
  const ref = new URL(req.url).searchParams.get("ref")?.trim();
  if (!ref || ref.length > 60 || !/^[1-3]?\s?[A-Za-z ]+\s\d+(:\d+(-\d+)?)?$/.test(ref)) throw new HttpError(400, "Use a reference like “John 3” or “Psalm 23:1-6”.");
  const res = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}?translation=web`, { next: { revalidate: 60 * 60 * 24 * 30 } });
  if (!res.ok) throw new HttpError(502, "Couldn't load that passage right now.");
  const j = (await res.json()) as { reference: string; verses: { verse: number; text: string; chapter: number }[]; translation_name: string };
  return {
    reference: j.reference,
    translation: j.translation_name ?? "World English Bible",
    license: "Public domain",
    source: "bible-api.com",
    verses: j.verses.map((v) => ({ chapter: v.chapter, verse: v.verse, text: v.text.trim() })),
  };
});
