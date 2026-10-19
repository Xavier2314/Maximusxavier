import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { cleanForm } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { FormEditor } from "./form-editor";

export const metadata = { title: "Edit form" };

export default async function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: f } = await supabase.from("forms").select("id, title, slug, kind, published, definition").eq("id", id).maybeSingle();
  if (!f) notFound();
  return (
    <>
      <Link href="/marketing/forms" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden />Forms &amp; surveys</Link>
      <FormEditor id={f.id} userId={viewer.id} initial={{ title: f.title, slug: f.slug, published: f.published, kind: f.kind === "survey" ? "survey" : "form", def: cleanForm(f.definition) }} />
    </>
  );
}
