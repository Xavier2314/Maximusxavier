import { z } from "zod";
import { body, route } from "@/lib/api";
import { undoBatch } from "@/lib/schedule/apply";
import { syncAfterChange } from "@/lib/reminders/sync";

export const POST = route(async (req, { supabase, user }) => {
  const { batchId } = await body(req, z.object({ batchId: z.string().uuid() }));
  const res = await undoBatch(supabase, user.id, batchId);
  await syncAfterChange(supabase, user.id);
  return res;
});
