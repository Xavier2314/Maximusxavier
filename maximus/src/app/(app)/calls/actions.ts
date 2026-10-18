"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

type Result = { ok: false; message: string } | void;

export async function startDirectCallAction(conversationId: string, video: boolean): Promise<Result> {
  if (!z.string().uuid().safeParse(conversationId).success) return { ok: false, message: "Invalid chat." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_direct_call", { p_conversation: conversationId, p_video: video });
  if (error || !data) return { ok: false, message: friendlyError(error, error?.message) };
  redirect(`/calls/${data as string}`);
}

export async function startGroupCallAction(_: unknown, form: FormData): Promise<{ ok: boolean; message: string } | null> {
  const parsed = z.object({ office_id: z.string().uuid(), title: z.string().trim().max(120), video: z.enum(["on"]).optional() })
    .safeParse({ office_id: form.get("office_id"), title: form.get("title") ?? "", video: form.get("video") ?? undefined });
  if (!parsed.success) return { ok: false, message: "Choose an office." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_group_call", {
    p_office: parsed.data.office_id, p_title: parsed.data.title || "Office call", p_video: Boolean(parsed.data.video),
  });
  if (error || !data) return { ok: false, message: friendlyError(error, error?.message) };
  redirect(`/calls/${data as string}`);
}

export async function endCallAction(callId: string) {
  if (!z.string().uuid().safeParse(callId).success) return;
  const supabase = await createClient();
  await supabase.rpc("end_call", { p_call: callId });
}
