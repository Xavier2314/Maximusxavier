import { z } from "zod";
import { body, must, route } from "@/lib/api";

export const PATCH = route(async (req, { supabase, user }) => {
  const input = await body(req, z.object({ id: z.string().uuid(), label: z.string().max(80) }));
  must(await supabase.from("push_subscriptions").update({ device_label: input.label }).eq("id", input.id).eq("user_id", user.id), "rename device");
  return { ok: true };
});
