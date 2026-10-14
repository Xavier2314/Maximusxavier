import { z } from "zod";
import { body, HttpError, route } from "@/lib/api";

const WIPE = [
  "schedule_change_history", "schedule_proposals", "ai_messages", "ai_conversations", "notification_delivery_logs", "scheduled_reminders",
  "habit_completions", "habits", "podcast_tasks", "podcast_episodes", "podcast_stages", "practice_tasks", "music_items",
  "keyboard_practice_sessions", "keyboard_lessons", "gym_workout_sets", "gym_workouts", "gym_exercises", "saved_verses", "reflections",
  "prayer_journal", "bible_reading_progress", "bible_reading_plans", "reminder_rules", "activity_completions", "activity_exceptions",
  "activities", "trips", "activity_categories", "push_subscriptions",
];

/** Permanently delete all personal data (your login remains). Requires typing DELETE. */
export const DELETE = route(async (req, { supabase, user }) => {
  const { confirm } = await body(req, z.object({ confirm: z.string() }));
  if (confirm !== "DELETE") throw new HttpError(400, "Type DELETE to confirm");
  for (const t of WIPE) await supabase.from(t).delete().eq("user_id", user.id);
  await supabase.from("profiles").update({ seeded_at: null }).eq("id", user.id);
  return { ok: true };
});
