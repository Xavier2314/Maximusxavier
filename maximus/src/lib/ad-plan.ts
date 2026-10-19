import { checkAdText, conceptText, hasBlocking, type AdIssue } from "@/lib/ad-rules";

export const OBJECTIVES = [
  { key: "whatsapp", label: "WhatsApp messages", hint: "People tap the ad and chat with you on WhatsApp. Best when you close sales by chat or pay on delivery.", cta: "WHATSAPP_MESSAGE" },
  { key: "sales", label: "Orders on my funnel", hint: "People go to your funnel page and place an order there.", cta: "SHOP_NOW" },
  { key: "leads", label: "Leads (sign-ups)", hint: "People leave their name and number on your funnel so you can follow up.", cta: "SIGN_UP" },
  { key: "traffic", label: "Visits to my funnel", hint: "Cheapest clicks. Use only to test a new page.", cta: "LEARN_MORE" },
] as const;
export type Objective = (typeof OBJECTIVES)[number]["key"];

export const CTAS = ["WHATSAPP_MESSAGE", "SHOP_NOW", "ORDER_NOW", "LEARN_MORE", "SIGN_UP", "CONTACT_US"] as const;
export type Cta = (typeof CTAS)[number];
export const CTA_LABEL: Record<Cta, string> = {
  WHATSAPP_MESSAGE: "Send WhatsApp message", SHOP_NOW: "Shop now", ORDER_NOW: "Order now", LEARN_MORE: "Learn more", SIGN_UP: "Sign up", CONTACT_US: "Contact us",
};

export type VideoBrief = { lengthSec: number; hook: string; scenes: string[]; voiceover: string; onScreenText: string };
export type Concept = {
  id: string; name: string; angle: string; format: "video" | "image";
  primaryText: string; headline: string; description: string; cta: Cta;
  creativeBrief: string; video?: VideoBrief;
};
export type PlanInputs = { objective: Objective; dailyBudgetNgn: number; areas: string; healthProduct: boolean; registrationNumber: string; offer: string };
export type Audience = { locations: string[]; ageMin: number; ageMax: number; gender: "all" | "women" | "men"; interests: string[]; notes: string };
export type AdPlan = {
  v: 1; inputs: PlanInputs; audience: Audience;
  budget: { dailyNgn: number; testDays: number; rationale: string };
  concepts: Concept[]; testing: string[];
};

const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const n = (v: unknown, min: number, max: number, d: number) => { const x = Number(v); return Number.isFinite(x) ? Math.min(max, Math.max(min, Math.round(x))) : d; };
const list = (v: unknown, max: number, len: number) => (Array.isArray(v) ? v : []).map((x) => s(x, len)).filter(Boolean).slice(0, max);
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

export function cleanInputs(raw: unknown): PlanInputs {
  const r = rec(raw);
  return {
    objective: OBJECTIVES.some((o) => o.key === r.objective) ? (r.objective as Objective) : "whatsapp",
    dailyBudgetNgn: n(r.dailyBudgetNgn, 1000, 5_000_000, 5000),
    areas: s(r.areas, 200), healthProduct: r.healthProduct === true, registrationNumber: s(r.registrationNumber, 40), offer: s(r.offer, 300),
  };
}

export function cleanPlan(raw: unknown, fallbackInputs?: PlanInputs): AdPlan | null {
  const r = rec(raw);
  const inputs = cleanInputs(r.inputs ?? fallbackInputs);
  const a = rec(r.audience);
  const ageMin = n(a.ageMin, 18, 64, 18);
  const concepts = (Array.isArray(r.concepts) ? r.concepts : []).slice(0, 6).flatMap((c, i): Concept[] => {
    const o = rec(c);
    const primaryText = s(o.primaryText, 900);
    const headline = s(o.headline, 60);
    if (!primaryText && !headline) return [];
    const v = rec(o.video);
    const hasVideo = o.format === "video" && (s(v.hook, 200) || list(v.scenes, 8, 200).length);
    return [{
      id: s(o.id, 20).replace(/[^a-z0-9-]/gi, "") || `c${i + 1}`,
      name: s(o.name, 60) || `Idea ${i + 1}`, angle: s(o.angle, 240), format: o.format === "video" ? "video" : "image",
      primaryText, headline, description: s(o.description, 90),
      cta: (CTAS as readonly string[]).includes(String(o.cta)) ? (o.cta as Cta) : OBJECTIVES.find((x) => x.key === inputs.objective)!.cta,
      creativeBrief: s(o.creativeBrief, 800),
      ...(hasVideo ? { video: { lengthSec: n(v.lengthSec, 6, 60, 20), hook: s(v.hook, 200), scenes: list(v.scenes, 8, 220), voiceover: s(v.voiceover, 700), onScreenText: s(v.onScreenText, 200) } } : {}),
    }];
  });
  if (!concepts.length) return null;
  const b = rec(r.budget);
  return {
    v: 1, inputs,
    audience: {
      locations: list(a.locations, 12, 60), ageMin, ageMax: Math.max(ageMin, n(a.ageMax, 18, 65, 55)),
      gender: a.gender === "women" || a.gender === "men" ? a.gender : "all", interests: list(a.interests, 12, 60), notes: s(a.notes, 400),
    },
    budget: { dailyNgn: n(b.dailyNgn, 1000, 5_000_000, inputs.dailyBudgetNgn), testDays: n(b.testDays, 3, 14, 5), rationale: s(b.rationale, 500) },
    concepts, testing: list(r.testing, 8, 240),
  };
}

export function conceptIssues(c: Concept): AdIssue[] {
  return checkAdText(conceptText({ primaryText: c.primaryText, headline: c.headline, description: c.description, videoText: c.video ? [c.video.hook, c.video.voiceover, c.video.onScreenText, ...c.video.scenes].join(" ") : "" }));
}
export const planBlocked = (p: AdPlan) => p.concepts.some((c) => hasBlocking(conceptIssues(c)));

/** The funnel link for one ad, tagged so each lead and order shows which ad brought it. */
export function trackedUrl(origin: string, slug: string, planId: string, conceptId: string) {
  const q = new URLSearchParams({ utm_source: "facebook", utm_medium: "paid", utm_campaign: planId.slice(0, 8), utm_content: conceptId });
  return `${origin}/f/${slug}?${q.toString()}`;
}
