"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

export type PlannerState = { ok: boolean; message: string; errors?: Record<string, string[] | undefined> } | null;

const taskSchema = z.object({
  title: z.string().trim().min(1, "What do you need to do?").max(200),
  notes: z.string().trim().max(2000).optional(),
  category: z.enum(["prospecting", "follow_up", "training", "sales", "team", "personal", "other"]).default("other"),
  priority: z.coerce.number().int().min(1).max(3).default(2),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  repeat: z.enum(["none", "daily", "weekly"]).default("none"),
  member_id: z.string().uuid().optional(),
});

function refresh() {
  revalidatePath("/planner");
  revalidatePath("/dashboard");
}

/** Add a task for yourself, or (leaders) give a task to someone in your team. */
export async function addTaskAction(_prev: PlannerState, formData: FormData): Promise<PlannerState> {
  const parsed = taskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please check the task.", errors: parsed.error.flatten().fieldErrors };
  const v = parsed.data;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  const forOther = v.member_id && v.member_id !== user.id;
  const { error } = await supabase.from("tasks").insert({
    user_id: forOther ? v.member_id : user.id,
    assigned_by: forOther ? user.id : null,
    title: v.title, notes: v.notes || null, category: v.category, priority: v.priority,
    due_date: v.due_date || null, repeat: v.repeat,
  });
  if (error) return { ok: false, message: forOther ? "You can only give tasks to people in your team." : friendlyError(error) };
  refresh();
  if (forOther) revalidatePath(`/team/${v.member_id}`);
  return { ok: true, message: forOther ? "Task sent. They've been notified." : "Task added." };
}

export async function toggleTaskAction(id: string, done: boolean) {
  const supabase = await createClient();
  const { error } = done
    ? await supabase.rpc("complete_task", { p_id: id })
    : await supabase.from("tasks").update({ completed_at: null }).eq("id", id);
  if (error) return { ok: false, message: friendlyError(error) };
  refresh();
  return { ok: true, message: done ? "Done!" : "Marked as not done." };
}

export async function moveTasksAction(ids: string[], dueDate: string | null) {
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return { ok: false, message: "Invalid date." };
  const clean = ids.filter((x) => /^[0-9a-f-]{36}$/.test(x)).slice(0, 200);
  if (clean.length === 0) return { ok: true, message: "Nothing to move." };
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({ due_date: dueDate }).in("id", clean).is("completed_at", null);
  if (error) return { ok: false, message: friendlyError(error) };
  refresh();
  return { ok: true, message: clean.length === 1 ? "Task moved." : `${clean.length} tasks moved.` };
}

export async function deleteTaskAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return { ok: false, message: friendlyError(error) };
  refresh();
  return { ok: true, message: "Task deleted." };
}
