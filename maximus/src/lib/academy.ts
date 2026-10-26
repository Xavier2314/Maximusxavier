export const CATEGORIES = [
  { key: "getting_started", label: "Getting Started", gradient: "bg-[#305ee6]" },
  { key: "onboarding_academy", label: "Onboarding Academy", gradient: "bg-[#0f172a]" },
  { key: "prospecting_masterclass", label: "Prospecting Masterclass", gradient: "bg-[#3f7d0f]" },
  { key: "sales_follow_up", label: "Sales and Follow-Up", gradient: "bg-[#1e3a8a]" },
  { key: "leadership_development", label: "Leadership Development", gradient: "bg-[#0f172a]" },
  { key: "team_building", label: "Team Building", gradient: "bg-[#305ee6]" },
  { key: "financial_discipline", label: "Financial Discipline", gradient: "bg-[#14532d]" },
  { key: "product_knowledge", label: "Product Knowledge", gradient: "bg-[#1e293b]" },
  { key: "personal_development", label: "Personal Development", gradient: "bg-[#4f9a10]" },
  { key: "recognition_success_stories", label: "Recognition and Success Stories", gradient: "bg-[#305ee6]" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];
export const categoryOf = (key: string) => CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[0];

/** Turn a YouTube/Vimeo link into an embeddable URL; other links play as direct video. */
export function embedUrl(url: string): { kind: "iframe" | "video"; src: string } | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${id}` };
    }
    if (u.hostname === "youtu.be") return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed${u.pathname}` };
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id) return { kind: "iframe", src: `https://player.vimeo.com/video/${id}` };
    }
    if (u.protocol === "https:") return { kind: "video", src: url };
  } catch { /* invalid URL */ }
  return null;
}
