"use server";

import type Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { aiClient, aiErrorMessage, isAiConfigured } from "@/lib/ai";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";
import type { UpworkReport } from "@/lib/upwork";

const DAILY_LIMIT = 5;
// A fast model so the report finishes within the page's time limit.
const MODEL = process.env.UPWORK_ANALYSER_MODEL || "claude-sonnet-5-5";

const text = (max: number) => z.string().trim().max(max).default("");
const inputSchema = z.object({
  niche: text(200), title: z.string().trim().min(3, "Paste your Upwork profile title").max(200),
  overview: z.string().trim().min(40, "Paste your full profile overview (at least a few sentences)").max(6000),
  skills: text(1500), hourly_rate: text(60), portfolio: text(4000), stats: text(1500), target_clients: text(500),
});

const section = {
  type: "object",
  properties: {
    name: { type: "string" }, score: { type: "integer", minimum: 0, maximum: 10 },
    verdict: { type: "string", description: "One or two sentences: what works and what doesn't" },
    fixes: { type: "array", items: { type: "string" }, description: "Specific, concrete changes to make" },
  },
  required: ["name", "score", "verdict", "fixes"],
};

const REPORT_TOOL: Anthropic.Tool = {
  name: "upwork_report",
  description: "Return the full Upwork profile analysis.",
  input_schema: {
    type: "object",
    properties: {
      overall_score: { type: "integer", minimum: 0, maximum: 100 },
      headline: { type: "string", description: "One-sentence honest verdict on the profile" },
      sections: {
        type: "array", items: section,
        description: "Exactly these sections in order: Title, Overview, Skills, Rate, Portfolio, Proof & stats, Client fit",
      },
      rewritten_title: { type: "string", description: "A stronger profile title, max 70 characters" },
      rewritten_overview: { type: "string", description: "A rewritten overview: hook in the first 2 lines, outcomes, proof, process, call to action. Plain text, 150-300 words. Never invent facts the freelancer didn't give; use [brackets] for details they must fill in." },
      suggested_skills: { type: "array", items: { type: "string" }, description: "Up to 15 skill tags to use" },
      rate_advice: { type: "string" },
      top_actions: { type: "array", items: { type: "string" }, description: "The 5 highest-impact actions, most important first" },
      seven_day_plan: {
        type: "array",
        items: { type: "object", properties: { day: { type: "integer" }, task: { type: "string" } }, required: ["day", "task"] },
      },
    },
    required: ["overall_score", "headline", "sections", "rewritten_title", "rewritten_overview", "suggested_skills", "rate_advice", "top_actions", "seven_day_plan"],
  },
};

const SYSTEM = `You are an expert Upwork profile reviewer who has helped thousands of freelancers win clients. Many users are Nigerian freelancers starting out.
Review the profile the user pasted and score it honestly; don't inflate scores. Judge it the way a client scrolling Upwork search results would.
Focus on: a specific, searchable title; an overview whose first two lines hook the client and speak to their problem; clear outcomes and proof; relevant skill tags; a rate that fits the niche and experience; portfolio items that show results; and fit with the target clients.
Every fix must be concrete (say exactly what to write or change). Never invent experience, clients, numbers or reviews; when the rewrite needs a detail the user didn't give, write a [placeholder]. Don't promise jobs or earnings. Follow Upwork's rules (no contact details or off-platform payment in profiles). Always respond by calling the provided tool exactly once, with no other text.`;

export type AnalyseState = { ok: boolean; message: string; id?: string } | null;

export async function analyseUpworkAction(_: AnalyseState, form: FormData): Promise<AnalyseState> {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("has_tool_access", { p_tool: "upwork_analyser" });
  if (!allowed) return { ok: false, message: "Unlock the analyser first (₦1,000 one-time)." };
  const parsed = inputSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  if (!isAiConfigured()) return { ok: false, message: "Maximus AI is not configured yet. Please tell an administrator." };

  if (!viewer.roles.includes("super_admin")) {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count } = await supabase.from("upwork_analyses").select("id", { count: "exact", head: true }).gte("created_at", since);
    if ((count ?? 0) >= DAILY_LIMIT) return { ok: false, message: `You've used today's ${DAILY_LIMIT} analyses. Make your changes and come back tomorrow.` };
  }

  const v = parsed.data;
  const profile = [
    `Niche / service: ${v.niche || "(not given)"}`,
    `Target clients: ${v.target_clients || "(not given)"}`,
    `Profile title: ${v.title}`,
    `Hourly rate: ${v.hourly_rate || "(not given)"}`,
    `Skills tags: ${v.skills || "(not given)"}`,
    `Stats (Job Success, jobs done, earnings, reviews, badges): ${v.stats || "(not given)"}`,
    `Overview:\n${v.overview}`,
    `Portfolio items:\n${v.portfolio || "(none given)"}`,
  ].join("\n\n");

  let report: UpworkReport;
  try {
    const res = await aiClient().messages.create({
      model: MODEL,
      max_tokens: 12000,
      system: SYSTEM,
      tools: [REPORT_TOOL],
      tool_choice: { type: "auto" },
      messages: [{ role: "user", content: `<upwork_profile>\n${profile}\n</upwork_profile>\n\nAnalyse this profile.` }],
    });
    if (res.stop_reason === "max_tokens") return { ok: false, message: "The report was too long. Shorten your overview a little and try again." };
    const block = res.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!block) return { ok: false, message: "Maximus AI didn't return a report. Please try again." };
    report = block.input as UpworkReport;
    if (typeof report.overall_score !== "number" || !Array.isArray(report.sections)) {
      return { ok: false, message: "The report came back incomplete. Please try again." };
    }
  } catch (err) {
    console.error("[upwork-analyser]", err);
    return { ok: false, message: aiErrorMessage(err) };
  }

  const score = Math.max(0, Math.min(100, Math.round(report.overall_score)));
  const { data, error } = await supabase.from("upwork_analyses").insert({ input: v, report, score }).select("id").single();
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/tools/upwork");
  return { ok: true, message: "Your report is ready.", id: data.id as string };
}

export async function unlockMemberAction(_: { ok: boolean; message: string } | null, form: FormData) {
  const memberId = z.string().trim().min(3).max(20).safeParse(form.get("member_id"));
  if (!memberId.success) return { ok: false, message: "Enter the member's ID, e.g. MX-001024." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("grant_tool_access", { p_member_id: memberId.data, p_tool: "upwork_analyser" });
  if (error) return { ok: false, message: friendlyError(error, error.message) };
  return { ok: true, message: `Unlocked for ${data as string}. They've been notified.` };
}
