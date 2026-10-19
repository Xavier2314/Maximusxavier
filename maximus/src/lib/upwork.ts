/** Shape of an Upwork Account Analyser report (written by Maximus AI). */
export type UpworkSection = { name: string; score: number; verdict: string; fixes: string[] };
export type UpworkReport = {
  overall_score: number;
  headline: string;
  sections: UpworkSection[];
  rewritten_title: string;
  rewritten_overview: string;
  suggested_skills: string[];
  rate_advice: string;
  top_actions: string[];
  seven_day_plan: { day: number; task: string }[];
};
export type UpworkInput = {
  niche: string; title: string; overview: string; skills: string; hourly_rate: string;
  portfolio: string; stats: string; target_clients: string;
};
