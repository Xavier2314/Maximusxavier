"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewer, requireViewer } from "@/lib/auth";
import { draftForm } from "@/lib/form-ai";
import { blankForm, cleanForm, type FormKind } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

type State = { ok: boolean; message: string } | null;
const id = z.string().uuid();
const slugRule = z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/, "Use 3–40 letters, numbers or dashes for the link.");

export async function createFormAction(_: State, form: FormData): Promise<State> {
  const viewer = await requireViewer();
  const kind: FormKind = form.get("kind") === "survey" ? "survey" : "form";
  const mode = form.get("mode") === "ai" ? "ai" : "blank";
  const t = z.string().trim().min(1, "Give it a name.").max(100).safeParse(form.get("title"));
  let title = t.success ? t.data : "";
  let def = blankForm(kind, title);
  if (mode === "ai") {
    const desc = z.string().trim().min(10, "Tell the AI what it is for, in a sentence or two.").max(1500).safeParse(form.get("description"));
    if (!desc.success) return { ok: false, message: desc.error.issues[0]?.message ?? "Tell the AI what it is for." };
    const d = await draftForm({ kind, description: desc.data, ownerName: viewer.profile.full_name });
    if ("error" in d) return { ok: false, message: d.error };
    def = d.def; title = title || d.title;
  }
  if (!title) return { ok: false, message: "Give it a name." };
  if (mode === "blank") def = blankForm(kind, title);
  const supabase = await createClient();
  const { data: slug } = await supabase.rpc("suggest_form_slug", { p_hint: title });
  const { data, error } = await supabase.from("forms").insert({ title, slug: slug as string, kind, definition: def, published: false }).select("id").single();
  if (error || !data) return { ok: false, message: friendlyError(error, "Could not create it.") };
  revalidatePath("/marketing/forms");
  redirect(`/marketing/forms/${data.id}`);
}

export async function saveFormAction(formId: string, payload: string): Promise<State> {
  if (!id.safeParse(formId).success) return { ok: false, message: "Unknown form." };
  if (!(await getViewer())) return { ok: false, message: "Your session expired, so changes are not being saved. Sign in again in another tab, then keep editing here." };
  let raw: Record<string, unknown>;
  try { raw = payload.length < 200_000 ? JSON.parse(payload) : {}; } catch { return { ok: false, message: "Could not read your changes." }; }
  const head = z.object({ title: z.string().trim().min(1, "Give it a name.").max(120), slug: slugRule, published: z.boolean() }).safeParse(raw);
  if (!head.success) return { ok: false, message: head.error.issues[0]?.message ?? "Check the settings." };
  const supabase = await createClient();
  const { error } = await supabase.from("forms").update({ ...head.data, definition: cleanForm(raw.definition) }).eq("id", formId);
  if (error) return { ok: false, message: error.code === "23505" ? "That link name is taken. Try another." : friendlyError(error) };
  revalidatePath("/marketing/forms");
  return { ok: true, message: "Saved" };
}

export async function deleteFormAction(formId: string) {
  if (!id.safeParse(formId).success) return;
  await requireViewer();
  const supabase = await createClient();
  await supabase.from("forms").delete().eq("id", formId);
  revalidatePath("/marketing/forms");
  redirect("/marketing/forms");
}

export async function deleteResponseAction(formId: string, responseId: string) {
  if (!id.safeParse(formId).success || !id.safeParse(responseId).success) return;
  await requireViewer();
  const supabase = await createClient();
  await supabase.from("form_responses").delete().eq("id", responseId).eq("form_id", formId);
  revalidatePath(`/marketing/forms/${formId}/responses`);
}
