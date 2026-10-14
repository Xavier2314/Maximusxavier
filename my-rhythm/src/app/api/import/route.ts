import { HttpError, route } from "@/lib/api";
import { syncAfterChange } from "@/lib/reminders/sync";

// Restore order respects foreign keys.
const ORDER = [
  "activity_categories", "habits", "trips", "activities", "activity_exceptions", "activity_completions", "reminder_rules",
  "bible_reading_plans", "bible_reading_progress", "prayer_journal", "reflections", "saved_verses", "gym_exercises", "gym_workouts",
  "gym_workout_sets", "keyboard_lessons", "keyboard_practice_sessions", "music_items", "practice_tasks", "podcast_stages",
  "podcast_episodes", "podcast_tasks", "habit_completions",
];

/** Restore a MY RHYTHM backup (merge by id). Rows are always re-owned by the signed-in user. */
export const POST = route(async (req, { supabase, user }) => {
  const text = await req.text();
  if (text.length > 15_000_000) throw new HttpError(413, "Backup is too large");
  let backup: Record<string, unknown>;
  try {
    backup = JSON.parse(text);
  } catch {
    throw new HttpError(400, "Not a valid backup file");
  }
  if (backup.app !== "MY RHYTHM") throw new HttpError(400, "Not a MY RHYTHM backup");
  const counts: Record<string, number> = {};
  for (const t of ORDER) {
    const rows = Array.isArray(backup[t]) ? (backup[t] as Record<string, unknown>[]) : [];
    if (!rows.length) continue;
    const clean = rows.map((r) => ({ ...r, user_id: user.id }));
    for (let i = 0; i < clean.length; i += 500) {
      const { error } = await supabase.from(t).upsert(clean.slice(i, i + 500), { onConflict: "id" });
      if (error) throw new HttpError(400, `Could not restore ${t}: ${error.message}`);
    }
    counts[t] = rows.length;
  }
  await syncAfterChange(supabase, user.id);
  return { restored: counts };
});
