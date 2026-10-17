import type { CategoryKey } from "@/lib/academy";

/** One scored area returned by the growth_focus() database function. */
export type FocusArea = {
  key: FocusKey;
  score: number;
  value: number;
  target: number;
  presentations?: number;
  presentations_target?: number;
};

export type GrowthFocus = {
  duplication_target: number;
  directs: number;
  duplicated: number;
  team_size: number;
  new_joins: number;
  areas: FocusArea[];
};

export type FocusKey =
  | "recruiting" | "duplication" | "team_prospecting" | "prospecting"
  | "follow_up" | "sales" | "consistency" | "accountability";

type FocusInfo = {
  title: string;
  short: string;
  /** Why this area came up, in the member's own numbers. */
  why: (a: FocusArea, name: string) => string;
  tips: string[];
  academy: CategoryKey;
  ask: string;
};

export const FOCUS: Record<FocusKey, FocusInfo> = {
  recruiting: {
    title: "Personal recruiting",
    short: "Recruiting",
    why: (a, n) => `${n} personally brought in ${a.value} of ${a.target} people. Duplication starts with you bringing in your own ${a.target}.`,
    tips: [
      "Write a list of 50 names: family, friends, colleagues, church, school. Don't pre-judge anyone.",
      "Invite 3 people a day with a simple, honest invitation and a clear next step (a meeting or a call).",
      "Use your referral link so every person you bring in lands directly under you.",
    ],
    academy: "prospecting_masterclass",
    ask: "Help me plan how to personally bring in my first three people this month.",
  },
  duplication: {
    title: "Leadership & duplication",
    short: "Duplication",
    why: (a, n) => `Only ${a.value} of ${n === "You" ? "your" : `${n}'s`} ${a.target} direct downline(s) have brought in their own people. The team is not yet duplicating.`,
    tips: [
      "Sit with each direct downline and build their name list together. Do their first 3 invitations with them.",
      "Teach a simple system they can copy: list → invite → present → follow up → enroll → teach them the same.",
      "Check in weekly: how many invitations, presentations and follow-ups did they do? Celebrate every new join.",
    ],
    academy: "leadership_development",
    ask: "My downlines are not bringing in their three. How do I lead them so the team duplicates?",
  },
  team_prospecting: {
    title: "Coaching your team to prospect",
    short: "Team prospecting",
    why: (a, n) => `${n === "You" ? "Your" : `${n}'s`} direct downlines average ${a.value} prospects in the last 30 days against a target of ${a.target}.`,
    tips: [
      "Run a short daily or weekly prospecting session with your team: everyone makes their calls together.",
      "Set a team prospecting challenge for the week and recognise the top prospector.",
      "Make sure each downline completes their 5-day evaluation so you can see their real numbers.",
    ],
    academy: "team_building",
    ask: "How can I get my team prospecting consistently every week?",
  },
  prospecting: {
    title: "Prospecting",
    short: "Prospecting",
    why: (a) => `${a.value} prospects recorded in the last 30 days against a target of ${a.target}.`,
    tips: [
      "Block a fixed time every day just for prospecting, and protect it like an appointment.",
      "Track every conversation in your 5-day evaluation so you can see your numbers improve.",
      "Ask every happy customer for 2–3 referrals.",
    ],
    academy: "prospecting_masterclass",
    ask: "Give me a 7-day prospecting plan to reach my prospect target.",
  },
  follow_up: {
    title: "Follow-up & presentations",
    short: "Follow-up",
    why: (a) => `${a.value} follow-ups (target ${a.target}) and ${a.presentations ?? 0} presentations (target ${a.presentations_target ?? 0}) in the last 30 days.`,
    tips: [
      "Follow up within 48 hours of every presentation, while interest is high.",
      "Use 3-way calls with your sponsor to help close and to learn how they do it.",
      "Keep a simple follow-up list with the next date for each prospect.",
    ],
    academy: "sales_follow_up",
    ask: "How do I follow up with prospects without being pushy?",
  },
  sales: {
    title: "Sales",
    short: "Sales",
    why: (a) => `${a.value} orders in the last 30 days against a target of ${a.target}.`,
    tips: [
      "Know your top 3 products well enough to explain them in one minute each.",
      "Share real results and testimonials, not just prices.",
      "Ask every customer for a repeat order date and a referral.",
    ],
    academy: "product_knowledge",
    ask: "Help me improve my sales this month.",
  },
  consistency: {
    title: "Consistency & attendance",
    short: "Consistency",
    why: (a) => `${a.value} office days in the last 30 days against a target of ${a.target}.`,
    tips: [
      "Plan your office days at the start of each week and check in every time.",
      "Attend trainings and meetings: being around leaders accelerates growth.",
      "Small daily actions beat occasional big efforts.",
    ],
    academy: "personal_development",
    ask: "How can I build a consistent daily routine for my business?",
  },
  accountability: {
    title: "Evaluations & accountability",
    short: "Evaluations",
    why: (a) => `${a.value} evaluations completed in the last 30 days (expected at least ${a.target}).`,
    tips: [
      "Complete every 5-day evaluation on time: it takes two minutes.",
      "Be honest with your numbers; your sponsor can only help with what they can see.",
      "Review your last evaluation before planning the next 5 days.",
    ],
    academy: "personal_development",
    ask: "Help me set priorities for my next five days.",
  },
};

export const topFocus = (f: GrowthFocus | null, n = 3) => (f?.areas ?? []).filter((a) => a.key in FOCUS).slice(0, n);
