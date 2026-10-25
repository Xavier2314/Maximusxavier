"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

/** Open (or create) a private chat with someone in the member's sponsor line or office, then go to it.
 *  `view` carries where the Chat button was clicked from ("team" or "office") so the view switcher
 *  stays on that tab instead of bouncing to My view, and so Back returns there instead of Accountability. */
export async function openTeamChatAction(otherId: string, view?: string): Promise<{ ok: false; message: string } | void> {
  if (!z.string().uuid().safeParse(otherId).success) return { ok: false, message: "Invalid member." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_team_chat", { p_other: otherId });
  if (error || !data) return { ok: false, message: friendlyError(error, error?.message) };
  const qs = new URLSearchParams({ c: data as string });
  if (view === "team" || view === "office") qs.set("view", view);
  redirect(`/messages?${qs}`);
}
