"use client";
import { useMemo, useState } from "react";
import { DateTime } from "luxon";
import { Plus, Trash2 } from "lucide-react";
import { Button, Field, Input, Select, Textarea, Toggle, clsx } from "./ui";
import type { ActivityDraft } from "@/lib/schedule/draft";
import type { CategoryRow, Recurrence } from "@/lib/types";
import { offsetLabel } from "@/lib/client/format";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PRESETS = [-60, -30, -15, -10, -5, 0];

export interface FormValue {
  title: string;
  category_key: string;
  kind: string;
  date: string;
  start_time: string;
  end_time: string;
  end_date: string;
  all_day: boolean;
  location: string;
  description: string;
  notes: string;
  classification: "fixed" | "flexible" | "essential" | "optional";
  priority: number;
  repeat: "none" | "daily" | "weekly" | "monthly";
  by_weekday: number[];
  until: string;
  prep_minutes: number;
  travel_minutes: number;
  recovery_minutes: number;
  reminders: { anchor: "start" | "end"; offset_minutes: number; message?: string | null }[];
}

export function emptyForm(tz: string, date?: string): FormValue {
  const now = DateTime.now().setZone(tz);
  const start = now.plus({ hours: 1 }).startOf("hour");
  return {
    title: "", category_key: "personal", kind: "event", date: date ?? start.toISODate()!, start_time: start.toFormat("HH:mm"),
    end_time: start.plus({ hours: 1 }).toFormat("HH:mm"), end_date: "", all_day: false, location: "", description: "", notes: "",
    classification: "flexible", priority: 3, repeat: "none", by_weekday: [start.weekday], until: "",
    prep_minutes: 0, travel_minutes: 0, recovery_minutes: 0, reminders: [{ anchor: "start", offset_minutes: -10 }, { anchor: "start", offset_minutes: 0 }],
  };
}

export function draftToForm(d: ActivityDraft, tz: string): FormValue {
  const base = emptyForm(tz, d.start_date);
  const s = d.start_time ? DateTime.fromISO(`${d.start_date}T${d.start_time}`, { zone: tz }) : null;
  const e = s?.plus({ minutes: d.duration_minutes });
  return {
    ...base,
    title: d.title, category_key: d.category_key, kind: d.kind, date: d.start_date, start_time: d.start_time?.slice(0, 5) ?? base.start_time,
    end_time: e ? e.toFormat("HH:mm") : base.end_time, end_date: e && e.toISODate() !== d.start_date ? e.toISODate()! : d.end_date ?? "",
    all_day: d.all_day, location: d.location ?? "", description: d.description ?? "", notes: d.notes ?? "", classification: d.classification,
    priority: d.priority, repeat: (d.recurrence?.freq as FormValue["repeat"]) ?? "none", by_weekday: d.recurrence?.by_weekday ?? base.by_weekday,
    until: d.recurrence?.until ?? "", prep_minutes: d.prep_minutes, travel_minutes: d.travel_minutes, recovery_minutes: d.recovery_minutes,
    reminders: (d.reminders ?? base.reminders).map((r) => ({ anchor: r.anchor ?? "start", offset_minutes: r.offset_minutes, message: r.message })),
  };
}

export function formToDraft(f: FormValue, tz: string, source: ActivityDraft["source"] = "manual"): ActivityDraft {
  let duration = 0;
  if (!f.all_day) {
    const s = DateTime.fromISO(`${f.date}T${f.start_time}`, { zone: tz });
    let e = DateTime.fromISO(`${f.end_date || f.date}T${f.end_time}`, { zone: tz });
    if (e <= s) e = e.plus({ days: 1 }); // crosses midnight
    duration = Math.round(e.diff(s, "minutes").minutes);
  }
  const recurrence: Recurrence | null =
    f.repeat === "none" ? null : { freq: f.repeat, by_weekday: f.repeat === "weekly" ? f.by_weekday : undefined, until: f.until || null };
  return {
    title: f.title.trim(), category_key: f.category_key, kind: f.kind, start_date: f.date, start_time: f.all_day ? null : f.start_time,
    duration_minutes: duration, all_day: f.all_day, end_date: f.all_day && f.end_date ? f.end_date : null, location: f.location || null,
    description: f.description || null, notes: f.notes || null, classification: f.classification, priority: f.priority, recurrence,
    prep_minutes: f.prep_minutes, travel_minutes: f.travel_minutes, recovery_minutes: f.recovery_minutes, reminders: f.reminders, source,
  } as ActivityDraft;
}

