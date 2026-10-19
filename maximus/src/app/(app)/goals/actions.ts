"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AI_MODEL, aiClient, aiErrorMessage, isAiConfigured } from "@/lib/ai";
import { PROSPECTING_METHODS } from "@/lib/goals";
import { createClient } from "@/lib/supabase/server";
import { dispatchPushSoon } from "@/lib/push";
import { friendlyError } from "@/lib/utils";

export type GoalFormState = { ok: boolean; message: string; errors?: Record<string, string[] | undefined> } | null;

const amount = z.preprocess((v) => (v === "" || v == null ? null : Number(String(v).replace(/,/g, ""))),
  z.number({ invalid_type_error: "Enter a number" }).min(0, "Must be zero or more").max(1e12).nullable());
const count = z.preprocess((v) => (v === "" || v == null ? null : Number(v)),
  z.number({ invalid_type_error: "Enter a whole number" }).int("Enter a whole number").min(0).max(1e6).nullable());

const goalSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}-01$/, "Choose a month"),
  income_target: amount,
  sales_target: amount,
  savings_target: amount,
  fiverr_target: amount,
  upwork_target: amount,
  freelance_other_target: amount,
  product_pv_target: amount,
  prospecting_target: count,
  recruitment_target: count,
  order_target: count,
  personal_development_target: z.string().trim().max(1000).optional(),
  prospecting_methods_other: z.string().trim().max(300).optional(),
  books: z.string().trim().max(1000).optional(),
  plan_text: z.string().trim().max(4000).optional(),
  intent: z.enum(["draft", "submit"]),
});

