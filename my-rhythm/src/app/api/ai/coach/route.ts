import { z } from "zod";
import { body, route } from "@/lib/api";
import { coachLines } from "@/lib/ai/claude";

const Input = z.object({ task: z.string().trim().max(120).default("your task"), minutes: z.number().int().min(1).max(720).nullable().default(null) });

/** AI-written lines for the timer voice coach (null → the app uses its built-in lines). */
export const POST = route(async (req, { supabase, user }) => {
  const { task, minutes } = await body(req, Input);
  const [{ data: prefs }, { data: profile }] = await Promise.all([
    supabase.from("user_preferences").select("ai_enabled").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
  ]);
  if (prefs && !prefs.ai_enabled) return { lines: null };
  return { lines: await coachLines(task || "your task", minutes, (profile?.display_name ?? "").split(" ")[0]) };
});
