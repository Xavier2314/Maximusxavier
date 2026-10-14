import { z } from "zod";
import { body, HttpError, must, route } from "@/lib/api";
import { ActivityPatchSchema, deleteActivity, editActivity } from "@/lib/schedule/edit";
import { syncAfterChange } from "@/lib/reminders/sync";

export const GET = route<{ id: string }>(async (_req, { supabase }, { id }) => {
  const a = must(await supabase.from("activities").select("*, reminder_rules(*)").eq("id", id).maybeSingle(), "load activity");
  if (!a) throw new HttpError(404, "Not found");
  return { activity: a };
});

const PatchInput = z.object({
  scope: z.enum(["all", "this", "following"]).default("all"),
  occurrenceDate: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  changes: ActivityPatchSchema,
});

export const PATCH = route<{ id: string }>(async (req, { supabase, user }, { id }) => {
  const input = await body(req, PatchInput);
  const res = await editActivity(supabase, user.id, id, input.scope, input.changes,
    input.occurrenceDate ? { date: input.occurrenceDate, start: input.start, end: input.end } : undefined);
  await syncAfterChange(supabase, user.id);
  return res;
});

export const DELETE = route<{ id: string }>(async (req, { supabase, user }, { id }) => {
  const url = new URL(req.url);
  const scope = (url.searchParams.get("scope") ?? "all") as "all" | "this" | "following";
  if (!["all", "this", "following"].includes(scope)) throw new HttpError(400, "Bad scope");
  const res = await deleteActivity(supabase, user.id, id, scope, url.searchParams.get("date") ?? undefined);
  await syncAfterChange(supabase, user.id);
  return res;
});
