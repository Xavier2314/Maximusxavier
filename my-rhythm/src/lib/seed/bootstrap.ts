import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ACTIVITY_SEED, CATEGORY_SEED, HABIT_SEED, PODCAST_STAGES, buildSeedActivities } from "./routine";
import { must } from "../api";
import { todayIn, DEFAULT_TZ } from "../time";
import { log } from "../log";

/**
 * Idempotent first-run setup: profile, preferences, categories, habits,
 * podcast stages and the owner's real weekly routine with its reminder rules.
 * Re-running never creates duplicates (unique keys + existence checks).
 */
export async function bootstrapUser(sb: SupabaseClient, userId: string, email?: string | null) {
  const profileRes = await sb.from("profiles").select("id,seeded_at,timezone").eq("id", userId).maybeSingle();
  let profile = must(profileRes, "profile");
  if (!profile) {
    must(await sb.from("profiles").insert({ id: userId, display_name: (email ?? "friend").split("@")[0] }).select().single(), "create profile");
    profile = { id: userId, seeded_at: null, timezone: DEFAULT_TZ };
  }
  await sb.from("user_preferences").upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
  if (profile.seeded_at) return { seeded: false };

  must(
    await sb.from("activity_categories").upsert(
      CATEGORY_SEED.map((c) => ({ ...c, user_id: userId })),
      { onConflict: "user_id,key", ignoreDuplicates: true },
    ),
    "seed categories",
  );
  const cats = must(await sb.from("activity_categories").select("id,key").eq("user_id", userId), "categories") as { id: string; key: string }[];

  must(
    await sb.from("habits").upsert(
      HABIT_SEED.map((h, i) => ({ user_id: userId, name: h.name, icon: h.icon, color: h.color, target_per_week: h.target_per_week, position: i })),
      { onConflict: "user_id,name", ignoreDuplicates: true },
    ),
    "seed habits",
  );
  const habits = must(await sb.from("habits").select("id,name").eq("user_id", userId), "habits") as { id: string; name: string }[];
  const habitIdByKey = Object.fromEntries(HABIT_SEED.map((h) => [h.key, habits.find((x) => x.name === h.name)?.id ?? ""]));

  await sb.from("podcast_stages").upsert(
    PODCAST_STAGES.map((name, position) => ({ user_id: userId, name, position })),
    { onConflict: "user_id,name", ignoreDuplicates: true },
  );

  const existing = must(
    await sb.from("activities").select("dedupe_key").eq("user_id", userId).in("dedupe_key", ACTIVITY_SEED.map((s) => `seed:${s.slug}`)),
    "existing seed",
  ) as { dedupe_key: string }[];
  const have = new Set(existing.map((e) => e.dedupe_key));
  const built = buildSeedActivities(
    todayIn(profile.timezone || DEFAULT_TZ),
    Object.fromEntries(cats.map((c) => [c.key, c.id])),
    habitIdByKey,
    randomUUID,
  ).filter((b) => !have.has(b.activity.dedupe_key));

  if (built.length) {
    must(await sb.from("activities").insert(built.map((b) => ({ ...b.activity, user_id: userId }))), "seed activities");
    const rules = built.flatMap((b) =>
      b.rules.map((r) => ({ user_id: userId, activity_id: b.activity.id, anchor: r.anchor, offset_minutes: r.offset_minutes, message: r.message ?? null, enabled: r.enabled ?? true })),
    );
    if (rules.length) must(await sb.from("reminder_rules").insert(rules), "seed reminder rules");
  }
  must(await sb.from("profiles").update({ seeded_at: new Date().toISOString() }).eq("id", userId), "mark seeded");
  log.info("bootstrap.seeded", { activities: built.length });
  return { seeded: true, activities: built.length };
}
