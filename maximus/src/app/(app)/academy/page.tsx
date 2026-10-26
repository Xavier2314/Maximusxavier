import { GraduationCap } from "lucide-react";
import { CourseCard, type CourseCardData } from "@/components/course-card";
import { EmptyState, PageHeader, ProgressRing } from "@/components/ui/misc";
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
      <section className="hero-gradient relative mb-8 overflow-hidden rounded-[1.75rem] p-6 text-white sm:p-8">
        <div className="wedge absolute -right-6 -top-4 h-[74px] w-[100px] scale-[2.4] bg-brand-green/25" aria-hidden />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-lime">Maximus Academy</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Learn. Lead. Maximise.</h1>
            <p className="mt-2 max-w-md text-white/70">Practical courses on prospecting, sales, leadership and personal growth — at your own pace.</p>
          </div>
          <ProgressRing value={overall} size={110}><div><p className="text-2xl font-bold">{overall}%</p><p className="text-xs text-white/60">{completed}/{total} lessons</p></div></ProgressRing>
        </div>
      </section>
      {cards.length === 0 ? <EmptyState icon={<GraduationCap className="size-6" />} title="No courses yet" /> : CATEGORIES.map((cat) => {
        const list = cards.filter((c) => c.category === cat.key);
        if (list.length === 0) return null;
        return (
          <section key={cat.key} className="mb-8" aria-labelledby={`cat-${cat.key}`}>
            <h2 id={`cat-${cat.key}`} className="mb-3 text-lg font-bold tracking-tight">{cat.label}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map((c) => <CourseCard key={c.id} c={c} />)}</div>
          </section>
        );
      })}
    </>
  );
}
