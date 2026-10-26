import { z } from "zod";
import { body, route } from "@/lib/api";
import { duplicateActivity } from "@/lib/schedule/edit";
import { syncAfterChange } from "@/lib/reminders/sync";

export const POST = route<{ id: string }>(async (req, { supabase, user }, { id }) => {
  const input = await body(req, z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }));
  const res = await duplicateActivity(supabase, user.id, id, input.date);
  await syncAfterChange(supabase, user.id);
  return res;
});
