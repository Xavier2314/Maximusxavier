import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, CircleCheck, ListChecks, MessageSquare, NotebookPen, Pencil, RotateCcw, Send, Target } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, Badge, PageHeader, Progress } from "@/components/ui/misc";
import { GoalStatus } from "@/components/goal-status";
import { SendToLeaders } from "@/components/send-to-leaders";
import { ReadAloud } from "@/components/voice";
import { getMyLeaders } from "@/lib/leaders";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { GoalProgress, MonthlyGoal } from "@/lib/types";
import { formatDate, formatMoney, formatRelative, percent } from "@/lib/utils";
import { GoalForm } from "../goal-form";
import { ReviewPanel } from "./review-panel";

export const metadata = { title: "Goals" };

type Feedback = { id: string; action: string; comment: string | null; action_steps: string | null; created_at: string;
  profiles: { full_name: string; avatar_url: string | null } | null };

export default async function GoalDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; edit?: string }> }) {
  const [{ id }, { saved, edit }] = await Promise.all([params, searchParams]);
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data: goal } = await supabase.from("monthly_goals").select("*, profiles!monthly_goals_user_id_fkey(full_name, avatar_url, member_id)")
    .eq("id", id).maybeSingle<MonthlyGoal & { profiles: { full_name: string; avatar_url: string | null; member_id: string } | null }>();
  if (!goal) notFound();

  const [{ data: progress }, { data: feedback }] = await Promise.all([
    supabase.rpc("goal_progress", { p_goal: id }),
    supabase.from("goal_feedback").select("id, action, comment, action_steps, created_at, profiles!goal_feedback_author_id_fkey(full_name, avatar_url)")
      .eq("goal_id", id).order("created_at").returns<Feedback[]>(),
  ]);
  const p = progress as GoalProgress | null;
  const isOwner = goal.user_id === viewer.id;
  const editable = isOwner && (goal.status === "draft" || goal.status === "revision_requested");
  const canReview = !isOwner && viewer.can("review_member_goals");
  const leaders = isOwner ? await getMyLeaders(supabase) : [];

  if (editable && edit === "1") {
    return (
      <>
        <Link href={`/goals/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden /> Back</Link>
        <PageHeader title={`Edit ${formatDate(goal.month, { month: "long" })} goals`} />
        <Card className="max-w-3xl"><CardBody className="sm:p-8">
          <GoalForm goal={goal} defaultMonth={goal.month}
            months={[{ value: goal.month, label: formatDate(goal.month, { month: "long", year: "numeric" }) }]} />
        </CardBody></Card>
      </>
    );
  }

  const rows = [
    { label: "Income", value: p?.income ?? 0, target: goal.income_target, money: true, source: "From your evaluations" },
    { label: "Product sales", value: p?.sales ?? 0, target: goal.sales_target, money: true, source: "From recorded orders" },
    { label: "Prospecting", value: p?.prospecting ?? 0, target: goal.prospecting_target, source: "From your evaluations" },
    { label: "Recruitment", value: p?.recruitment ?? 0, target: goal.recruitment_target, source: "New members you sponsored" },
    { label: "Product orders", value: p?.orders ?? 0, target: goal.order_target, source: "From recorded orders" },
    { label: "Savings", value: p?.savings ?? 0, target: goal.savings_target, money: true, source: "Confirmed savings entries" },
  ].filter((r) => Number(r.target) > 0);
  // Targets without automatic tracking yet: shown as plain targets.
  const extra = [
    { label: "Product sales (PV)", value: goal.product_pv_target != null ? `${Number(goal.product_pv_target).toLocaleString()} PV` : null },
    { label: "Fiverr", value: Number(goal.fiverr_target) > 0 ? formatMoney(goal.fiverr_target) : null },
    { label: "Upwork", value: Number(goal.upwork_target) > 0 ? formatMoney(goal.upwork_target) : null },
    { label: "Other freelancing", value: Number(goal.freelance_other_target) > 0 ? formatMoney(goal.freelance_other_target) : null },
  ].filter((x): x is { label: string; value: string } => Boolean(x.value) && x.value !== "0 PV");
  const methods = [...(goal.prospecting_methods ?? []), ...(goal.prospecting_methods_other ? [goal.prospecting_methods_other] : [])];
  const books = (goal.books ?? "").split("\n").map((b) => b.trim()).filter(Boolean);

  return (
    <>
      <Link href="/goals" className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden /> Goals</Link>
      <PageHeader eyebrow={isOwner ? "Your goals" : goal.profiles?.full_name ?? "Member"}
        title={formatDate(goal.month, { month: "long", year: "numeric" })}
        description={goal.submitted_at ? `Submitted ${formatRelative(goal.submitted_at)}` : "Not submitted yet"}
        action={<>
          <GoalStatus status={goal.status} />
          {editable && <Link href={`/goals/${id}?edit=1`} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white"><Pencil className="size-4" aria-hidden /> Edit</Link>}
        </>} />

      {saved && (
        <p className="mb-6 rounded-2xl bg-success-soft px-4 py-3 text-sm text-success" role="status">
          {saved === "submit" ? "Goals submitted — your sponsor has been notified." : "Draft saved."}
        </p>
      )}
      {goal.status === "revision_requested" && isOwner && (
        <p className="mb-6 flex items-center gap-2 rounded-2xl bg-warning-soft px-4 py-3 text-sm text-warning" role="alert">
          <RotateCcw className="size-4" aria-hidden /> Your sponsor asked for changes. Read their feedback below, then edit and resubmit.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Progress" icon={<Target className="size-4" />} description="Calculated automatically — never typed in by hand" />
            <CardBody className="space-y-5">
              {rows.length === 0 && extra.length === 0 && <p className="text-sm text-fg-muted">No numeric targets set.</p>}
              {rows.map((r) => {
                const pct = percent(Number(r.value), Number(r.target));
                return (
                  <div key={r.label}>
                    <div className="mb-1.5 flex items-end justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{r.label}</p>
                        <p className="text-xs text-fg-subtle">{r.source}</p>
                      </div>
                      <p className="text-sm tabular-nums">
                        <b>{r.money ? formatMoney(r.value) : r.value}</b>
                        <span className="text-fg-subtle"> / {r.money ? formatMoney(r.target) : r.target}</span>
                        <span className="ml-2 font-semibold text-primary">{pct}%</span>
                      </p>
                    </div>
                    <Progress value={pct} tone={pct >= 100 ? "green" : "blue"} label={`${r.label} progress`} />
                  </div>
                );
              })}
              {extra.length > 0 && (
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {extra.map((x) => (
                    <div key={x.label} className="rounded-2xl border border-border p-3">
                      <dt className="text-xs text-fg-subtle">{x.label}</dt>
                      <dd className="mt-0.5 text-sm font-semibold tabular-nums">{x.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {methods.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">Prospecting methods</p>
                  <div className="flex flex-wrap gap-2">{methods.map((m) => <Badge key={m}>{m}</Badge>)}</div>
                </div>
              )}
              {books.length > 0 && (
                <div className="rounded-2xl bg-surface-muted p-4">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-fg-subtle"><BookOpen className="size-3.5" aria-hidden />Books to read</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">{books.map((b) => <li key={b}>{b}</li>)}</ul>
                </div>
              )}
              {goal.personal_development_target && (
                <div className="rounded-2xl bg-surface-muted p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">Personal development</p>
                  <p className="mt-1 text-sm">{goal.personal_development_target}</p>
                </div>
              )}
              {goal.plan_text && (
                <div className="rounded-2xl bg-surface-muted p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-fg-subtle"><NotebookPen className="size-3.5" aria-hidden />Plan in their own words</p>
                    <ReadAloud text={goal.plan_text} label="Listen" />
                  </div>
                  <p className="mt-1 whitespace-pre-line text-sm">{goal.plan_text}</p>
                </div>
              )}
              {goal.custom_goals?.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">To-do list</p>
                  <ul className="space-y-2">
                    {goal.custom_goals.map((c, i) => (
                      <li key={i} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                        <span className="flex items-center gap-2"><ListChecks className="size-4 text-primary" aria-hidden />{c.title}</span>
                        {c.target != null && <Badge>{c.target} {c.unit}</Badge>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Feedback" icon={<MessageSquare className="size-4" />} />
            <CardBody className="pt-3">
              {feedback && feedback.length > 0 ? (
                <ol className="space-y-4">
                  {feedback.map((f) => (
                    <li key={f.id} className="flex gap-3">
                      <Avatar name={f.profiles?.full_name ?? "Sponsor"} src={f.profiles?.avatar_url} size={36} />
                      <div className="min-w-0 flex-1 rounded-2xl bg-surface-muted p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{f.profiles?.full_name}</p>
                          {f.action === "approve" && <Badge tone="green"><CircleCheck className="size-3" aria-hidden /> Approved</Badge>}
                          {f.action === "request_revision" && <Badge tone="amber">Requested revision</Badge>}
                          <span className="text-xs text-fg-subtle">{formatRelative(f.created_at)}</span>
                        </div>
                        {f.comment && <p className="mt-1 whitespace-pre-line text-sm">{f.comment}</p>}
                        {f.action_steps && (
                          <div className="mt-2 rounded-xl bg-surface p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Recommended action steps</p>
                            <p className="mt-1 whitespace-pre-line text-sm">{f.action_steps}</p>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : <p className="py-4 text-center text-sm text-fg-muted">No feedback yet.</p>}
            </CardBody>
          </Card>
        </div>

        {isOwner && (
          <Card className="h-fit">
            <CardHeader title="Send to sponsor / team leader" icon={<Send className="size-4" />} description="They get a notification and can read your plan." />
            <CardBody>
              <SendToLeaders leaders={leaders} kind="goal" itemId={goal.id}
                title={`My goals for ${formatDate(goal.month, { month: "long", year: "numeric" })}`}
                body={[
                  ...rows.map((r) => `${r.label}: ${r.money ? formatMoney(r.target) : r.target}`),
                  ...extra.map((x) => `${x.label}: ${x.value}`),
                  methods.length ? `Prospecting methods: ${methods.join(", ")}` : "",
                  books.length ? `Books to read: ${books.join("; ")}` : "",
                  goal.personal_development_target ? `Personal development: ${goal.personal_development_target}` : "",
                  goal.plan_text ? `\nMy plan:\n${goal.plan_text}` : "",
                  goal.custom_goals?.length ? `\nTo-do list:\n${goal.custom_goals.map((c) => `• ${c.title}${c.target != null ? ` (${c.target} ${c.unit ?? ""})` : ""}`).join("\n")}` : "",
                ].filter(Boolean).join("\n")} />
            </CardBody>
          </Card>
        )}
        {canReview && (
          <Card className="h-fit lg:sticky lg:top-24">
            <CardHeader title="Review" icon={<CircleCheck className="size-4" />} description="Your feedback notifies the member instantly." />
            <CardBody><ReviewPanel goalId={id} canDecide={goal.status === "submitted"} /></CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
