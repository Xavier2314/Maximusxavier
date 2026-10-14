import { z } from "zod";
import { body, must, route } from "@/lib/api";
import { syncAfterChange } from "@/lib/reminders/sync";

const Patch = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(40).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  priority_rank: z.number().int().min(1).max(9).optional(),
  notify: z.boolean().optional(),
  default_reminders: z.array(z.object({ anchor: z.enum(["start", "end"]), offset_minutes: z.number().int().min(-10080).max(1440) })).max(8).optional(),
});

export const GET = route(async (_req, { supabase, user }) => ({
  categories: must(await supabase.from("activity_categories").select("*").eq("user_id", user.id).order("priority_rank"), "categories"),
}));

export const PATCH = route(async (req, { supabase, user }) => {
  const { id, ...patch } = await body(req, Patch);
  const saved = must(await supabase.from("activity_categories").update(patch).eq("id", id).select().single(), "save category");
  await syncAfterChange(supabase, user.id);
  return { category: saved };
});
