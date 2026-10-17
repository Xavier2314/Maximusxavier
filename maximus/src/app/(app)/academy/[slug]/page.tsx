import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleCheck, Clock, ExternalLink, PlayCircle } from "lucide-react";
import { RichText } from "@/components/rich-text";
import { Card, CardBody } from "@/components/ui/card";
import { Progress } from "@/components/ui/misc";
import { categoryOf, embedUrl } from "@/lib/academy";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { CompleteButton } from "./complete-button";

export const metadata = { title: "Course" };

type Lesson = { id: string; title: string; content: string | null; video_url: string | null; resource_url: string | null; duration_minutes: number | null };

export default async function CoursePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ lesson?: string }> }) {
  const [{ slug }, { lesson: lessonParam }] = await Promise.all([params, searchParams]);
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data: course } = await supabase.from("courses").select("id, title, description, category, status").eq("slug", slug).maybeSingle();
  if (!course || course.status !== "published") notFound();
  const [{ data: lessons }, { data: done }] = await Promise.all([
    supabase.from("lessons").select("id, title, content, video_url, resource_url, duration_minutes").eq("course_id", course.id).order("sort_order").returns<Lesson[]>(),
    supabase.from("course_progress").select("lesson_id").eq("user_id", viewer.id),
  ]);
  const list = lessons ?? [];
  const doneSet = new Set((done ?? []).map((d) => d.lesson_id as string));
  const current = list.find((l) => l.id === lessonParam) ?? list.find((l) => !doneSet.has(l.id)) ?? list[0];
  const idx = current ? list.indexOf(current) : -1;
  const next = idx >= 0 ? list[idx + 1] : undefined;
  const pct = list.length ? Math.round((list.filter((l) => doneSet.has(l.id)).length / list.length) * 100) : 0;
  const video = current?.video_url ? embedUrl(current.video_url) : null;

  return (
    <>
      <Link href="/academy" className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden /> Academy</Link>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {current ? (
            <Card className="overflow-hidden">
              {video && (
                <div className="aspect-video bg-black">
                  {video.kind === "iframe"
                    ? <iframe src={video.src} title={current.title} className="size-full" allow="encrypted-media; picture-in-picture; fullscreen" loading="lazy" />
                    : <video src={video.src} controls className="size-full" preload="metadata" />}
                </div>
              )}
              <CardBody className="sm:p-8">
                <p className="text-xs font-medium text-primary">{categoryOf(course.category as string).label} · Lesson {idx + 1} of {list.length}</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight">{current.title}</h1>
                {current.duration_minutes && <p className="mt-1 flex items-center gap-1 text-sm text-fg-subtle"><Clock className="size-3.5" aria-hidden /> {current.duration_minutes} min</p>}
                <div className="mt-6 text-[15px] leading-relaxed">{current.content ? <RichText text={current.content} /> : <p className="text-fg-muted">This lesson has no written content.</p>}</div>
                {current.resource_url && (
                  <a href={current.resource_url} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                    <ExternalLink className="size-4" aria-hidden /> Lesson materials
                  </a>
                )}
                <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-6">
                  <CompleteButton lessonId={current.id} done={doneSet.has(current.id)} nextHref={next ? `/academy/${slug}?lesson=${next.id}` : null} />
                </div>
              </CardBody>
            </Card>
          ) : <Card><CardBody>No lessons have been published yet.</CardBody></Card>}
        </div>
        <aside className="space-y-4">
          <Card>
            <CardBody>
              <h2 className="font-semibold">{course.title as string}</h2>
              {course.description && <p className="mt-1 text-sm text-fg-muted">{course.description as string}</p>}
              <div className="mt-4"><div className="mb-1 flex justify-between text-xs text-fg-subtle"><span>Progress</span><span>{pct}%</span></div><Progress value={pct} tone="green" label="Course progress" /></div>
            </CardBody>
            <ol className="border-t border-border p-2">
              {list.map((l, i) => (
                <li key={l.id}>
                  <Link href={`/academy/${slug}?lesson=${l.id}`} aria-current={l.id === current?.id ? "step" : undefined}
                    className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm", l.id === current?.id ? "bg-primary-soft font-medium text-primary" : "hover:bg-surface-muted")}>
                    {doneSet.has(l.id) ? <CircleCheck className="size-4 shrink-0 text-success" aria-label="Completed" /> : <PlayCircle className="size-4 shrink-0 text-fg-subtle" aria-hidden />}
                    <span className="flex-1">{i + 1}. {l.title}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>
    </>
  );
}
