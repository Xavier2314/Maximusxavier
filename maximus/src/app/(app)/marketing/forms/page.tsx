import Link from "next/link";
import { ArrowLeft, Eye, Inbox, Pencil } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { Badge, PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NewFormForm } from "./new-form";

export const metadata = { title: "Forms & surveys" };
export const maxDuration = 120;

export default async function FormsPage() {
  await requireViewer();
  const supabase = await createClient();
  const { data } = await supabase.from("forms").select("id, title, slug, kind, published, views").order("created_at", { ascending: false });
  const forms = data ?? [];
  const counts = await Promise.all(forms.map(async (f) => (await supabase.from("form_responses").select("id", { count: "exact", head: true }).eq("form_id", f.id)).count ?? 0));
  return (
    <>
      <Link href="/marketing" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden />Marketing</Link>
      <PageHeader eyebrow="Marketing" title="Forms & surveys" description="Collect orders, sign-ups, bookings and feedback. Describe what you need and AI builds it, or start blank." />
      {forms.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map((f, i) => (
            <Card key={f.id}>
              <CardBody className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="min-w-0 truncate text-lg font-semibold">{f.title}</h2>
                  <Badge tone={f.published ? "green" : "neutral"}>{f.published ? "Live" : "Draft"}</Badge>
                </div>
                <p className="flex flex-wrap gap-x-4 text-sm text-fg-muted">
                  <span>{f.kind === "survey" ? "Survey" : "Form"}</span>
                  <span className="inline-flex items-center gap-1"><Eye className="size-4" aria-hidden />{f.views} views</span>
                  <span className="inline-flex items-center gap-1"><Inbox className="size-4" aria-hidden />{counts[i]} responses</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <LinkButton href={`/marketing/forms/${f.id}`} size="sm"><Pencil className="size-4" aria-hidden />Edit</LinkButton>
                  <LinkButton href={`/marketing/forms/${f.id}/responses`} size="sm" variant="outline">Responses</LinkButton>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
      <Card className="mx-auto max-w-3xl">
        <CardHeader title={forms.length ? "Create another" : "Create your first form or survey"} />
        <CardBody><NewFormForm /></CardBody>
      </Card>
    </>
  );
}
