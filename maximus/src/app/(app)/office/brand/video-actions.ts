"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseVideoLink } from "@/lib/featured";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

type State = { ok: boolean; message: string } | null;

/** A company admin features their own YouTube or Loom video for their members. */
export async function saveOfficeVideoAction(_: State, form: FormData): Promise<State> {
  const officeId = z.string().uuid().safeParse(form.get("office_id"));
  if (!officeId.success) return { ok: false, message: "Choose an office." };
  const supabase = await createClient();
  if (form.get("intent") === "remove") {
    const { error } = await supabase.rpc("set_office_featured_video", { p_office: officeId.data, p_value: null });
    if (error) return { ok: false, message: friendlyError(error, error.message) };
    revalidatePath("/", "layout");
    return { ok: true, message: "Video removed for your members." };
  }
  const parsed = z.object({ url: z.string().trim().min(5), title: z.string().trim().min(2, "Give it a title").max(120), message: z.string().trim().max(300).optional() })
    .safeParse({ url: form.get("url"), title: form.get("title"), message: form.get("message") || undefined });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  const video = parseVideoLink(parsed.data.url);
  if (!video) return { ok: false, message: "That doesn't look like a YouTube or Loom link. Copy it from the Share button." };
  const { error } = await supabase.rpc("set_office_featured_video", {
    p_office: officeId.data,
    p_value: { ...video, title: parsed.data.title, message: parsed.data.message ?? null, popup: form.get("popup") === "on", active: true, updated_at: new Date().toISOString() },
  });
  if (error) return { ok: false, message: friendlyError(error, error.message) };
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved. Your members now see this video on Home and in the side menu." };
}
