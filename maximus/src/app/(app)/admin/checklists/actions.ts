"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AI_MODEL, aiClient, aiErrorMessage, isAiConfigured } from "@/lib/ai";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: boolean; message: string; id?: string };

const pushSchema = z.object({
  title: z.string().trim().min(1, "Give the checklist a title.").max(160),
  due: z.string().optional(),
  items: z.array(z.object({
    title: z.string().trim().min(1, "Every item needs a name.").max(200),
    minutes: z.number().int().min(1).max(1440),
  })).min(1, "Add at least one item.").max(30),
  users: z.array(z.string().uuid()).nullable(),
});

/** Push a timed checklist to everyone (users null) or to the chosen members. Super admins only. */
export async function pushChecklistAction(input: z.input<typeof pushSchema>): Promise<Result> {
  const viewer = await requireViewer();
  if (!viewer.roles.includes("super_admin")) return { ok: false, message: "Only super admins can push checklists." };
  const parsed = pushSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const v = parsed.data;
  if (v.users && !v.users.length) return { ok: false, message: "Pick at least one person, or send it to everyone." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("push_checklist", {
    p_title: v.title, p_due: v.due ? new Date(v.due).toISOString() : null, p_items: v.items, p_users: v.users,
  });
  if (error) {
    console.error("Push checklist failed", error);
    return { ok: false, message: error.message.includes("active member") ? "None of those people are active members." : "Couldn't push the checklist. Please try again." };
  }
  revalidatePath("/admin/checklists");
  return { ok: true, message: "Checklist pushed.", id: data as string };
}

/** Remind everyone who hasn't finished a pushed checklist. */
export async function remindChecklistAction(id: string): Promise<Result> {
  const viewer = await requireViewer();
  if (!viewer.roles.includes("super_admin") || !z.string().uuid().safeParse(id).success) return { ok: false, message: "Not allowed." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("remind_checklist", { p_checklist: id });
  if (error) return { ok: false, message: "Couldn't send reminders." };
  const n = Number(data ?? 0);
  return { ok: true, message: n ? `Reminder sent to ${n} ${n === 1 ? "person" : "people"}.` : "Everyone has finished. No reminders needed." };
}

/** Withdraw a pushed checklist from everyone's Home. */
export async function deleteChecklistAction(id: string): Promise<Result> {
  const viewer = await requireViewer();
  if (!viewer.roles.includes("super_admin") || !z.string().uuid().safeParse(id).success) return { ok: false, message: "Not allowed." };
  const supabase = await createClient();
  const { error } = await supabase.from("pushed_checklists").delete().eq("id", id);
  if (error) return { ok: false, message: "Couldn't withdraw it." };
  revalidatePath("/admin/checklists");
  revalidatePath("/dashboard");
  return { ok: true, message: "Checklist withdrawn." };
}

/** A member's timer on one item: start (pausing any other running item), pause, resume or finish. */
export async function checklistTimerAction(itemId: string, op: "start" | "pause" | "resume" | "done" | "undo"): Promise<Result> {
  if (!z.string().uuid().safeParse(itemId).success) return { ok: false, message: "Unknown item." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  const now = new Date().toISOString();
  const { data: item } = await supabase.from("pushed_checklist_items").select("checklist_id").eq("id", itemId).maybeSingle();
  if (!item) return { ok: false, message: "This checklist is no longer available." };
  const { data: cur } = await supabase.from("pushed_checklist_progress").select("*").eq("item_id", itemId).eq("user_id", user.id).maybeSingle();

  const pauseRow = (p: { paused_at: string | null }) => (p.paused_at ? {} : { paused_at: now });
  const resumeRow = (p: { paused_at: string | null; paused_seconds: number }) => p.paused_at
    ? { paused_at: null, paused_seconds: p.paused_seconds + Math.round((Date.parse(now) - Date.parse(p.paused_at)) / 1000) }
    : {};

  let error = null;
  if (op === "start" || op === "resume") {
    // Only one timer runs at a time: pause any other item that's running on this checklist.
    const { data: siblings } = await supabase.from("pushed_checklist_items").select("id").eq("checklist_id", item.checklist_id).neq("id", itemId);
    const ids = (siblings ?? []).map((s) => s.id);
    if (ids.length) {
      await supabase.from("pushed_checklist_progress").update({ paused_at: now }).eq("user_id", user.id).in("item_id", ids)
        .not("started_at", "is", null).is("paused_at", null).is("completed_at", null);
    }
    if (!cur) ({ error } = await supabase.from("pushed_checklist_progress").insert({ item_id: itemId, user_id: user.id, started_at: now }));
    else if (!cur.started_at) ({ error } = await supabase.from("pushed_checklist_progress").update({ started_at: now }).eq("item_id", itemId).eq("user_id", user.id));
    else ({ error } = await supabase.from("pushed_checklist_progress").update({ ...resumeRow(cur), completed_at: null }).eq("item_id", itemId).eq("user_id", user.id));
  } else if (op === "pause") {
    if (cur && !cur.completed_at) ({ error } = await supabase.from("pushed_checklist_progress").update(pauseRow(cur)).eq("item_id", itemId).eq("user_id", user.id));
  } else if (op === "done") {
    if (!cur) ({ error } = await supabase.from("pushed_checklist_progress").insert({ item_id: itemId, user_id: user.id, started_at: now, completed_at: now }));
    else ({ error } = await supabase.from("pushed_checklist_progress").update({ ...resumeRow(cur), completed_at: now }).eq("item_id", itemId).eq("user_id", user.id));
  } else if (op === "undo" && cur) {
    ({ error } = await supabase.from("pushed_checklist_progress").update({ completed_at: null, paused_at: now }).eq("item_id", itemId).eq("user_id", user.id));
  }
  if (error) {
    console.error("Checklist timer failed", error);
    return { ok: false, message: "Couldn't save that. Please try again." };
  }
  revalidatePath("/dashboard");
  return { ok: true, message: "Saved." };
}

export type ArrangedChecklist = { title: string | null; items: { title: string; minutes: number | null }[] };

const CHECKLIST_TOOL = {
  name: "checklist",
  description: "A checklist to push to members, with a time for each item.",
  input_schema: {
    type: "object" as const,
    properties: {
      title: { type: ["string", "null"], description: "Short title, if the admin gave or clearly implied one" },
      items: {
        type: "array", maxItems: 30,
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "The task, in the admin's words, lightly tidied" },
            minutes: { type: ["integer", "null"], description: "Time for this item in minutes, only if the admin said it ('one hour' = 60)" },
          },
          required: ["title", "minutes"],
        },
      },
    },
    required: ["title", "items"],
  },
};