export function ActivityForm({
  value, onChange, categories, compact,
}: { value: FormValue; onChange: (v: FormValue) => void; categories: Pick<CategoryRow, "key" | "name" | "color">[]; compact?: boolean }) {
  const set = <K extends keyof FormValue>(k: K, v: FormValue[K]) => onChange({ ...value, [k]: v });
  const [advanced, setAdvanced] = useState(!compact);
  const [custom, setCustom] = useState("");
  const crossesMidnight = useMemo(() => !value.all_day && !value.end_date && value.end_time <= value.start_time, [value]);

  return (
    <div className="space-y-4">
      <Field label="Event name">
        <Input value={value.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Business meeting" required maxLength={200} />
      </Field>

      <div>
        <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Category</span>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button key={c.key} type="button" onClick={() => set("category_key", c.key)}
              className={clsx("rounded-full border px-3 py-1.5 text-sm font-medium transition", value.category_key === c.key ? "border-transparent text-white" : "border-line text-ink-2")}
              style={value.category_key === c.key ? { backgroundColor: c.color } : undefined}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-surface-2/60 px-3 py-2">
        <span className="text-sm font-medium">All-day</span>
        <Toggle checked={value.all_day} onChange={(v) => set("all_day", v)} label="All-day" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date"><Input type="date" value={value.date} onChange={(e) => set("date", e.target.value)} required /></Field>
        {value.all_day ? (
          <Field label="End date (optional)"><Input type="date" value={value.end_date} min={value.date} onChange={(e) => set("end_date", e.target.value)} /></Field>
        ) : (
          <Field label="Ends on (multi-day)"><Input type="date" value={value.end_date} min={value.date} onChange={(e) => set("end_date", e.target.value)} /></Field>
        )}
        {!value.all_day && (
          <>
            <Field label="Start time"><Input type="time" value={value.start_time} onChange={(e) => set("start_time", e.target.value)} required /></Field>
            <Field label="End time" hint={crossesMidnight ? "Ends after midnight" : undefined}><Input type="time" value={value.end_time} onChange={(e) => set("end_time", e.target.value)} required /></Field>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Priority">
          <Select value={value.priority} onChange={(e) => set("priority", Number(e.target.value))}>
            <option value={1}>1 · Highest</option><option value={2}>2 · High</option><option value={3}>3 · Normal</option><option value={4}>4 · Low</option><option value={5}>5 · Lowest</option>
          </Select>
        </Field>
        <Field label="Flexibility">
          <Select value={value.classification} onChange={(e) => set("classification", e.target.value as FormValue["classification"])}>
            <option value="fixed">Fixed — don&apos;t move</option><option value="essential">Essential</option><option value="flexible">Flexible</option><option value="optional">Optional</option>
          </Select>
        </Field>
      </div>

      <Field label="Repeat">
        <Select value={value.repeat} onChange={(e) => set("repeat", e.target.value as FormValue["repeat"])}>
          <option value="none">Does not repeat</option><option value="daily">Every day</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
        </Select>
      </Field>
      {value.repeat === "weekly" && (
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map((d, i) => {
            const n = i + 1;
            const on = value.by_weekday.includes(n);
            return (
              <button key={d} type="button" aria-pressed={on} onClick={() => set("by_weekday", on ? value.by_weekday.filter((x) => x !== n) : [...value.by_weekday, n].sort())}
                className={clsx("h-10 w-11 rounded-xl text-sm font-medium", on ? "bg-lavender text-white" : "bg-surface-2 text-ink-2")}>{d}</button>
            );
          })}
        </div>
      )}
      {value.repeat !== "none" && <Field label="Repeat until (optional)"><Input type="date" value={value.until} min={value.date} onChange={(e) => set("until", e.target.value)} /></Field>}

      <div>
        <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Reminders</span>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => {
            const on = value.reminders.some((r) => r.anchor === "start" && r.offset_minutes === p);
            return (
              <button key={p} type="button" aria-pressed={on}
                onClick={() => set("reminders", on ? value.reminders.filter((r) => !(r.anchor === "start" && r.offset_minutes === p)) : [...value.reminders, { anchor: "start", offset_minutes: p }])}
                className={clsx("rounded-full px-3 py-1.5 text-sm", on ? "bg-sage text-white" : "bg-surface-2 text-ink-2")}>
                {p === 0 ? "At start" : p === -60 ? "1 h before" : `${-p} min`}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex gap-2">
          <Input type="number" min={1} max={10080} placeholder="Custom minutes before" value={custom} onChange={(e) => setCustom(e.target.value)} />
          <Button type="button" variant="secondary" onClick={() => { const n = Number(custom); if (n > 0) { set("reminders", [...value.reminders, { anchor: "start", offset_minutes: -n }]); setCustom(""); } }}><Plus className="h-4 w-4" /></Button>
        </div>
        {value.reminders.filter((r) => !PRESETS.includes(r.offset_minutes) || r.anchor === "end").map((r, i) => (
          <div key={i} className="mt-2 flex items-center justify-between rounded-xl bg-surface-2/60 px-3 py-2 text-sm">
            <span>{offsetLabel(r.anchor, r.offset_minutes)}{r.message ? ` — “${r.message}”` : ""}</span>
            <button type="button" aria-label="Remove reminder" onClick={() => set("reminders", value.reminders.filter((x) => x !== r))}><Trash2 className="h-4 w-4 text-muted" /></button>
          </div>
        ))}
      </div>

      {!advanced ? (
        <button type="button" className="text-sm font-medium text-lavender" onClick={() => setAdvanced(true)}>More options (location, travel time, notes…)</button>
      ) : (
        <>
          <Field label="Location"><Input value={value.location} onChange={(e) => set("location", e.target.value)} placeholder="Optional" /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Prep (min)"><Input type="number" min={0} max={1440} value={value.prep_minutes} onChange={(e) => set("prep_minutes", Number(e.target.value) || 0)} /></Field>
            <Field label="Travel (min)"><Input type="number" min={0} max={1440} value={value.travel_minutes} onChange={(e) => set("travel_minutes", Number(e.target.value) || 0)} /></Field>
            <Field label="Recovery (min)"><Input type="number" min={0} max={1440} value={value.recovery_minutes} onChange={(e) => set("recovery_minutes", Number(e.target.value) || 0)} /></Field>
          </div>
          <Field label="Type">
            <Select value={value.kind} onChange={(e) => set("kind", e.target.value)}>
              {["event", "appointment", "meeting", "conference", "church", "family", "project", "task", "block", "trip"].map((k) => <option key={k} value={k}>{k[0].toUpperCase() + k.slice(1)}</option>)}
            </Select>
          </Field>
          <Field label="Description"><Textarea value={value.description} onChange={(e) => set("description", e.target.value)} /></Field>
          <Field label="Notes"><Textarea value={value.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
        </>
      )}
    </div>
  );
}
