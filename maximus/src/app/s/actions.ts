"use server";

import { captureContact } from "@/lib/contact-capture";
import { allFields, validateAnswers } from "@/lib/forms";
import { loadPublicForm } from "@/lib/form-public";
import { createAdminClient } from "@/lib/supabase/server";

type Result = { ok: true; redirectUrl: string } | { ok: false; message: string };

/** Public: a visitor sends their answers. They are checked against the PUBLISHED form, never trusted from the browser. */
export async function submitFormAction(slug: string, payload: string, trap: string): Promise<Result> {
  if (trap.length > 0) return { ok: true, redirectUrl: "" }; // honeypot: bots fill every field, pretend it worked
  if (payload.length > 60_000) return { ok: false, message: "That is too much text to send." };
  const form = await loadPublicForm(slug);
  if (!form) return { ok: false, message: "This form is not available." };
  let input: Record<string, unknown>;
  try { const v = JSON.parse(payload); input = v && typeof v === "object" && !Array.isArray(v) ? v : {}; } catch { return { ok: false, message: "Could not read your answers." }; }
  const res = validateAnswers(form.def, input);
  if (!res.ok) return res;
  if (!Object.keys(res.answers).length) return { ok: false, message: "Please answer at least one question." };

  const admin = createAdminClient();
  // Cheap flood guard: at most 60 responses per form in 10 minutes.
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count } = await admin.from("form_responses").select("id", { count: "exact", head: true }).eq("form_id", form.id).gte("created_at", since);
  if ((count ?? 0) >= 60) return { ok: false, message: "Too many responses right now. Please try again in a few minutes." };
  const { error } = await admin.from("form_responses").insert({ form_id: form.id, answers: res.answers, name: res.name || null, email: res.email || null, phone: res.phone || null });
  if (error) { console.error("[form-response]", error.message); return { ok: false, message: "Sorry, we couldn't save that. Please try again." }; }
  // Add the person to the owner's contacts when they gave a phone number or email.
  const labelled: Record<string, string> = {};
  for (const f of allFields(form.def)) if (res.answers[f.id]) labelled[f.label] = res.answers[f.id];
  await captureContact({
    ownerId: form.ownerId, name: res.name, phone: res.phone, email: res.email, source: `${form.kind === "survey" ? "Survey" : "Form"}: ${form.title}`,
    tags: [form.kind === "survey" ? "survey" : "form"], event: { kind: "form_response", title: `Answered “${form.title}”`, detail: { answers: labelled } },
  });
  return { ok: true, redirectUrl: form.def.redirectUrl };
}
