import { BookOpen, Brain, Plus } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, PageHeader } from "@/components/ui/misc";
import { categoryOf } from "@/lib/academy";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CourseForm, DeleteLesson, KnowledgeForm, KnowledgeToggle, LessonForm } from "./forms";

export const metadata = { title: "Content" };

type Course = { id: string; slug: string; title: string; category: string; description: string | null; level: string | null; status: string; sort_order: number };

export default async function ContentPage() {
  await requirePermission("manage_content");
  const supabase = await createClient();
  const [{ data: courses }, { data: lessons }, { data: knowledge }] = await Promise.all([
    supabase.from("courses").select("id, slug, title, category, description, level, status, sort_order").order("category").order("sort_order").returns<Course[]>(),
    supabase.from("lessons").select("id, course_id, title, sort_order").order("sort_order"),
    supabase.from("approved_knowledge").select("id, title, category, is_published, updated_at").order("updated_at", { ascending: false }),
  ]);

  return (
    <>
      <PageHeader eyebrow="Administration" title="Content" description="Manage Academy courses and the approved knowledge Maximus AI answers from." />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <h2 className="flex items-center gap-2 text-lg font-bold"><BookOpen className="size-5 text-primary" aria-hidden /> Courses</h2>
          {(courses ?? []).map((c) => {
            const ls = (lessons ?? []).filter((l) => l.course_id === c.id);
            return (
              <Card key={c.id}>
                <details>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5">
                    <span>
                      <span className="block font-semibold">{c.title}</span>
                      <span className="text-xs text-fg-subtle">{categoryOf(c.category).label} · {ls.length} lessons</span>
                    </span>
                    <Badge tone={c.status === "published" ? "green" : c.status === "coming_soon" ? "blue" : "neutral"}>{c.status.replace("_", " ")}</Badge>
                  </summary>
                  <CardBody className="space-y-6 border-t border-border">
                    <CourseForm course={c} />
                    <div>
                      <p className="mb-2 text-sm font-semibold">Lessons</p>
                      <ol className="mb-4 space-y-1">
                        {ls.map((l, i) => (
                          <li key={l.id as string} className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2 text-sm">
                            <span>{i + 1}. {l.title as string}</span><DeleteLesson id={l.id as string} />
                          </li>
                        ))}
                        {ls.length === 0 && <li className="text-sm text-fg-muted">No lessons yet.</li>}
                      </ol>
                      <LessonForm courseId={c.id} />
                    </div>
                  </CardBody>
                </details>
              </Card>
            );
          })}
          <Card>
            <CardHeader title="New course" icon={<Plus className="size-4" />} />
            <CardBody><CourseForm /></CardBody>
          </Card>
        </div>
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Brain className="size-5 text-primary" aria-hidden /> AI knowledge base</h2>
          <Card>
            <CardBody className="space-y-2">
              {(knowledge ?? []).map((k) => (
                <div key={k.id as string} className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2">
                  <span className="min-w-0"><span className="block truncate text-sm font-medium">{k.title as string}</span><span className="text-xs text-fg-subtle">{k.category as string}{!k.is_published && " · unpublished"}</span></span>
                  <KnowledgeToggle id={k.id as string} published={Boolean(k.is_published)} />
                </div>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Add approved knowledge" icon={<Plus className="size-4" />} />
            <CardBody><KnowledgeForm /></CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
