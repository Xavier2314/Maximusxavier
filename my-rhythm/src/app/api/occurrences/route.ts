import { body, route } from "@/lib/api";
import { OccurrenceActionSchema, performOccurrenceAction } from "@/lib/schedule/actions";
import { syncAfterChange } from "@/lib/reminders/sync";

/** Start / complete / skip / undo / snooze / reschedule one occurrence. */
export const POST = route(async (req, { supabase, user }) => {
  const input = await body(req, OccurrenceActionSchema);
  const result = await performOccurrenceAction(supabase, user.id, input);
  if (input.action !== "snooze") await syncAfterChange(supabase, user.id);
  return { result };
});
