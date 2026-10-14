import { z } from "zod";
import { body, must, route } from "@/lib/api";

const Sub = z.object({
  subscription: z.object({
    endpoint: z.string().url().max(2000),
    keys: z.object({ p256dh: z.string().max(500), auth: z.string().max(200) }),
  }),
  label: z.string().max(80).optional(),
  platform: z.string().max(40).optional(),
});

/** Register (or re-register) this device for Web Push. */
export const POST = route(async (req, { supabase, user }) => {
  const input = await body(req, Sub);
  const ua = req.headers.get("user-agent")?.slice(0, 300) ?? null;
  const row = must(
    await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: user.id, endpoint: input.subscription.endpoint, p256dh: input.subscription.keys.p256dh, auth: input.subscription.keys.auth,
          user_agent: ua, device_label: input.label ?? null, platform: input.platform ?? null, active: true, failure_count: 0,
        },
        { onConflict: "endpoint" },
      )
      .select("id,device_label,platform,active,created_at")
      .single(),
    "save subscription",
  );
  return { device: row };
});

export const DELETE = route(async (req, { supabase, user }) => {
  const input = await body(req, z.object({ endpoint: z.string().optional(), id: z.string().uuid().optional() }));
  const q = supabase.from("push_subscriptions").delete().eq("user_id", user.id);
  if (input.id) q.eq("id", input.id);
  else if (input.endpoint) q.eq("endpoint", input.endpoint);
  else return { ok: false };
  must(await q, "remove device");
  return { ok: true };
});
