import { z } from "zod";
import { body, HttpError, must, route } from "@/lib/api";
import { isValidZone } from "@/lib/time";
import { syncAfterChange } from "@/lib/reminders/sync";

const Patch = z
  .object({
    display_name: z.string().trim().min(1).max(80),
    timezone: z.string().max(64),
    wake_time: z.string().regex(/^\d{2}:\d{2}$/),
    bedtime: z.string().regex(/^\d{2}:\d{2}$/),
  })
  .partial();

export const GET = route(async (_req, { supabase, user }) => ({
  profile: must(await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(), "profile"),
  email: user.email,
}));

export const PATCH = route(async (req, { supabase, user }) => {
  const patch = await body(req, Patch);
  if (patch.timezone && !isValidZone(patch.timezone)) throw new HttpError(400, "Unknown timezone");
  const saved = must(await supabase.from("profiles").update(patch).eq("id", user.id).select().single(), "save profile");
  await syncAfterChange(supabase, user.id);
  return { profile: saved };
});
