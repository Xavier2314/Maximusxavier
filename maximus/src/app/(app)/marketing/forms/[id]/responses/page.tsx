import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Trash2 } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { allFields, cleanForm, summarize } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { deleteResponseAction } from "../../actions";

export const metadata = { title: "Responses" };
type Row = { id: string; answers: Record<string, string>; created_at: string };

export default async function ResponsesPage({ params }: { params: Promise<{ id: string }> }) {
  await requireViewer();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: f } = await supabase.from("forms").select("id, title, kind, definition, views").eq("id", id).maybeSingle();
  if (!f) notFound();
  const def = cleanForm(f.definition);
  const { count } = await supabase.from("form_responses").select("id", { count: "exact", head: true }).eq("form_id", id);
  const { data } = await supabase.from("form_responses").select("id, answers, created_at").eq("form_id", id).order("created_at", { ascending: false }).limit(500).returns<Row[]>();
  const rows = data ?? [];
  const fields = allFields(def);
  const sum = summarize(def, rows);
  const when = (iso: string) => new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
  const rate = f.views > 0 ? Math.round(((count ?? 0) / f.views) * 100) : null;

  return (
    <>
      <Link href={`/marketing/forms/${id}`} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden />{f.title}</Link>
      <PageHeader eyebrow={f.kind === "survey" ? "Survey" : "Form"} title="Responses" description={`${count ?? 0} response${count === 1 ? "" : "s"} · ${f.views} view${f.views === 1 ? "" : "s"}${rate !== null ? ` · ${Math.min(rate, 100)}% completed` : ""}`}
        action={rows.length ? <LinkButton href={`/marketing/forms/${id}/responses/export`} variant="outline" size="sm"><Download className="size-4" aria-hidden />Download CSV</LinkButton> : undefined} />
      {!rows.length ? (
        <EmptyState icon={<Download className="size-6" />} title="No responses yet" description="Publish it and share the link. Answers appear here as they come in." />
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2" aria-label="Summary">
            {sum.filter((x) => x.counts || x.average !== undefined).map((x) => (
              <Card key={x.id}>
                <CardBody className="space-y-2">
                  <h2 className="font-semibold">{x.label}</h2>
                  <p className="text-xs text-fg-subtle">{x.answered} answered{x.average !== undefined ? ` · average ${x.average}` : ""}{x.nps ? ` · NPS ${x.nps.score} (${x.nps.promoters} promoters, ${x.nps.detractors} detractors)` : ""}</p>
                  {x.counts?.map((c) => (
                    <div key={c.option} className="text-sm">
                      <div className="flex justify-between"><span>{c.option}</span><span className="text-fg-muted">{c.n} · {c.pct}%</span></div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full bg-primary" style={{ width: `${c.pct}%` }} /></div>
                    </div>
                  ))}
                </CardBody>
              </Card>
            ))}
          </section>
          <section className="space-y-3" aria-label="All responses">
            <h2 className="text-lg font-semibold">All responses</h2>
            {rows.map((r) => (
              <Card key={r.id}>
                <CardBody className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs text-fg-subtle">{when(r.created_at)}</p>
                    <form action={deleteResponseAction.bind(null, id, r.id)}><Button type="submit" size="icon" variant="ghost" aria-label="Delete this response"><Trash2 className="size-4" /></Button></form>
                  </div>
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-[minmax(0,14rem)_1fr]">
                    {fields.filter((q) => r.answers?.[q.id]).map((q) => <div key={q.id} className="contents"><dt className="text-fg-subtle">{q.label}</dt><dd className="whitespace-pre-line break-words">{r.answers[q.id]}</dd></div>)}
                  </dl>
                </CardBody>
              </Card>
            ))}
          </section>
        </div>
      )}
    </>
  );
}