/** Turns what the admin said or typed into a checklist title and timed items. Nothing is added they didn't say. */
export async function arrangeChecklistAction(text: string): Promise<{ ok: boolean; message: string; checklist?: ArrangedChecklist }> {
  const viewer = await requireViewer();
  if (!viewer.roles.includes("super_admin")) return { ok: false, message: "Only super admins can push checklists." };
  const input = z.string().trim().min(3, "Say a bit more about the checklist.").max(4000).safeParse(text);
  if (!input.success) return { ok: false, message: input.error.issues[0].message };
  if (!isAiConfigured()) return { ok: false, message: "Maximus AI is not configured yet." };
  try {
    const res = await aiClient().messages.create({
      model: AI_MODEL,
      max_tokens: 8000,
      system: "You turn what an admin of Maximus, a Nigerian network-marketing and freelancing team, says (often spoken, informal) into a checklist to push to members. One item per task they mentioned, in their order. Use only the times they said ('one hour' = 60, 'thirty minutes' = 30, 'two and a half hours' = 150); use null when they gave no time. Never add tasks they did not mention. Always answer by calling the checklist tool exactly once; never reply in plain text.",
      tools: [CHECKLIST_TOOL],
      tool_choice: { type: "auto" }, // forced tool choice is rejected by current models; the instruction above asks for the tool
      messages: [{ role: "user", content: input.data }],
    });
    const block = res.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") return { ok: false, message: "Maximus AI couldn't arrange that. Please try again." };
    const raw = block.input as ArrangedChecklist;
    const items = (raw.items ?? []).filter((i) => i.title?.trim()).slice(0, 30)
      .map((i) => ({ title: i.title.trim().slice(0, 200), minutes: i.minutes && i.minutes > 0 ? Math.min(1440, Math.round(i.minutes)) : null }));
    if (!items.length) return { ok: false, message: "Maximus AI didn't find any tasks in that. Try saying them one by one." };
    return { ok: true, message: "Here's your checklist. Check the times, choose who gets it, then push.", checklist: { title: raw.title?.trim().slice(0, 160) || null, items } };
  } catch (err) {
    console.error("Checklist arranger failed", err);
    return { ok: false, message: aiErrorMessage(err) };
  }
}
