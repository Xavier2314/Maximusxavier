"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

/** Open (or create) a private chat with someone in the member's sponsor line, then go to it. */
export async function openTeamChatAction(otherId: string): Promise<{ ok: false; message: string } | void> {
  if (!z.string().uuid().safeParse(otherId).success) return { ok: false, message: "Invalid member." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_team_chat", { p_other: otherId });
  if (error || !data) return { ok: false, message: friendlyError(error, error?.message) };
  redirect(`/messages?c=${data as string}`);
}
