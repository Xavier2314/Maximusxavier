"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DateTime } from "luxon";
import { ArrowRight, CalendarClock, Check, CircleAlert, Flag, Info, Pencil, Plus, SkipForward, Sparkles, Trash2, TriangleAlert, X } from "lucide-react";
import { Badge, Button, Card, SectionTitle, Sheet, clsx, Field, Input } from "./ui";
import { ActivityForm, draftToForm, formToDraft, type FormValue } from "./ActivityForm";
import { computeProposed, type ProposalPayload, type Recommendation } from "@/lib/schedule/analyze";
import type { ActivityDraft } from "@/lib/schedule/draft";
import type { CategoryRow } from "@/lib/types";
import { api } from "@/lib/client/api";
import { useToast } from "./toast";
import { CLASS_LABEL, dayLabel, t12 } from "@/lib/client/format";

export interface ProposalRecord {
  id: string;
  title: string;
  summary: string | null;
  ai_explanation: string | null;
  payload: ProposalPayload;
  status: string;
}

const ACTION_ICON = {
  create_activity: Plus, move_occurrence: CalendarClock, cancel_occurrence: Trash2, skip_occurrence: SkipForward, flag_occurrence: Flag, note: Info,
} as const;

const CHANGE_STYLE: Record<string, string> = {
  new: "bg-sage-soft text-sage", moved: "bg-lavender-soft text-lavender", skipped: "bg-surface-2 text-muted line-through",
  cancelled: "bg-danger-soft text-danger line-through", flagged: "bg-warn-soft text-warn",
};

type Override = { draft?: ActivityDraft; newStart?: string; newEnd?: string };

