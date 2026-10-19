"use server";

import type Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AI_MODEL, aiClient, aiErrorMessage, isAiConfigured } from "@/lib/ai";
import { METRIC_KEYS } from "@/lib/office-report";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

export type ReportState = { ok: boolean; message: string } | null;

const n = z.preprocess((v) => (v === "" || v === null || v === undefined ? null : Number(String(v).replace(/[,₦$\s]/g, ""))),
  z.number().min(0).max(1e10).nullable());
const text = (max: number) => z.string().trim().max(max).nullable().optional().transform((v) => v || null);

const reportSchema = z.object({
  office_id: z.string().uuid(),
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  team_leaders: text(200), director: text(120), location: text(200),
  currency: z.enum(["USD", "NGN"]),
  metrics: z.record(z.string(), n).transform((m) => Object.fromEntries(Object.entries(m).filter(([k]) => METRIC_KEYS.includes(k)))),
  services: z.array(z.object({ name: z.string().trim().max(80), orders: n.optional(), keywords: z.string().trim().max(200).optional(), gig_title: z.string().trim().max(300).optional() }))
    .max(20).transform((rows) => rows.filter((r) => r.name)),
  new_services: z.array(z.object({ name: z.string().trim().max(80), messages: n.optional(), orders: n.optional(), keywords: z.string().trim().max(200).optional(), gig_title: z.string().trim().max(300).optional() }))
    .max(20).transform((rows) => rows.filter((r) => r.name)),
  trainings_count: n, training_topics: text(1000), timetable: text(1000), fresh_updates: text(2000),
  challenges: z.array(z.object({ challenge: z.string().trim().max(300), solution: z.string().trim().max(300).optional() }))
    .max(20).transform((rows) => rows.filter((r) => r.challenge)),
  notes: text(4000),
});

/** Save a draft or submit the week's report (one per office per week). */
export async function saveOfficeReportAction(_prev: ReportState, formData: FormData): Promise<ReportState> {
  let raw: unknown;
  try { raw = JSON.parse(String(formData.get("report") ?? "{}")); } catch { return { ok: false, message: "Couldn't read the report." }; }
  const parsed = reportSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: `Please check: ${parsed.error.issues[0].path.join(" ")} ${parsed.error.issues[0].message}` };
  const submit = formData.get("intent") === "submit";
  const supabase = await createClient();
  const { error } = await supabase.from("office_reports").upsert({
    ...parsed.data,
    trainings_count: parsed.data.trainings_count === null ? null : Math.round(parsed.data.trainings_count),
    ...(submit ? { status: "submitted" } : {}),
  }, { onConflict: "office_id,week_start" });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/office/weekly", "layout");
  return { ok: true, message: submit ? "Report submitted. You can download the PDF now." : "Draft saved." };
}

const REPORT_TOOL: Anthropic.Tool = {
  name: "fill_report",
  description: "Fill in a weekly office report for a freelancing / network-marketing office.",
  input_schema: {
    type: "object",
    properties: {
      team_leaders: { type: ["string", "null"] }, director: { type: ["string", "null"] }, location: { type: ["string", "null"] },
      currency: { type: ["string", "null"], enum: ["USD", "NGN", null], description: "Currency of amounts earned; USD if they say dollars" },
      metrics: {
        type: "object",
        description: "This week's numbers. Only include what they said.",
        properties: Object.fromEntries(METRIC_KEYS.map((k) => [k, { type: ["number", "null"] }])),
      },
      services: { type: "array", description: "Services offered this week", items: { type: "object", properties: { name: { type: "string" }, orders: { type: ["number", "null"] }, keywords: { type: "string" }, gig_title: { type: "string" } }, required: ["name"] } },
      new_services: { type: "array", description: "New services discovered", items: { type: "object", properties: { name: { type: "string" }, messages: { type: ["number", "null"] }, orders: { type: ["number", "null"] }, keywords: { type: "string" }, gig_title: { type: "string" } }, required: ["name"] } },
      trainings_count: { type: ["number", "null"] }, training_topics: { type: ["string", "null"] },
      timetable: { type: ["string", "null"] }, fresh_updates: { type: ["string", "null"] },
      challenges: { type: "array", items: { type: "object", properties: { challenge: { type: "string" }, solution: { type: "string" } }, required: ["challenge"] } },
      notes: { type: ["string", "null"], description: "Anything else they said, tidied into a short summary" },
    },
  },
};

/** Turns what an office leader said or typed into the report fields. */
export async function arrangeOfficeReportAction(spoken: string): Promise<{ ok: boolean; message: string; data?: Record<string, unknown> }> {
  const input = z.string().trim().min(10, "Say or type a little more first.").max(6000).safeParse(spoken);
  if (!input.success) return { ok: false, message: input.error.issues[0].message };
  if (!isAiConfigured()) return { ok: false, message: "Maximus AI is not configured yet." };
  try {
    const res = await aiClient().messages.create({
      model: AI_MODEL,
      max_tokens: 8000,
      system: "You fill a weekly office report from what a Nigerian office leader said (often spoken, informal). Only fill what they clearly mentioned; leave the rest out. Convert '5k' to 5000. 'Distributors', 'managers', 'newbies' are ranks: put their counts in the matching metric. Keep service names and gig titles in their words. Always respond by calling the provided tool exactly once, with no other text.",
      tools: [REPORT_TOOL],
      tool_choice: { type: "auto" },
      messages: [{ role: "user", content: input.data }],
    });
    const block = res.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") return { ok: false, message: "Maximus AI couldn't arrange that. Please try again." };
    return { ok: true, message: "Done. Check the report below, change anything, then save.", data: block.input as Record<string, unknown> };
  } catch (err) {
    console.error("Office report arrange failed", err);
    return { ok: false, message: aiErrorMessage(err) };
  }
}
