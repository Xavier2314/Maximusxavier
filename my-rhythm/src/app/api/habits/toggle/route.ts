import { z } from "zod";
import { body, must, route } from "@/lib/api";

/** Manually record (or remove) a habit for a day — an explicit user action. */
export const POST = route(async (req, { supabase, user }) => {
  const input = await body(req, z.object({ habitId: z.string().uuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), done: z.boolean(), minutes: z.number().int().min(0).max(1440).optional() }));
  if (input.done) {
    must(await supabase.from("habit_completions").upsert({ user_id: user.id, habit_id: input.habitId, completed_on: input.date, minutes: input.minutes ?? null, note: "manual" }, { onConflict: "habit_id,completed_on" }), "record habit");
  } else {
    must(await supabase.from("habit_completions").delete().eq("habit_id", input.habitId).eq("completed_on", input.date), "remove habit");
  }
  return { ok: true };
});
