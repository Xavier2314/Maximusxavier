/**
 * Whitelist for the generic module CRUD API. Only these tables/columns can be
 * read or written through /api/data; user_id is always forced server-side and
 * RLS guarantees isolation regardless.
 */
export const TABLES: Record<string, { fields: string[]; order: string; asc?: boolean }> = {
  prayer_journal: { fields: ["entry_date", "title", "body", "answered", "answered_at"], order: "entry_date" },
  reflections: { fields: ["entry_date", "kind", "title", "body", "scripture_refs"], order: "entry_date" },
  saved_verses: { fields: ["reference", "verse_text", "translation", "note"], order: "created_at" },
  bible_reading_plans: { fields: ["name", "start_date", "days", "books", "schedule", "active"], order: "created_at" },
  bible_reading_progress: { fields: ["plan_id", "book", "chapter", "read_on"], order: "read_on" },
  gym_exercises: { fields: ["name", "muscle_group", "equipment", "notes"], order: "name", asc: true },
  gym_workouts: { fields: ["workout_date", "activity_id", "workout_type", "duration_minutes", "energy", "notes", "recovery_notes"], order: "workout_date" },
  gym_workout_sets: { fields: ["workout_id", "exercise_name", "set_number", "reps", "weight_kg", "duration_seconds", "rest_seconds"], order: "created_at", asc: true },
  keyboard_lessons: { fields: ["lesson_date", "activity_id", "attended", "topics", "teacher_feedback", "improvement_areas", "notes"], order: "lesson_date" },
  keyboard_practice_sessions: { fields: ["practice_date", "started_at", "duration_minutes", "focus", "notes", "activity_id"], order: "practice_date" },
  music_items: { fields: ["kind", "name", "details", "status", "achieved_on"], order: "created_at" },
  practice_tasks: { fields: ["lesson_id", "title", "due_date", "done"], order: "created_at" },
  podcast_stages: { fields: ["name", "position"], order: "position", asc: true },
  podcast_episodes: { fields: ["title", "stage", "idea", "research_notes", "outline", "script", "recording_checklist", "editing_checklist", "deadline", "publish_date", "published_at"], order: "updated_at" },
  podcast_tasks: { fields: ["episode_id", "title", "due_date", "done", "activity_id"], order: "created_at", asc: true },
  habits: { fields: ["name", "icon", "color", "target_per_week", "active", "position"], order: "position", asc: true },
  habit_completions: { fields: ["habit_id", "completed_on", "minutes", "note"], order: "completed_on" },
  trips: { fields: ["destination", "travel_method", "travel_duration_minutes", "prep_minutes", "accommodation_notes", "itinerary", "status"], order: "depart_at" },
};

export const READ_EXTRA = ["id", "created_at", "updated_at", "depart_at", "return_at", "activity_id", "proposal_id"];

export function pick(table: string, input: Record<string, unknown>): Record<string, unknown> {
  const def = TABLES[table];
  const out: Record<string, unknown> = {};
  for (const k of def.fields) if (k in input) out[k] = input[k];
  return out;
}
