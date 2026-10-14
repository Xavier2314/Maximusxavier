import { z } from "zod";
import { body, must, route } from "@/lib/api";
import { syncAfterChange } from "@/lib/reminders/sync";

const Rules = z.object({
  rules: z.array(z.object({
    anchor: z.enum(["start", "end"]),
    offset_minutes: z.number().int().min(-10080).max(1440),
    message: z.string().max(200).nullable().optional(),
    enabled: z.boolean().default(true),
  })).max(10),
});

export const GET = route<{ id: string }>(async (_req, { supabase }, { id }) => ({
  rules: must(await supabase.from("reminder_rules").select("*").eq("activity_id", id).order("offset_minutes"), "rules"),
}));

/** Replace an activity's reminder rules. Upcoming reminders are re-planned immediately. */
export const PUT = route<{ id: string }>(async (req, { supabase, user }, { id }) => {
  const { rules } = await body(req, Rules);
  const unique = new Map(rules.map((r) => [`${r.anchor}:${r.offset_minutes}`, r]));
  must(await supabase.from("reminder_rules").delete().eq("activity_id", id), "clear rules");
  if (unique.size) must(await supabase.from("reminder_rules").insert([...unique.values()].map((r) => ({ ...r, message: r.message || null, user_id: user.id, activity_id: id }))), "save rules");
  await syncAfterChange(supabase, user.id);
  return { ok: true };
});
