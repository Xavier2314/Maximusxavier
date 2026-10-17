"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { dispatchPushSoon } from "@/lib/push";
import { friendlyError } from "@/lib/utils";

export type PostState = { ok: boolean; message: string; errors?: Record<string, string[] | undefined> } | null;

const schema = z.object({
  kind: z.enum(["announcement", "training", "recognition"]),
  audience: z.enum(["all", "office", "team"]),
  office_id: z.string().uuid().optional().or(z.literal("")),
  recipient_id: z.string().uuid().optional().or(z.literal("")),
  title: z.string().trim().min(3, "Add a title").max(160),
  body: z.string().trim().min(1, "Write a message").max(5000),
  pinned: z.string().optional(),
});

export async function publishAction(_prev: PostState, formData: FormData): Promise<PostState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  const v = parsed.data;
  if (v.audience === "office" && !v.office_id) return { ok: false, message: "Choose an office.", errors: { office_id: ["Choose an office"] } };
  if (v.kind === "recognition" && !v.recipient_id) return { ok: false, message: "Choose who you are recognising.", errors: { recipient_id: ["Choose a member"] } };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  const { error } = await supabase.from("announcements").insert({
    author_id: user.id, kind: v.kind, audience: v.audience, office_id: v.office_id || null,
    recipient_id: v.recipient_id || null, title: v.title, body: v.body, pinned: v.pinned === "on",
  });
  if (error) return { ok: false, message: friendlyError(error, "You don't have permission to publish to that audience.") };
  revalidatePath("/announcements");
  revalidatePath("/recognition");
  dispatchPushSoon();
  return { ok: true, message: "Published. Your audience has been notified." };
}

export async function deleteAnnouncementAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/announcements");
  revalidatePath("/recognition");
  return { ok: true, message: "Deleted." };
}
