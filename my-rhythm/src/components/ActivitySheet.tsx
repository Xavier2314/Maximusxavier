"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { DateTime } from "luxon";
import {
  AlarmClock, BellRing, CalendarClock, Check, Copy, Flag, MapPin, Pause, Pencil, Play, Repeat, RotateCcw, SkipForward, Timer, Trash2,
} from "lucide-react";
import { Badge, Button, ConfirmDialog, Field, Input, Segmented, Sheet, Spinner, Textarea, Toggle, clsx } from "./ui";
import { ActivityForm, type FormValue } from "./ActivityForm";
import { CategoryIcon } from "./CategoryIcon";
import { useToast } from "./toast";
import { api, useApi } from "@/lib/client/api";
import { sendOrQueue } from "@/lib/client/outbox";
import { useNow } from "@/lib/client/useNow";
import { CLASS_LABEL, countdown, durationLabel, offsetLabel, t12 } from "@/lib/client/format";
import { describeRecurrence } from "@/lib/schedule/occurrences";
import type { OccurrenceView } from "@/lib/data";
import type { ActivityRow, CategoryRow, ReminderRuleRow } from "@/lib/types";

type Scope = "this" | "following" | "all";

export function ActivitySheet({
  occ, tz, categories, onClose, onChanged,
}: { occ: OccurrenceView | null; tz: string; categories: CategoryRow[]; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const { data, mutate } = useApi<{ activity: ActivityRow & { reminder_rules: ReminderRuleRow[] } }>(occ ? `/api/activities/${occ.activityId}` : null);
  const a = data?.activity;
  const [mode, setMode] = useState<"view" | "edit" | "reschedule" | "reminders">("view");
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [scope, setScope] = useState<Scope>("this");
  const [form, setForm] = useState<FormValue | null>(null);
  const [resched, setResched] = useState({ date: "", time: "" });
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const now = useNow(1000);

  useEffect(() => {
    if (!occ) return;
    setMode("view");
    setNotes(occ.completion?.notes ?? "");
    setScope(occ.recurring ? "this" : "all");
    const s = DateTime.fromISO(occ.start).setZone(tz);
    setResched({ date: s.toISODate()!, time: s.toFormat("HH:mm") });
    try { setChecks(JSON.parse(localStorage.getItem(`myrhythm.check.${occ.key}`) ?? "{}")); } catch { setChecks({}); }
  }, [occ, tz]);

  if (!occ) return null;
  const s = DateTime.fromISO(occ.start);
  const e = DateTime.fromISO(occ.end);
  const inProgress = occ.state === "in_progress";
  const startedAt = occ.completion?.started_at ? DateTime.fromISO(occ.completion.started_at) : null;
  const elapsed = startedAt ? now - startedAt.toMillis() : 0;
  const cat = categories.find((c) => c.id === occ.categoryId);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(action);
    try {
      const r = (await sendOrQueue("/api/occurrences", { activityId: occ!.activityId, occurrenceDate: occ!.occurrenceDate, action, ...extra })) as { queued?: boolean };
      const msg: Record<string, string> = {
        start: "Started — timer running.", complete: "Marked complete. Well done!", skip: "Skipped for today.", undo: "Status cleared.",
        snooze: `Snoozed. I'll remind you again in ${extra.minutes} minutes.`,
      };
      toast.show("success", r?.queued ? "Saved offline — will sync when you're back online." : msg[action] ?? "Done", action === "complete" || action === "skip" ? {
        label: "Undo", run: async () => { await api("/api/occurrences", { body: { activityId: occ!.activityId, occurrenceDate: occ!.occurrenceDate, action: "undo" } }); onChanged(); },
      } : undefined);
      onChanged();
      if (action !== "start" && action !== "snooze") onClose();
    } catch (err) {
      toast.show("error", err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  function startEdit() {
    if (!a) return;
    const catKey = categories.find((c) => c.id === a.category_id)?.key ?? "personal";
    const st = a.start_time?.slice(0, 5) ?? "09:00";
    const end = DateTime.fromISO(`${a.start_date}T${st}`).plus({ minutes: a.duration_minutes });
    const occStart = DateTime.fromISO(occ!.start).setZone(tz);
    setForm({
      title: occ!.title, category_key: catKey, kind: a.kind, date: scope === "all" ? a.start_date : occStart.toISODate()!,
      start_time: scope === "this" ? occStart.toFormat("HH:mm") : st, end_time: scope === "this" ? DateTime.fromISO(occ!.end).setZone(tz).toFormat("HH:mm") : end.toFormat("HH:mm"),
      end_date: "", all_day: a.all_day, location: a.location ?? "", description: a.description ?? "", notes: a.notes ?? "",
      classification: a.classification, priority: a.priority, repeat: (a.recurrence?.freq as FormValue["repeat"]) ?? "none",
      by_weekday: a.recurrence?.by_weekday ?? [occStart.weekday], until: a.recurrence?.until ?? "",
      prep_minutes: a.prep_minutes, travel_minutes: a.travel_minutes, recovery_minutes: a.recovery_minutes,
      reminders: a.reminder_rules.map((r) => ({ anchor: r.anchor, offset_minutes: r.offset_minutes, message: r.message })),
    });
    setMode("edit");
  }

  async function saveEdit() {
    if (!form || !a) return;
    setBusy("save");
    try {
      const st = DateTime.fromISO(`${form.date}T${form.start_time}`, { zone: tz });
      let en = DateTime.fromISO(`${form.date}T${form.end_time}`, { zone: tz });
      if (en <= st) en = en.plus({ days: 1 });
      // check conflicts for the new time before saving
      const check = await api<{ conflicts: { type: string; message: string }[] }>("/api/schedule/check", { body: { title: form.title, start: st.toISO(), end: en.toISO(), replaces: [occ!.key] } });
      const overlaps = check.conflicts.filter((c) => c.type === "overlap" || c.type === "sleep" || c.type === "duplicate");
      if (overlaps.length && !window.confirm(`Heads up:\n• ${overlaps.map((c) => c.message).join("\n• ")}\n\nSave anyway?`)) return;
      const category_id = categories.find((c) => c.key === form.category_key)?.id ?? null;
      const changes = scope === "this" ? { title: form.title } : {
        title: form.title, category_id, kind: form.kind, location: form.location || null, description: form.description || null, notes: form.notes || null,
        classification: form.classification, priority: form.priority, start_time: form.all_day ? null : form.start_time,
        duration_minutes: form.all_day ? 0 : Math.round(en.diff(st, "minutes").minutes), all_day: form.all_day,
        prep_minutes: form.prep_minutes, travel_minutes: form.travel_minutes, recovery_minutes: form.recovery_minutes,
        recurrence: form.repeat === "none" ? null : { freq: form.repeat, by_weekday: form.repeat === "weekly" ? form.by_weekday : undefined, until: form.until || null },
        ...(a.recurrence ? {} : { start_date: form.date }),
      };
      const res = await api<{ batchId: string }>(`/api/activities/${a.id}`, {
        method: "PATCH",
        body: { scope, occurrenceDate: occ!.occurrenceDate, start: scope === "this" ? st.toISO() : undefined, end: scope === "this" ? en.toISO() : undefined, changes },
      });
      if (scope !== "this") {
        await api(`/api/activities/${a.id}/reminders`, { method: "PUT", body: { rules: form.reminders.map((r) => ({ ...r, enabled: true })) } }).catch(() => {});
      }
      toast.show("success", "Saved. Reminders updated.", { label: "Undo", run: async () => { await api("/api/history/undo", { body: { batchId: res.batchId } }); onChanged(); } });
      onChanged();
      onClose();
    } catch (err) {
      toast.show("error", err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(null);
    }
  }

  async function doReschedule() {
    setBusy("reschedule");
    try {
      const st = DateTime.fromISO(`${resched.date}T${resched.time}`, { zone: tz });
      const en = st.plus({ minutes: e.diff(s, "minutes").minutes });
      const check = await api<{ conflicts: { type: string; message: string }[] }>("/api/schedule/check", { body: { title: occ!.title, start: st.toISO(), end: en.toISO(), replaces: [occ!.key] } });
      const overlaps = check.conflicts.filter((c) => c.type === "overlap" || c.type === "sleep");
      if (overlaps.length && !window.confirm(`Heads up:\n• ${overlaps.map((c) => c.message).join("\n• ")}\n\nMove anyway?`)) return;
      await api("/api/occurrences", { body: { activityId: occ!.activityId, occurrenceDate: occ!.occurrenceDate, action: "reschedule", newStart: st.toISO(), newEnd: en.toISO() } });
      toast.show("success", `Moved to ${st.toFormat("ccc d LLL, h:mm a")}. Reminders updated.`);
      onChanged();
      onClose();
    } catch (err) {
      toast.show("error", err instanceof Error ? err.message : "Could not move");
    } finally {
      setBusy(null);
    }
  }

  async function doDelete() {
    setBusy("delete");
    try {
      const res = await api<{ batchId: string }>(`/api/activities/${occ!.activityId}?scope=${scope}&date=${occ!.occurrenceDate}`, { method: "DELETE" });
      toast.show("success", "Deleted. Its reminders were cancelled.", { label: "Undo", run: async () => { await api("/api/history/undo", { body: { batchId: res.batchId } }); onChanged(); } });
      onChanged();
      onClose();
    } catch (err) {
      toast.show("error", err instanceof Error ? err.message : "Could not delete");
    } finally {
      setBusy(null);
      setConfirmDelete(false);
    }
  }

  async function duplicate() {
    setBusy("dup");
    try {
      await api(`/api/activities/${occ!.activityId}/duplicate`, { body: { date: DateTime.fromISO(occ!.start).setZone(tz).toISODate() } });
      toast.show("success", "Duplicated as a one-time copy on the same day.");
      onChanged();
    } finally {
      setBusy(null);
    }
  }

  const scopePicker = occ.recurring && (
    <Segmented value={scope} onChange={setScope} options={[{ value: "this", label: "This one" }, { value: "following", label: "This & following" }, { value: "all", label: "All" }]} />
  );

  return (
    <>
      <Sheet open={!!occ} onClose={onClose} title={
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl text-white" style={{ backgroundColor: cat?.color ?? "#6b7280" }}><CategoryIcon icon={cat?.icon} /></span>
          <span className="truncate">{occ.title}</span>
        </div>
      }>
        {mode === "view" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{occ.allDay ? "All day" : `${t12(occ.start, tz)} – ${t12(occ.end, tz)}`}</span>
              <span className="text-muted">{s.setZone(tz).toFormat("cccc d LLLL")}</span>
              {!occ.allDay && <span className="text-muted">· {durationLabel(Math.round(e.diff(s, "minutes").minutes))}</span>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {cat && <Badge color={cat.color}>{cat.name}</Badge>}
              <Badge>{CLASS_LABEL[occ.classification]}</Badge>
              {occ.recurring && <Badge><Repeat className="h-3 w-3" /> {a ? describeRecurrence(a.recurrence) : "Repeats"}</Badge>}
              {occ.modified && <Badge color="#2563eb">Changed for this day</Badge>}
              {occ.status === "needs_reschedule" && <Badge color="#b7791f"><Flag className="h-3 w-3" /> Needs rescheduling</Badge>}
              {occ.state === "completed" && <Badge color="#f97316"><Check className="h-3 w-3" /> Completed</Badge>}
              {occ.state === "skipped" && <Badge>Skipped</Badge>}
              {occ.state === "missed" && <Badge color="#c2413b">Missed</Badge>}
            </div>
            {occ.exceptionNote && <p className="rounded-xl bg-warn-soft p-3 text-sm">{occ.exceptionNote}</p>}
            {occ.location && <p className="flex items-center gap-2 text-sm text-ink-2"><MapPin className="h-4 w-4" /> {occ.location}</p>}
            {a?.description && <p className="whitespace-pre-wrap text-sm text-ink-2">{a.description}</p>}
            {a?.notes && <p className="whitespace-pre-wrap rounded-xl bg-surface-2/60 p-3 text-sm">{a.notes}</p>}

            {inProgress && (
              <div className="flex items-center justify-between rounded-2xl bg-sage-soft p-4">
                <div className="flex items-center gap-2"><Timer className="h-5 w-5 text-sage" /><span className="text-sm font-medium">In progress</span></div>
                <span className="font-display text-2xl tabular-nums">{countdown(elapsed).replace("now", "0:00")}</span>
              </div>
            )}

            {a && a.checklist.length > 0 && (
              <div>
                <p className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-muted">Checklist</p>
                <ul className="space-y-1">
                  {a.checklist.map((c) => (
                    <li key={c.id}>
                      <label className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-2">
                        <input type="checkbox" className="h-5 w-5 accent-[var(--sage)]" checked={!!checks[c.id]} onChange={(ev) => {
                          const next = { ...checks, [c.id]: ev.target.checked };
                          setChecks(next);
                          try { localStorage.setItem(`myrhythm.check.${occ.key}`, JSON.stringify(next)); } catch {}
                        }} />
                        <span className={clsx("text-[15px]", checks[c.id] && "text-muted line-through")}>{c.text}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {occ.state !== "cancelled" && (
              <>
                <Field label="Notes for this session (optional)">
                  <Textarea value={notes} onChange={(ev) => setNotes(ev.target.value)} placeholder="How did it go?" className="min-h-[72px]" />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  {occ.state !== "completed" && !inProgress && <Button variant="secondary" onClick={() => act("start")} loading={busy === "start"}><Play className="h-4 w-4" /> Start</Button>}
                  {inProgress && <Button variant="secondary" onClick={() => act("undo")} loading={busy === "undo"}><Pause className="h-4 w-4" /> Stop timer</Button>}
                  {occ.state !== "completed" && occ.state !== "skipped" && (
                    <Link href={`/timer?a=${occ.activityId}&d=${occ.occurrenceDate}&title=${encodeURIComponent(occ.title)}`} className="col-span-2">
                      <Button variant="soft" className="w-full"><Timer className="h-4 w-4" /> Time this with the timer</Button>
                    </Link>
                  )}
                  {occ.state !== "completed" && <Button variant="sage" onClick={() => act("complete", { notes: notes || undefined })} loading={busy === "complete"}><Check className="h-4 w-4" /> Complete</Button>}
                  {occ.state !== "skipped" && occ.state !== "completed" && <Button variant="secondary" onClick={() => act("skip", { notes: notes || undefined })} loading={busy === "skip"}><SkipForward className="h-4 w-4" /> Skip</Button>}
                  {(occ.state === "completed" || occ.state === "skipped") && <Button variant="secondary" onClick={() => act("undo")} loading={busy === "undo"}><RotateCcw className="h-4 w-4" /> Undo status</Button>}
                </div>
                {occ.groupKey === "devotion" && occ.state === "completed" && (
                  <Link href="/spiritual?tab=journal" className="block rounded-xl bg-lavender-soft p-3 text-center text-sm font-medium">Record today&apos;s reflection →</Link>
                )}
                {occ.state !== "completed" && occ.state !== "skipped" && (
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-ink-2"><AlarmClock className="h-4 w-4" /> Snooze reminder</p>
                    <div className="grid grid-cols-4 gap-2">
                      {[5, 10, 15, 30].map((m) => <Button key={m} size="sm" variant="soft" onClick={() => act("snooze", { minutes: m })} disabled={!!busy}>{m} min</Button>)}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="grid grid-cols-2 gap-2 border-t border-line pt-4 sm:grid-cols-4">
              <Button size="sm" variant="ghost" onClick={() => setMode("reschedule")}><CalendarClock className="h-4 w-4" /> Reschedule</Button>
              <Button size="sm" variant="ghost" onClick={() => { setScope(occ.recurring ? "all" : "all"); setMode("reminders"); }}><BellRing className="h-4 w-4" /> Reminders</Button>
              <Button size="sm" variant="ghost" onClick={() => { setScope(occ.recurring ? "this" : "all"); startEdit(); }} disabled={!a}><Pencil className="h-4 w-4" /> Edit</Button>
              <Button size="sm" variant="ghost" onClick={duplicate} loading={busy === "dup"}><Copy className="h-4 w-4" /> Duplicate</Button>
              <Button size="sm" variant="ghost" className="col-span-2 text-danger sm:col-span-4" onClick={() => { setScope(occ.recurring ? "this" : "all"); setConfirmDelete(true); }}><Trash2 className="h-4 w-4" /> Delete</Button>
            </div>
          </div>
        )}

        {mode === "reschedule" && (
          <div className="space-y-4">
            <p className="text-sm text-muted">Move {occ.recurring ? "just this occurrence" : "this activity"}. I&apos;ll check for conflicts first.</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date"><Input type="date" value={resched.date} onChange={(ev) => setResched({ ...resched, date: ev.target.value })} /></Field>
              <Field label="Start time"><Input type="time" value={resched.time} onChange={(ev) => setResched({ ...resched, time: ev.target.value })} /></Field>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setMode("view")}>Back</Button>
              <Button onClick={doReschedule} loading={busy === "reschedule"}>Move</Button>
            </div>
          </div>
        )}

        {mode === "edit" && form && (
          <div className="space-y-4">
            {scopePicker && <div><p className="mb-2 text-[13px] font-medium text-ink-2">Apply changes to</p>{scopePicker}</div>}
            {scope === "this" && occ.recurring ? (
              <div className="space-y-3">
                <Field label="Title for this day"><Input value={form.title} onChange={(ev) => setForm({ ...form, title: ev.target.value })} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date"><Input type="date" value={form.date} onChange={(ev) => setForm({ ...form, date: ev.target.value })} /></Field>
                  <span />
                  <Field label="Start"><Input type="time" value={form.start_time} onChange={(ev) => setForm({ ...form, start_time: ev.target.value })} /></Field>
                  <Field label="End"><Input type="time" value={form.end_time} onChange={(ev) => setForm({ ...form, end_time: ev.target.value })} /></Field>
                </div>
              </div>
            ) : (
              <ActivityForm value={form} onChange={setForm} categories={categories} />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setMode("view")}>Cancel</Button>
              <Button onClick={saveEdit} loading={busy === "save"}>Save</Button>
            </div>
          </div>
        )}

        {mode === "reminders" && a && <ReminderRulesEditor activity={a} onSaved={() => { mutate(); onChanged(); setMode("view"); }} onCancel={() => setMode("view")} />}
        {mode === "reminders" && !a && <Spinner />}
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete “${occ.title}”?`}
        danger
        confirmLabel="Delete"
        loading={busy === "delete"}
        onConfirm={doDelete}
        body={
          <div className="space-y-3">
            {occ.recurring ? <>{scopePicker}<p>Its reminders will be cancelled. You can undo this from Change history.</p></> : <p>Its reminders will be cancelled. You can undo this from Change history.</p>}
          </div>
        }
      />
    </>
  );
}

function ReminderRulesEditor({ activity, onSaved, onCancel }: { activity: ActivityRow & { reminder_rules: ReminderRuleRow[] }; onSaved: () => void; onCancel: () => void }) {
  const [rules, setRules] = useState(activity.reminder_rules.map((r) => ({ anchor: r.anchor, offset_minutes: r.offset_minutes, message: r.message ?? "", enabled: r.enabled })));
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const add = (anchor: "start" | "end", off: number) => !rules.some((r) => r.anchor === anchor && r.offset_minutes === off) && setRules([...rules, { anchor, offset_minutes: off, message: "", enabled: true }]);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">These apply to every occurrence of “{activity.title}”.</p>
      {rules.length === 0 && <p className="rounded-xl bg-surface-2 p-3 text-sm">No reminders for this activity.</p>}
      {rules.sort((x, y) => (x.anchor === y.anchor ? x.offset_minutes - y.offset_minutes : x.anchor === "start" ? -1 : 1)).map((r, i) => (
        <div key={`${r.anchor}${r.offset_minutes}`} className="rounded-2xl border border-line p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{offsetLabel(r.anchor, r.offset_minutes)}</span>
            <div className="flex items-center gap-2">
              <Toggle checked={r.enabled} onChange={(v) => setRules(rules.map((x, j) => (j === i ? { ...x, enabled: v } : x)))} label="Enabled" />
              <button aria-label="Remove" onClick={() => setRules(rules.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-muted" /></button>
            </div>
          </div>
          <Input className="mt-2" placeholder="Custom message (optional)" value={r.message} maxLength={200} onChange={(ev) => setRules(rules.map((x, j) => (j === i ? { ...x, message: ev.target.value } : x)))} />
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        {[[-60, "1 h before"], [-30, "30 min"], [-15, "15 min"], [-10, "10 min"], [-5, "5 min"], [0, "At start"]].map(([off, label]) => (
          <Button key={off} size="sm" variant="soft" onClick={() => add("start", off as number)}>+ {label}</Button>
        ))}
        <Button size="sm" variant="soft" onClick={() => add("end", 0)}>+ At end</Button>
      </div>
      <CustomOffset onAdd={(m) => add("start", -m)} />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button loading={busy} onClick={async () => {
          setBusy(true);
          try {
            await api(`/api/activities/${activity.id}/reminders`, { method: "PUT", body: { rules: rules.map((r) => ({ ...r, message: r.message || null })) } });
            toast.show("success", "Reminders saved. Upcoming alerts re-planned.");
            onSaved();
          } catch (e) {
            toast.show("error", e instanceof Error ? e.message : "Failed");
          } finally {
            setBusy(false);
          }
        }}>Save reminders</Button>
      </div>
    </div>
  );
}

function CustomOffset({ onAdd }: { onAdd: (minutes: number) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="flex gap-2">
      <Input type="number" min={1} max={10080} placeholder="Custom: minutes before" value={v} onChange={(e) => setV(e.target.value)} />
      <Button variant="secondary" onClick={() => { const n = Number(v); if (n > 0) { onAdd(n); setV(""); } }}>Add</Button>
    </div>
  );
}
