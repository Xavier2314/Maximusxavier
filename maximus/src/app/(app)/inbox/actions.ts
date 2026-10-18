"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { dispatchPushSoon } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

const schema = z.object({
  kind: z.enum(["goal", "evaluation", "order", "payment", "plan"]),
  itemId: z.string().uuid().nullable(),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(8000),
  relations: z.array(z.enum(["sponsor", "team_leader"])).min(1, "Choose who to send it to"),
  message: z.string().trim().max(1000).optional(),
  attachment: z.string().max(300).nullable().optional(),
});

export async function shareWithLeadersAction(input: z.input<typeof schema>): Promise<{ ok: boolean; message: string }> {
  await requireViewer();
  const p = schema.safeParse(input);
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Invalid request." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("share_with_leaders", {
    p_kind: p.data.kind, p_item: p.data.itemId, p_title: p.data.title, p_body: p.data.body,
    p_relations: p.data.relations, p_message: p.data.message || null, p_attachment: p.data.attachment ?? null,
  });
  if (error) return { ok: false, message: friendlyError(error) };
  dispatchPushSoon();
  revalidatePath("/inbox");
  return { ok: true, message: `Sent to ${data === 2 ? "your sponsor and team leader" : p.data.relations[0] === "sponsor" ? "your sponsor" : "your team leader"}.` };
}
