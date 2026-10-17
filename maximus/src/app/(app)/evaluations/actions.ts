"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

export type EvalFormState = { ok: boolean; message: string; errors?: Record<string, string[] | undefined> } | null;

const int = z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)),
  z.number({ invalid_type_error: "Enter a number" }).int("Whole numbers only").min(0, "Can't be negative").max(100000));

const schema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  period_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  earnings: z.preprocess((v) => (v === "" || v == null ? 0 : Number(String(v).replace(/,/g, ""))),
    z.number({ invalid_type_error: "Enter an amount" }).min(0, "Can't be negative").max(1e12)),
  prospects: int,
  presentations: int,
  follow_ups: int,
  orders_generated: int,
  new_joins: int,
  members_supported: int,
  challenges: z.string().trim().max(2000).optional(),
  priorities: z.string().trim().min(3, "Share at least one priority for the next five days").max(2000),
  support_needed: z.string().trim().max(2000).optional(),
});

export async function saveEvaluationAction(_prev: EvalFormState, formData: FormData): Promise<EvalFormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  const { id, ...v } = parsed.data;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const row = { ...v, challenges: v.challenges || null, support_needed: v.support_needed || null };

  const { data, error } = id
    ? await supabase.from("evaluations").update(row).eq("id", id).select("id").single()
    : await supabase.from("evaluations").insert({ ...row, user_id: user.id }).select("id").single();
  if (error) {
    if (error.code === "23505") return { ok: false, message: "You've already submitted this evaluation. Open it from your history to edit." };
    return { ok: false, message: friendlyError(error) };
  }
  revalidatePath("/evaluations");
  revalidatePath("/dashboard");
  redirect(`/evaluations/${data.id}?saved=1`);
}

export async function addEvaluationFeedbackAction(_prev: EvalFormState, formData: FormData): Promise<EvalFormState> {
  const parsed = z.object({ evaluation_id: z.string().uuid(), comment: z.string().trim().min(1, "Write some feedback").max(2000) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Write some feedback first.", errors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("evaluation_feedback").insert({ ...parsed.data, author_id: user?.id });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath(`/evaluations/${parsed.data.evaluation_id}`);
  return { ok: true, message: "Feedback sent." };
}
