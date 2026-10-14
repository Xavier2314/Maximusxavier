import { z } from "zod";
import { body, must, route } from "@/lib/api";
import { normalizePrefs } from "@/lib/data";
import { syncAfterChange } from "@/lib/reminders/sync";
import { aiConfigured } from "@/lib/ai/claude";
import { pushConfigured } from "@/lib/push/send";
import type { Preferences } from "@/lib/types";

const hhmm = z.string().regex(/^\d{2}:\d{2}$/);
const Window = z.object({ days: z.array(z.number().int().min(1).max(7)), start: hhmm, end: hhmm, label: z.string().max(80).optional() });
const Patch = z
  .object({
    theme: z.enum(["system", "light", "dark"]),
    notifications_enabled: z.boolean(),
    bedtime_reminders_enabled: z.boolean(),
    wind_down_minutes: z.number().int().min(0).max(180),
    daily_agenda_enabled: z.boolean(),
    daily_agenda_time: hhmm,
    weekly_review_enabled: z.boolean(),
    in_app_sound_enabled: z.boolean(),
    in_app_sound: z.enum(["chime", "bell", "pulse", "gentle"]),
    ai_enabled: z.boolean(),
    max_daily_hours: z.number().min(4).max(18),
    min_buffer_minutes: z.number().int().min(0).max(120),
    focus_hours: z.array(Window).max(10),
    protected_rest: z.array(Window).max(10),
    priorities: z.array(z.string().min(1).max(120)).max(10),
  })
  .partial();

export const GET = route(async (_req, { supabase, user }) => {
  const p = must(await supabase.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle(), "prefs") as Preferences | null;
  return { preferences: normalizePrefs(p), services: { ai: aiConfigured(), push: pushConfigured(), cron: !!process.env.CRON_SECRET } };
});

export const PATCH = route(async (req, { supabase, user }) => {
  const patch = await body(req, Patch);
  const saved = must(await supabase.from("user_preferences").update(patch).eq("user_id", user.id).select().single(), "save prefs");
  await syncAfterChange(supabase, user.id);
  return { preferences: normalizePrefs(saved as Preferences) };
});