export function ProposalReview({ proposal, categories, onDone }: { proposal: ProposalRecord; categories: CategoryRow[]; onDone?: (applied: boolean) => void }) {
  const p = proposal.payload;
  const tz = p.timezone;
  const toast = useToast();
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(p.recommendations.filter((r) => r.selected).map((r) => r.id)));
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [editing, setEditing] = useState<{ rec: Recommendation; form?: FormValue; start?: string; end?: string } | null>(null);
  const [busy, setBusy] = useState<"apply" | "reject" | null>(null);
  const [failed, setFailed] = useState<{ id: string; error: string }[]>([]);
  const decided = proposal.status !== "pending";

  const effective = useMemo<ProposalPayload>(() => ({
    ...p,
    recommendations: p.recommendations.map((r) => {
      const o = overrides[r.id];
      if (!o) return r;
      if (o.draft) return { ...r, draft: o.draft, title: `Add “${o.draft.title}”` };
      if (o.newStart && r.targets?.length === 1) return { ...r, targets: [{ ...r.targets[0], newStart: o.newStart, newEnd: o.newEnd }] };
      return r;
    }),
  }), [p, overrides]);
  const proposed = useMemo(() => computeProposed(effective, selected), [effective, selected]);
  const actionable = effective.recommendations.filter((r) => r.action !== "note");
  const notes = effective.recommendations.filter((r) => r.action === "note");

  function toggle(r: Recommendation) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(r.id)) next.delete(r.id);
      else {
        // alternatives for the same item are mutually exclusive
        if (r.choiceGroup) for (const o of p.recommendations) if (o.choiceGroup === r.choiceGroup) next.delete(o.id);
        next.add(r.id);
      }
      return next;
    });
  }

  async function apply(ids: string[]) {
    setBusy("apply");
    setFailed([]);
    try {
      const res = await api<{ applied: string[]; failed: { id: string; error: string }[]; batchId: string | null; status: string }>(`/api/proposals/${proposal.id}/apply`, {
        body: { selected: ids, overrides },
      });
      setFailed(res.failed);
      if (res.applied.length) {
        toast.show("success", `Saved ${res.applied.length} change${res.applied.length > 1 ? "s" : ""}. Reminders updated.`, res.batchId ? {
          label: "Undo",
          run: async () => { await api("/api/history/undo", { body: { batchId: res.batchId } }); toast.show("info", "Changes undone."); router.refresh(); },
        } : undefined);
        onDone?.(true);
      } else if (res.failed.length) {
        toast.show("error", "Nothing was saved — see the problems below.");
      } else {
        toast.show("info", "Nothing selected, so nothing changed.");
        onDone?.(false);
      }
    } catch (e) {
      toast.show("error", e instanceof Error ? e.message : "Could not apply changes");
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    setBusy("reject");
    try {
      await api(`/api/proposals/${proposal.id}/reject`, { method: "POST" });
      toast.show("info", "Suggestions rejected. Your schedule is unchanged.");
      onDone?.(false);
    } finally {
      setBusy(null);
    }
  }

  const conflicts = p.conflicts.filter((c) => c.type !== "duplicate" || true);

  return (
    <div className="space-y-5">
      {(proposal.ai_explanation || proposal.summary) && (
        <Card className="flex gap-3 border-lavender/30 bg-lavender-soft/60 p-4">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-lavender" />
          <div className="space-y-1 text-[15px]">
            {proposal.ai_explanation && <p>{proposal.ai_explanation}</p>}
            {proposal.summary && <p className={proposal.ai_explanation ? "text-sm text-muted" : ""}>{proposal.summary}</p>}
          </div>
        </Card>
      )}

      {conflicts.length > 0 && (
        <section>
          <SectionTitle>Conflicts</SectionTitle>
          <Card className="divide-y divide-line">
            {conflicts.map((c) => (
              <div key={c.id} className="flex items-start gap-3 p-3 text-sm">
                {c.severity === "high" ? <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warn" />}
                <div className="flex-1">
                  <p>{c.message}</p>
                  {c.occurrence && <p className="mt-0.5 text-xs text-muted">{CLASS_LABEL[c.occurrence.classification]} · {dayLabel(c.occurrence.start, tz)}</p>}
                </div>
              </div>
            ))}
          </Card>
        </section>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <section>
          <SectionTitle>Original schedule</SectionTitle>
          <Card className="p-3">
            {p.original.length === 0 ? (
              <p className="p-2 text-sm text-muted">No existing activities are affected.</p>
            ) : (
              <ul className="space-y-1.5">
                {p.original.map((o) => (
                  <li key={o.key} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm">
                    <span className="truncate">{o.title}</span>
                    <span className="shrink-0 text-xs text-muted tabular-nums">{dayLabel(o.start, tz, "ccc")} {t12(o.start, tz)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
        <section>
          <SectionTitle>Proposed schedule</SectionTitle>
          <Card className="p-3">
            {proposed.length === 0 ? (
              <p className="p-2 text-sm text-muted">Nothing selected — your schedule would stay as it is.</p>
            ) : (
              <ul className="space-y-1.5">
                {proposed.map((x, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={clsx("rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase", CHANGE_STYLE[x.change])}>{x.change}</span>
                      <span className="truncate">{x.title}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted tabular-nums">
                      {x.fromStart && <>{dayLabel(x.fromStart, tz, "ccc")} {t12(x.fromStart, tz)} <ArrowRight className="inline h-3 w-3" /> </>}
                      {dayLabel(x.start, tz, "ccc")} {t12(x.start, tz)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>

      <section>
        <SectionTitle>Recommendations &amp; reasons</SectionTitle>
        <div className="space-y-2">
          {actionable.map((r) => {
            const Icon = ACTION_ICON[r.action];
            const on = selected.has(r.id);
            const err = failed.find((f) => f.id === r.id);
            return (
              <Card key={r.id} className={clsx("flex items-start gap-3 p-3 transition", on && "ring-2 ring-lavender/50")}>
                <button
                  type="button"
                  disabled={decided}
                  onClick={() => toggle(r)}
                  aria-pressed={on}
                  aria-label={on ? "Deselect" : "Select"}
                  className={clsx("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border", on ? "border-lavender bg-lavender text-white" : "border-line")}
                >
                  {on && <Check className="h-4 w-4" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Icon className="h-4 w-4 text-lavender" />
                    <span className="font-medium">{r.title}</span>
                    {r.classification && <Badge>{CLASS_LABEL[r.classification]}</Badge>}
                    {overrides[r.id] && <Badge color="#8b7fd6">modified</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted">{r.reason}</p>
                  {err && <p className="mt-1 text-sm text-danger">Not applied: {err.error}</p>}
                </div>
                {!decided && (r.action === "create_activity" || (r.action === "move_occurrence" && r.targets?.length === 1)) && (
                  <Button size="icon" variant="ghost" aria-label="Modify suggestion"
                    onClick={() => setEditing(r.action === "create_activity"
                      ? { rec: r, form: draftToForm((overrides[r.id]?.draft ?? r.draft)!, tz) }
                      : { rec: r, start: overrides[r.id]?.newStart ?? r.targets![0].newStart, end: overrides[r.id]?.newEnd ?? r.targets![0].newEnd })}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
        {notes.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {notes.map((n) => (
              <div key={n.id} className="flex gap-2 rounded-xl bg-surface-2/60 px-3 py-2 text-sm">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-lavender" />
                <span><span className="font-medium">{n.title}</span> <span className="text-muted">{n.reason}</span></span>
              </div>
            ))}
          </div>
        )}
      </section>

      {decided ? (
        <p className="rounded-xl bg-surface-2 p-3 text-center text-sm text-muted">This proposal was {proposal.status.replace("_", " ")}.</p>
      ) : (
        <div className="pb-safe sticky bottom-20 z-10 -mx-1 flex flex-wrap gap-2 rounded-2xl border border-line bg-surface/95 p-2 backdrop-blur md:bottom-4">
          <Button className="flex-1" onClick={() => apply(p.recommendations.filter((r) => r.selected).map((r) => r.id))} loading={busy === "apply"} disabled={!!busy}>
            <Check className="h-4 w-4" /> Approve all
          </Button>
          <Button className="flex-1" variant="soft" onClick={() => apply([...selected])} disabled={!!busy || selected.size === 0}>
            Approve selected ({selected.size})
          </Button>
          <Button variant="ghost" onClick={reject} loading={busy === "reject"} disabled={!!busy}>
            <X className="h-4 w-4" /> Reject
          </Button>
        </div>
      )}

      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Modify suggestion" footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
          <Button onClick={() => {
            if (!editing) return;
            if (editing.form) setOverrides((o) => ({ ...o, [editing.rec.id]: { draft: formToDraft(editing.form!, tz, editing.rec.draft?.source ?? "manual") } }));
            else if (editing.start && editing.end) setOverrides((o) => ({ ...o, [editing.rec.id]: { newStart: editing.start, newEnd: editing.end } }));
            setSelected((s) => new Set(s).add(editing.rec.id));
            setEditing(null);
          }}>Use these details</Button>
        </div>
      }>
        {editing?.form && <ActivityForm value={editing.form} onChange={(form) => setEditing({ ...editing, form })} categories={categories} compact />}
        {editing && !editing.form && editing.start && (
          <MoveEditor tz={tz} start={editing.start} end={editing.end!} onChange={(start, end) => setEditing({ ...editing, start, end })} />
        )}
      </Sheet>
    </div>
  );
}

function MoveEditor({ tz, start, end, onChange }: { tz: string; start: string; end: string; onChange: (s: string, e: string) => void }) {
  const s = DateTime.fromISO(start).setZone(tz);
  const dur = DateTime.fromISO(end).diff(DateTime.fromISO(start), "minutes").minutes;
  const update = (date: string, time: string) => {
    const ns = DateTime.fromISO(`${date}T${time}`, { zone: tz });
    if (ns.isValid) onChange(ns.toISO()!, ns.plus({ minutes: dur }).toISO()!);
  };
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="New date"><Input type="date" value={s.toISODate()!} onChange={(e) => update(e.target.value, s.toFormat("HH:mm"))} /></Field>
      <Field label="New start time"><Input type="time" value={s.toFormat("HH:mm")} onChange={(e) => update(s.toISODate()!, e.target.value)} /></Field>
      <p className="col-span-2 text-sm text-muted">The new time is re-checked against your fixed commitments when you approve.</p>
    </div>
  );
}
