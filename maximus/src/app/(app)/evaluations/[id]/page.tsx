import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquare, Pencil, Send } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, PageHeader } from "@/components/ui/misc";
import { SendToLeaders } from "@/components/send-to-leaders";
import { ReadAloud } from "@/components/voice";
import { requireViewer } from "@/lib/auth";
import { getMyLeaders } from "@/lib/leaders";
import { createClient } from "@/lib/supabase/server";
import type { Evaluation } from "@/lib/types";
import { formatDate, formatMoney, formatRelative, nextEvaluationDate, todayIn } from "@/lib/utils";
import { EvaluationForm } from "../evaluation-form";
import { FeedbackForm } from "./feedback-form";

export const metadata = { title: "Evaluation" };

type Feedback = { id: string; comment: string; created_at: string; profiles: { full_name: string; avatar_url: string | null } | null };

export default async function EvaluationDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; edit?: string }> }) {
  const [{ id }, { saved, edit }] = await Promise.all([params, searchParams]);
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data: ev } = await supabase.from("evaluations").select("*, profiles!evaluations_user_id_fkey(full_name, avatar_url)")
    .eq("id", id).maybeSingle<Evaluation & { profiles: { full_name: string; avatar_url: string | null } | null }>();
  if (!ev) notFound();
  const { data: feedback } = await supabase.from("evaluation_feedback")
    .select("id, comment, created_at, profiles!evaluation_feedback_author_id_fkey(full_name, avatar_url)")
    .eq("evaluation_id", id).order("created_at").returns<Feedback[]>();

  const isOwner = ev.user_id === viewer.id;
  const editable = isOwner && todayIn(viewer.profile.timezone) < nextEvaluationDate(ev.period_date);
  const canFeedback = !isOwner && viewer.can("review_member_goals");
  const leaders = isOwner ? await getMyLeaders(supabase) : [];

  if (editable && edit === "1") {
    return (
      <>
        <Link href={`/evaluations/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden /> Back</Link>
        <PageHeader title={`Edit ${formatDate(ev.period_date, { day: "numeric", month: "long" })} evaluation`} />
        <Card className="max-w-3xl"><CardBody className="sm:p-8"><EvaluationForm evaluation={ev} periods={[]} /></CardBody></Card>
      </>
    );
  }

  const numbers = [
    ["Earnings", formatMoney(ev.earnings)], ["Prospects contacted", ev.prospects], ["Presentations", ev.presentations],
    ["Follow-ups", ev.follow_ups], ["Orders generated", ev.orders_generated], ["People who joined", ev.new_joins],
    ["Members supported", ev.members_supported],
  ] as const;

  return (
    <>
      <Link href="/evaluations" className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden /> Evaluations</Link>
      <PageHeader eyebrow={isOwner ? "Your evaluation" : ev.profiles?.full_name ?? "Member"}
        title={formatDate(ev.period_date, { weekday: "long", day: "numeric", month: "long" })}
        description={`Submitted ${formatRelative(ev.submitted_at)}`}
        action={editable && <Link href={`/evaluations/${id}?edit=1`} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-fg"><Pencil className="size-4" aria-hidden /> Edit</Link>} />
      {saved && <p className="mb-6 rounded-2xl bg-success-soft px-4 py-3 text-sm text-success" role="status">Evaluation saved. Your sponsor has been notified. 🎉</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardBody>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {numbers.map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-surface-muted p-3">
                    <dt className="text-xs text-fg-subtle">{label}</dt>
                    <dd className="mt-1 text-lg font-bold tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-6 space-y-4">
                <ReadAloud label="Listen to this evaluation" text={`${numbers.map(([l, v]) => `${l}: ${v}`).join(". ")}. Challenges: ${ev.challenges ?? "none"}. Priorities: ${ev.priorities ?? "none"}. ${ev.free_text ?? ""} Support needed: ${ev.support_needed ?? "none"}.`} />
                {ev.free_text && (
                  <div className="rounded-2xl bg-surface-muted p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">In their own words</h3>
                    <p className="mt-1 whitespace-pre-line text-sm">{ev.free_text}</p>
                  </div>
                )}
                {[["Challenges", ev.challenges], ["Priorities for the next five days", ev.priorities], ["Support needed from sponsor", ev.support_needed]].map(([l, t]) => (
                  <div key={l as string}>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">{l}</h3>
                    <p className="mt-1 whitespace-pre-line text-sm">{t || <span className="text-fg-subtle">—</span>}</p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
        <div className="space-y-6">
        {isOwner && (
          <Card>
            <CardHeader title="Send to sponsor / team leader" icon={<Send className="size-4" />} />
            <CardBody>
              <SendToLeaders leaders={leaders} kind="evaluation" itemId={ev.id}
                title={`My ${formatDate(ev.period_date, { day: "numeric", month: "long" })} evaluation`}
                body={[...numbers.map(([l, v]) => `${l}: ${v}`), `\nChallenges: ${ev.challenges ?? "—"}`, `Priorities for the next five days: ${ev.priorities ?? "—"}`, `Support needed: ${ev.support_needed ?? "—"}`, ev.free_text ? `\nIn my own words:\n${ev.free_text}` : ""].join("\n")} />
            </CardBody>
          </Card>
        )}
        <Card className="h-fit">
          <CardHeader title="Sponsor feedback" icon={<MessageSquare className="size-4" />} />
          <CardBody className="space-y-4 pt-3">
            {feedback && feedback.length > 0 ? feedback.map((f) => (
              <div key={f.id} className="flex gap-3">
                <Avatar name={f.profiles?.full_name ?? "Sponsor"} src={f.profiles?.avatar_url} size={32} />
                <div className="flex-1 rounded-2xl bg-surface-muted p-3">
                  <p className="text-sm font-semibold">{f.profiles?.full_name} <span className="text-xs font-normal text-fg-subtle">{formatRelative(f.created_at)}</span></p>
                  <p className="mt-1 whitespace-pre-line text-sm">{f.comment}</p>
                </div>
              </div>
            )) : <p className="text-center text-sm text-fg-muted">No feedback yet.</p>}
            {canFeedback && <FeedbackForm evaluationId={id} />}
          </CardBody>
        </Card>
        </div>
      </div>
    </>
  );
}
