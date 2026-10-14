import { NextResponse } from "next/server";
import { route } from "@/lib/api";

const EXPORT_TABLES = [
  "profiles", "user_preferences", "activity_categories", "activities", "activity_exceptions", "activity_completions", "reminder_rules",
  "bible_reading_plans", "bible_reading_progress", "prayer_journal", "reflections", "saved_verses", "gym_exercises", "gym_workouts",
  "gym_workout_sets", "keyboard_lessons", "keyboard_practice_sessions", "music_items", "practice_tasks", "podcast_stages",
  "podcast_episodes", "podcast_tasks", "habits", "habit_completions", "trips", "ai_conversations", "ai_messages",
  "schedule_proposals", "schedule_change_history",
];

/** Full private backup of your data as JSON (download). */
export const GET = route(async (_req, { supabase, user }) => {
  const out: Record<string, unknown> = { app: "MY RHYTHM", version: 1, exported_at: new Date().toISOString() };
  for (const t of EXPORT_TABLES) {
    const col = t === "profiles" ? "id" : "user_id";
    const { data } = await supabase.from(t).select("*").eq(col, user.id);
    out[t] = data ?? [];
  }
  return new NextResponse(JSON.stringify(out, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="my-rhythm-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
