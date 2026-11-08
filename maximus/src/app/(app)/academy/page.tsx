import { CourseCard, type CourseCardData } from "@/components/course-card";
import { EmptyState, PageHeader, Progress } from "@/components/ui/misc";
import { CATEGORIES } from "@/lib/academy";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Maximus Academy" };

export default async function AcademyPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const [{ data: courses }, { data: lessons }, { data: done }] = await Promise.all([
    supabase.from("courses").select("id, slug, title, description, category, status, thumbnail_url, level, sort_order").neq("status", "draft").order("sort_order"),
    supabase.from("lessons").select("id, course_id"),
    supabase.from("course_progress").select("lesson_id").eq("user_id", viewer.id),
  ]);
  const doneSet = new Set((done ?? []).map((d) => d.lesson_id as string));
  const cards: (CourseCardData & { id: string })[] = (courses ?? []).map((c) => {
    const ls = (lessons ?? []).filter((l) => l.course_id === c.id);
    return {
      id: c.id as string, slug: c.slug as string, title: c.title as string, description: (c.description as string | null) ?? null,
      category: c.category as string, status: c.status as string, thumbnail_url: (c.thumbnail_url as string | null) ?? null,
      level: (c.level as string | null) ?? null, lessons: ls.length, completed: ls.filter((l) => doneSet.has(l.id as string)).length,
    };
  });
  const total = cards.reduce((a, c) => a + c.lessons, 0);
  const completed = cards.reduce((a, c) => a + c.completed, 0);
  const overall = total ? Math.round((completed / total) * 100) : 0;

  return (
    <>
      <PageHeader title="Academy" description="Courses on prospecting, sales, leadership and personal growth, at your own pace."
        action={total > 0 ? (
          <div className="w-56">
            <p className="flex justify-between text-sm"><span className="text-fg-muted">Your progress</span><span className="font-medium tabular-nums">{completed} of {total}</span></p>
            <Progress value={overall} className="mt-2 h-1.5" label="Academy progress" />
          </div>
        ) : undefined} />
      {cards.length === 0 ? <EmptyState title="No courses yet" /> : CATEGORIES.map((cat) => {
        const list = cards.filter((c) => c.category === cat.key);
        if (list.length === 0) return null;
        return (
          <section key={cat.key} className="mb-8" aria-labelledby={`cat-${cat.key}`}>
            <h2 id={`cat-${cat.key}`} className="mb-3 text-lg font-semibold tracking-tight">{cat.label}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map((c) => <CourseCard key={c.id} c={c} />)}</div>
          </section>
        );
      })}
    </>
  );
}
