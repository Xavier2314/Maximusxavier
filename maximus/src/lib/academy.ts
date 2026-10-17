export const CATEGORIES = [
  { key: "getting_started", label: "Getting Started", gradient: "from-[#305ee6] to-[#1e3a8a]" },
  { key: "onboarding_academy", label: "Onboarding Academy", gradient: "from-[#0f172a] to-[#305ee6]" },
  { key: "prospecting_masterclass", label: "Prospecting Masterclass", gradient: "from-[#3f7d0f] to-[#7ed321]" },
  { key: "sales_follow_up", label: "Sales and Follow-Up", gradient: "from-[#1e3a8a] to-[#4f9a10]" },
  { key: "leadership_development", label: "Leadership Development", gradient: "from-[#0f172a] to-[#4f9a10]" },
  { key: "team_building", label: "Team Building", gradient: "from-[#305ee6] to-[#7ed321]" },
  { key: "financial_discipline", label: "Financial Discipline", gradient: "from-[#14532d] to-[#305ee6]" },
  { key: "product_knowledge", label: "Product Knowledge", gradient: "from-[#1e293b] to-[#305ee6]" },
  { key: "personal_development", label: "Personal Development", gradient: "from-[#4f9a10] to-[#0f172a]" },
  { key: "recognition_success_stories", label: "Recognition and Success Stories", gradient: "from-[#305ee6] to-[#0f172a]" },
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
