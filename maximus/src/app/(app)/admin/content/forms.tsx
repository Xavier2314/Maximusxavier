"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { CATEGORIES } from "@/lib/academy";
import { deleteLessonAction, saveCourseAction, saveKnowledgeAction, saveLessonAction, toggleKnowledgeAction } from "./actions";

type Course = { id: string; title: string; category: string; description: string | null; level: string | null; status: string; sort_order: number };

function useResetOnSuccess(ok: boolean | undefined) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (ok) ref.current?.reset(); }, [ok]);
  return ref;
}

export function CourseForm({ course }: { course?: Course }) {
  const [state, action] = useActionState(saveCourseAction, null);
  const ref = useResetOnSuccess(!course && state?.ok);
  const e = state?.errors ?? {};
  const id = course?.id ?? "new";
  return (
    <form ref={ref} action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      {course && <input type="hidden" name="id" value={course.id} />}
      <Field label="Title" htmlFor={`ct-${id}`} error={e.title}><Input id={`ct-${id}`} name="title" defaultValue={course?.title} /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Category" htmlFor={`cc-${id}`}><Select id={`cc-${id}`} name="category" defaultValue={course?.category ?? "getting_started"}>{CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</Select></Field>
        <Field label="Level" htmlFor={`cl-${id}`}><Select id={`cl-${id}`} name="level" defaultValue={course?.level ?? "beginner"}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></Select></Field>
        <Field label="Status" htmlFor={`cs-${id}`}><Select id={`cs-${id}`} name="status" defaultValue={course?.status ?? "draft"}><option value="draft">Draft (hidden)</option><option value="coming_soon">Coming soon</option><option value="published">Published</option></Select></Field>
      </div>
      <Field label="Description" htmlFor={`cd-${id}`} optional><Textarea id={`cd-${id}`} name="description" defaultValue={course?.description ?? ""} rows={2} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Thumbnail" htmlFor={`cth-${id}`} optional hint="16:9 image, under 5 MB"><Input id={`cth-${id}`} name="thumbnail" type="file" accept="image/jpeg,image/png,image/webp" className="py-2" /></Field>
        <Field label="Sort order" htmlFor={`co-${id}`}><Input id={`co-${id}`} name="sort_order" type="number" min={0} defaultValue={course?.sort_order ?? 0} /></Field>
      </div>
      <SubmitButton pendingLabel="Saving…">{course ? "Save course" : "Create course"}</SubmitButton>
    </form>
  );
}

export function LessonForm({ courseId }: { courseId: string }) {
  const [state, action] = useActionState(saveLessonAction, null);
  const ref = useResetOnSuccess(state?.ok);
  const e = state?.errors ?? {};
  return (
    <form ref={ref} action={action} className="space-y-3 rounded-2xl border border-dashed border-border p-4" noValidate>
      <p className="text-sm font-semibold">Add a lesson</p>
      <FormMessage state={state} />
      <input type="hidden" name="course_id" value={courseId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_120px_100px]">
        <Field label="Title" htmlFor={`lt-${courseId}`} error={e.title}><Input id={`lt-${courseId}`} name="title" /></Field>
        <Field label="Minutes" htmlFor={`lm-${courseId}`}><Input id={`lm-${courseId}`} name="duration_minutes" type="number" min={0} /></Field>
        <Field label="Order" htmlFor={`lo-${courseId}`}><Input id={`lo-${courseId}`} name="sort_order" type="number" min={0} defaultValue={0} /></Field>
      </div>
      <Field label="Video link" htmlFor={`lv-${courseId}`} optional error={e.video_url} hint="YouTube, Vimeo or a direct https video link"><Input id={`lv-${courseId}`} name="video_url" placeholder="https://" /></Field>
      <Field label="Materials link" htmlFor={`lr-${courseId}`} optional error={e.resource_url}><Input id={`lr-${courseId}`} name="resource_url" placeholder="https://" /></Field>
      <Field label="Lesson content" htmlFor={`lc-${courseId}`} optional hint="Paragraphs, - bullet lists and **bold** are supported"><Textarea id={`lc-${courseId}`} name="content" rows={5} /></Field>
      <SubmitButton size="sm" pendingLabel="Adding…">Add lesson</SubmitButton>
    </form>
  );
}

export function DeleteLesson({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} aria-label="Delete lesson" className="text-fg-subtle hover:text-danger"
      onClick={() => { if (confirm("Delete this lesson? Learner progress for it will be removed.")) start(async () => { await deleteLessonAction(id); }); }}>
      <Trash2 className="size-4" />
    </button>
  );
}

export function KnowledgeForm() {
  const [state, action] = useActionState(saveKnowledgeAction, null);
  const ref = useResetOnSuccess(state?.ok);
  const e = state?.errors ?? {};
  return (
    <form ref={ref} action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" htmlFor="k-title" error={e.title}><Input id="k-title" name="title" /></Field>
        <Field label="Category" htmlFor="k-cat"><Input id="k-cat" name="category" defaultValue="product" placeholder="product, policy, training…" /></Field>
      </div>
      <Field label="Approved content" htmlFor="k-content" error={e.content} hint="Only facts approved by Maximus leadership. Maximus AI quotes from this."><Textarea id="k-content" name="content" rows={6} /></Field>
      <Field label="Source" htmlFor="k-source" optional><Input id="k-source" name="source" placeholder="e.g. Product catalogue 2026" /></Field>
      <SubmitButton pendingLabel="Saving…">Add to knowledge base</SubmitButton>
    </form>
  );
}

export function KnowledgeToggle({ id, published }: { id: string; published: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(async () => { await toggleKnowledgeAction(id, !published); })}
      className="text-xs font-medium text-primary hover:underline">{published ? "Unpublish" : "Publish"}</button>
  );
}
