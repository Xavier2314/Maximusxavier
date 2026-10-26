import { route } from "@/lib/api";
import { bootstrapUser } from "@/lib/seed/bootstrap";
import { syncAfterChange } from "@/lib/reminders/sync";

export const POST = route(async (_req, { supabase, user }) => {
  const result = await bootstrapUser(supabase, user.id, user.email);
  if (result.seeded) await syncAfterChange(supabase, user.id);
  return result;
});
