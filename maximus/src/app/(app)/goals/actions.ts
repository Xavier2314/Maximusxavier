"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
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
  prospecting_target: count,
  recruitment_target: count,
  order_target: count,
  personal_development_target: z.string().trim().max(1000).optional(),
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

  const hasAny = [v.income_target, v.sales_target, v.savings_target, v.prospecting_target, v.recruitment_target, v.order_target].some((x) => x != null && x > 0)
    || Boolean(v.personal_development_target) || custom_goals.length > 0;
  if (v.intent === "submit" && !hasAny) return { ok: false, message: "Add at least one target before submitting." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase.from("monthly_goals").upsert({
    user_id: user.id,
    month: v.month,
    income_target: v.income_target,
    sales_target: v.sales_target,
    savings_target: v.savings_target,
    prospecting_target: v.prospecting_target,
    recruitment_target: v.recruitment_target,
    order_target: v.order_target,
    personal_development_target: v.personal_development_target || null,
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
