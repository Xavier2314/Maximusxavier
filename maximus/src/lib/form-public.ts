import "server-only";
import { cleanForm, type FormDef, type FormKind } from "@/lib/forms";
import { createAdminClient } from "@/lib/supabase/server";

export type PublicForm = { id: string; ownerId: string; title: string; slug: string; kind: FormKind; def: FormDef };

/** A published form for visitors, read on the server. The owner must still be an active member. */
export async function loadPublicForm(slug: string): Promise<PublicForm | null> {
  if (!/^[a-z0-9-]{3,40}$/.test(slug) || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const admin = createAdminClient();
  const { data: f } = await admin.from("forms").select("id, user_id, title, slug, kind, definition").eq("slug", slug).eq("published", true).maybeSingle();
  if (!f) return null;
  const { data: owner } = await admin.from("profiles").select("id").eq("id", f.user_id).eq("status", "active").maybeSingle();
  if (!owner) return null;
  return { id: f.id, ownerId: f.user_id as string, title: f.title, slug: f.slug, kind: f.kind === "survey" ? "survey" : "form", def: cleanForm(f.definition) };
}

export const countFormView = (slug: string) => createAdminClient().rpc("form_viewed", { p_slug: slug });
