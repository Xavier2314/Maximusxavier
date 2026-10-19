import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormView } from "@/components/forms/form-view";
import { countFormView, loadPublicForm } from "@/lib/form-public";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const f = await loadPublicForm((await params).slug);
  if (!f) return { title: "Page not found" };
  // Answers are private: forms and surveys are not for search engines.
  return { title: { absolute: f.def.intro.title || f.title }, applicationName: f.title, appleWebApp: { title: f.title }, robots: { index: false, follow: false } };
}

export default async function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const f = await loadPublicForm(slug);
  if (!f) notFound();
  void countFormView(slug).then(() => undefined, () => undefined);
  return <FormView slug={f.slug} title={f.title} def={f.def} />;
}
