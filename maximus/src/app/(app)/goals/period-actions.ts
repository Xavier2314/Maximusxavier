"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AI_MODEL, aiClient, aiErrorMessage, isAiConfigured } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";
import { GOAL_CATEGORIES } from "@/lib/tools";
import { todayIn } from "@/lib/utils";

export type Period = "weekly" | "daily";
export type PeriodGoal = { title: string; target: number | null; unit: string | null; category: string };

const CATEGORY_KEYS = GOAL_CATEGORIES.map((c) => c.key) as string[];

const PERIOD_TOOL = {
  name: "period_goals",
  description: "The member's goals for this week or today, as a list.",
  input_schema: {
    type: "object" as const,
    properties: {
      goals: {
        type: "array", maxItems: 12,
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Short goal in the member's words, e.g. 'Invite people to the opportunity meeting'" },
            target: { type: ["number", "null"], description: "The number they said, if any" },
            unit: { type: ["string", "null"], description: "What the number counts, e.g. 'people', '₦', 'pages'" },
            category: { type: "string", enum: CATEGORY_KEYS },
          },
          required: ["title", "target", "unit", "category"],
        },
      },
    },
    required: ["goals"],
  },
};

/** Turns what the member said into a list of goals for this week or today. Nothing is added that they didn't say. */
export async function planPeriodGoalsAction(text: string, period: Period, current: string[]): Promise<{ ok: boolean; message: string; goals?: PeriodGoal[] }> {
  const input = z.string().trim().min(3, "Tell Maximus AI a bit more.").max(4000).safeParse(text);
  if (!input.success) return { ok: false, message: input.error.issues[0].message };
  if (!isAiConfigured()) return { ok: false, message: "Maximus AI is not configured yet." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  const when = period === "weekly" ? "this week" : "today";
  try {
    const res = await aiClient().messages.create({
      model: AI_MODEL,
      max_tokens: 8000,
      system: `You turn what a member of Maximus, a Nigerian network-marketing and freelancing team, says (often spoken, informal, mixed English and Pidgin) into a list of goals for ${when}. One goal per thing they said. Set only what they said: never add goals, targets or reminders they did not mention. Keep their own words, lightly tidied. Convert '50k' to 50000. Always answer by calling the period_goals tool exactly once; never reply in plain text.`,
      tools: [PERIOD_TOOL],
      tool_choice: { type: "auto" }, // forced tool choice is rejected by current models; the instruction above asks for the tool
      messages: [{ role: "user", content: current.length
        ? `My goals for ${when} so far:\n${current.slice(0, 30).map((t) => `- ${t}`).join("\n")}\n\nAdd these (list only the new ones):\n\n${input.data}`
        : `My goals for ${when}, in my own words:\n\n${input.data}` }],
    });
    const block = res.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") return { ok: false, message: "Maximus AI couldn't arrange that. Please try again." };
    const goals = ((block.input as { goals?: PeriodGoal[] }).goals ?? []).slice(0, 12)
      .filter((g) => g.title?.trim())
      .map((g) => ({ title: g.title.trim().slice(0, 160), target: g.target && g.target > 0 ? g.target : null, unit: g.unit?.trim().slice(0, 30) || null,
        category: CATEGORY_KEYS.includes(g.category) ? g.category : "other" }));
    if (!goals.length) return { ok: false, message: "Maximus AI didn't find a goal in that. Try saying it another way." };
    return { ok: true, message: "Here's your draft. Change anything, then save.", goals };
  } catch (err) {
    console.error("Period goal planner failed", err);
    return { ok: false, message: aiErrorMessage(err) };
  }
}

const goalSchema = z.object({
  title: z.string().trim().min(1, "Every goal needs a name.").max(160),
  target: z.number().positive().max(1e9).nullable(),
  unit: z.string().trim().max(30).nullable(),
  category: z.string().refine((c) => CATEGORY_KEYS.includes(c)),
});

/** Saves the draft as goals for this week (until Sunday) or for today. */
export async function savePeriodGoalsAction(period: Period, goals: PeriodGoal[]): Promise<{ ok: boolean; message: string }> {
  const parsed = z.array(goalSchema).min(1, "Add at least one goal.").max(12).safeParse(goals);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", user.id).single();
  const today = todayIn(profile?.timezone ?? undefined);
  const deadline = period === "daily" ? today : endOfWeek(today);
  const rows = parsed.data.map((g) => ({
    title: g.title, target: g.target, unit: g.unit, category: g.category, horizon: period, start_date: today, deadline, priority: 2,
  }));
  const { error } = await supabase.from("tool_goals").insert(rows);
  if (error) {
    console.error("Saving period goals failed", error);
    return { ok: false, message: "Couldn't save your goals. Please try again." };
  }
  revalidatePath("/goals");
  revalidatePath("/daily");
  revalidatePath("/tools", "layout");
  return { ok: true, message: rows.length === 1 ? "Goal saved." : `${rows.length} goals saved.` };
}

/** Marks a weekly or daily goal done (or not done). */
export async function togglePeriodGoalAction(id: string, done: boolean): Promise<{ ok: boolean; message: string }> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, message: "Unknown goal." };
  const supabase = await createClient();
  const { error } = await supabase.from("tool_goals")
    .update({ status: done ? "completed" : "active", completed_at: done ? new Date().toISOString() : null }).eq("id", id);
  if (error) return { ok: false, message: "Couldn't update that goal." };
  revalidatePath("/goals");
  revalidatePath("/daily");
  return { ok: true, message: done ? "Done." : "Marked as not done." };
}

/** The Sunday that ends the week containing `day` (YYYY-MM-DD). */
function endOfWeek(day: string) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + ((7 - d.getUTCDay()) % 7));
  return d.toISOString().slice(0, 10);
}

/** Clears every goal for this week or for today, so the member can start over. */
export async function deleteAllPeriodGoalsAction(period: Period): Promise<{ ok: boolean; message: string }> {
  if (period !== "weekly" && period !== "daily") return { ok: false, message: "Unknown period." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", user.id).single();
  const today = todayIn(profile?.timezone ?? undefined);
  const { error, count } = await supabase.from("tool_goals").delete({ count: "exact" })
    .eq("user_id", user.id).eq("horizon", period).lte("start_date", today).gte("deadline", today);
  if (error) return { ok: false, message: "Couldn't delete your goals. Please try again." };
  revalidatePath("/goals");
  revalidatePath("/daily");
  revalidatePath("/dashboard");
  return { ok: true, message: count ? `Deleted ${count} ${count === 1 ? "goal" : "goals"}. Start again whenever you're ready.` : "There were no goals to delete." };
}