export async function saveGoalAction(_prev: GoalFormState, formData: FormData): Promise<GoalFormState> {
  const parsed = goalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  const v = parsed.data;

  const titles = formData.getAll("custom_title").map(String);
  const targets = formData.getAll("custom_target").map(String);
  const units = formData.getAll("custom_unit").map(String);
  const custom_goals = titles
    .map((title, i) => ({ title: title.trim().slice(0, 120), target: targets[i] ? Number(targets[i]) : null, unit: units[i]?.trim().slice(0, 30) || null }))
    .filter((g) => g.title);

  const allowed: readonly string[] = PROSPECTING_METHODS;
  const prospecting_methods = [...new Set(formData.getAll("prospecting_methods").map(String))].filter((m) => allowed.includes(m));

  // Savings, product sales and PV are required every month; everything else is optional.
  if (v.intent === "submit") {
    const errors: Record<string, string[]> = {};
    if (!(Number(v.savings_target) > 0)) errors.savings_target = ["Set how much you'll save this month"];
    if (!(Number(v.product_pv_target) > 0)) errors.product_pv_target = ["Set how many PV you'll sell"];
    if (!(Number(v.sales_target) > 0)) errors.sales_target = ["Set your product sales target (₦)"];
    if (Object.keys(errors).length) return { ok: false, message: "Savings and product sales targets are required. You can save a draft anytime.", errors };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase.from("monthly_goals").upsert({
    user_id: user.id,
    month: v.month,
    income_target: v.income_target,
    sales_target: v.sales_target,
    savings_target: v.savings_target,
    fiverr_target: v.fiverr_target,
    upwork_target: v.upwork_target,
    freelance_other_target: v.freelance_other_target,
    product_pv_target: v.product_pv_target,
    prospecting_target: v.prospecting_target,
    recruitment_target: v.recruitment_target,
    order_target: v.order_target,
    prospecting_methods,
    prospecting_methods_other: v.prospecting_methods_other || null,
    books: v.books || null,
    personal_development_target: v.personal_development_target || null,
    plan_text: v.plan_text || null,
    custom_goals,
    status: v.intent === "submit" ? "submitted" : "draft",
  }, { onConflict: "user_id,month" }).select("id").single();

  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  dispatchPushSoon();
  redirect(`/goals/${data.id}?saved=${v.intent}`);
}

export async function reviewGoalAction(_prev: GoalFormState, formData: FormData): Promise<GoalFormState> {
  const schema = z.object({
    goal_id: z.string().uuid(),
    action: z.enum(["comment", "approve", "request_revision"]),
    comment: z.string().trim().max(2000).optional(),
    action_steps: z.string().trim().max(2000).optional(),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Invalid review." };
  const v = parsed.data;
  if (v.action === "request_revision" && !v.comment) {
    return { ok: false, message: "Explain what should change.", errors: { comment: ["Tell the member what to revise"] } };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_goal", {
    p_goal: v.goal_id, p_action: v.action, p_comment: v.comment || null, p_steps: v.action_steps || null,
  });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath(`/goals/${v.goal_id}`);
  dispatchPushSoon();
  return { ok: true, message: v.action === "approve" ? "Goals approved. The member has been notified." : v.action === "request_revision" ? "Revision requested. The member has been notified." : "Feedback sent." };
}

export async function deleteDraftAction(goalId: string) {
  const supabase = await createClient();
  await supabase.from("monthly_goals").delete().eq("id", goalId).eq("status", "draft");
  revalidatePath("/goals");
  redirect("/goals");
}

export type GoalPlan = {
  summary: string;
  income_target: number | null; sales_target: number | null; savings_target: number | null;
  fiverr_target: number | null; upwork_target: number | null; freelance_other_target: number | null; product_pv_target: number | null;
  prospecting_target: number | null; recruitment_target: number | null; order_target: number | null;
  prospecting_methods: string[] | null; prospecting_methods_other: string | null; books: string | null;
  personal_development_target: string | null;
  actions: { title: string; target: number | null; unit: string | null }[];
};

const PLAN_TOOL = {
  name: "monthly_goal_plan",
  description: "The member's monthly goals turned into targets and a to-do list.",
  input_schema: {
    type: "object" as const,
    properties: {
      summary: { type: "string", description: "Two or three encouraging sentences summarising the plan, in second person." },
      income_target: { type: ["number", "null"], description: "Naira" },
      sales_target: { type: ["number", "null"], description: "Naira" },
      savings_target: { type: ["number", "null"], description: "Naira" },
      fiverr_target: { type: ["number", "null"], description: "Naira the member plans to earn on Fiverr" },
      upwork_target: { type: ["number", "null"], description: "Naira the member plans to earn on Upwork" },
      freelance_other_target: { type: ["number", "null"], description: "Naira from other freelancing (direct clients, other platforms)" },
      product_pv_target: { type: ["number", "null"], description: "Product sales in PV (point value)" },
      prospecting_target: { type: ["integer", "null"], description: "People to contact this month" },
      recruitment_target: { type: ["integer", "null"], description: "New team members this month (at least 3 is the usual minimum, no upper limit)" },
      order_target: { type: ["integer", "null"] },
      prospecting_methods: { type: ["array", "null"], items: { type: "string", enum: [...PROSPECTING_METHODS] }, description: "Prospecting methods the member mentioned" },
      prospecting_methods_other: { type: ["string", "null"], description: "Other prospecting methods not in the list" },
      books: { type: ["string", "null"], description: "Books the member plans to read, one per line" },
      personal_development_target: { type: ["string", "null"], description: "Other courses, skills or habits" },
      actions: {
        type: "array", maxItems: 8,
        description: "Concrete things to do this month, e.g. 'Invite 3 people every day' (target 90, unit people).",
        items: {
          type: "object",
          properties: { title: { type: "string" }, target: { type: ["number", "null"] }, unit: { type: ["string", "null"] } },
          required: ["title", "target", "unit"],
        },
      },
    },
    required: ["summary", "income_target", "sales_target", "savings_target", "fiverr_target", "upwork_target", "freelance_other_target", "product_pv_target",
      "prospecting_target", "recruitment_target", "order_target", "prospecting_methods", "prospecting_methods_other", "books", "personal_development_target", "actions"],
  },
};

/** Turns what the member typed or said into goal targets and a to-do list. */
export async function planGoalsAction(text: string): Promise<{ ok: boolean; message: string; plan?: GoalPlan }> {
  const input = z.string().trim().min(5, "Tell Maximus AI a bit more about your goals.").max(4000).safeParse(text);
  if (!input.success) return { ok: false, message: input.error.issues[0].message };
  if (!isAiConfigured()) return { ok: false, message: "Maximus AI is not configured yet." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  try {
    const res = await aiClient().messages.create({
      model: AI_MODEL,
      max_tokens: 6000,
      system: "You help members of Maximus, a Nigerian network-marketing and freelancing team, turn their monthly goals into clear targets and a practical to-do list. Use Naira. Only fill targets the member mentioned or clearly implied; use null otherwise. Savings, product sales (₦) and PV are required every month, so if they are missing add an action reminding the member to set them. Make actions specific, daily or weekly, and achievable. Never promise income. Always respond by calling the provided tool exactly once, with no other text.",
      tools: [PLAN_TOOL],
      tool_choice: { type: "auto" },
      messages: [{ role: "user", content: `My goals for this month, in my own words:\n\n${input.data}` }],
    });
    const block = res.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") return { ok: false, message: "Maximus AI couldn't build a plan. Please try again." };
    const plan = block.input as GoalPlan;
    plan.actions = (plan.actions ?? []).slice(0, 8);
    plan.prospecting_methods = (plan.prospecting_methods ?? []).filter((m) => (PROSPECTING_METHODS as readonly string[]).includes(m));
    return { ok: true, message: "Here's your plan. Check it, change anything, then save.", plan };
  } catch (err) {
    console.error("Goal planner failed", err);
    return { ok: false, message: aiErrorMessage(err) };
  }
}
