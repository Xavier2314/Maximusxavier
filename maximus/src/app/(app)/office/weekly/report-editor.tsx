"use client";

import { startTransition, useActionState, useState } from "react";
import { Download, ListChecks, Plus, Sparkles, Trash2 } from "lucide-react";
import { AiFilledBanner, TalkToAi } from "@/components/form-modes";
import { VoiceTextarea } from "@/components/voice";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { METRIC_SECTIONS, formatMetric, type ChallengeRow, type NewServiceRow, type OfficeReport, type ServiceRow } from "@/lib/office-report";
import { cn } from "@/lib/utils";
import { arrangeOfficeReportAction, saveOfficeReportAction } from "./actions";

type Prev = { last: Record<string, number | null> | null; before: Record<string, number | null> | null };

const cell = "border border-border px-2 py-1.5";

export function ReportEditor({ initial, prev, reportId }: { initial: OfficeReport; prev: Prev; reportId?: string }) {
  const [state, dispatch, pending] = useActionState(saveOfficeReportAction, null);
  const [mode, setMode] = useState<"ai" | "form">(initial.status ? "form" : "ai");
  const [r, setR] = useState<OfficeReport>(initial);
  const [aiFilled, setAiFilled] = useState(false);
  const [version, setVersion] = useState(0);
  const set = <K extends keyof OfficeReport>(k: K, v: OfficeReport[K]) => setR((x) => ({ ...x, [k]: v }));
  const setMetric = (k: string, v: string) => setR((x) => ({ ...x, metrics: { ...x.metrics, [k]: v === "" ? null : Number(v.replace(/[,₦$\s]/g, "")) } }));

  const merge = (data: Record<string, unknown>) => {
    setR((x) => {
      const d = data as Partial<OfficeReport>;
      const keep = <T,>(a: T[] | undefined, b: T[]) => (a && a.length ? a : b);
      return {
        ...x,
        team_leaders: d.team_leaders ?? x.team_leaders, director: d.director ?? x.director, location: d.location ?? x.location,
        currency: (d.currency as OfficeReport["currency"]) ?? x.currency,
        metrics: { ...x.metrics, ...Object.fromEntries(Object.entries(d.metrics ?? {}).filter(([, v]) => v !== null && v !== undefined)) },
        services: keep(d.services, x.services), new_services: keep(d.new_services, x.new_services),
        trainings_count: d.trainings_count ?? x.trainings_count, training_topics: d.training_topics ?? x.training_topics,
        timetable: d.timetable ?? x.timetable, fresh_updates: d.fresh_updates ?? x.fresh_updates,
        challenges: keep(d.challenges, x.challenges), notes: d.notes ?? x.notes,
      };
    });
    setAiFilled(true);
    setVersion((v) => v + 1);
    setMode("form");
  };
  const save = (intent: "draft" | "submit") => {
    const fd = new FormData();
    fd.set("report", JSON.stringify(r));
    fd.set("intent", intent);
    startTransition(() => dispatch(fd));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="How do you want to fill the report?">
        {[{ k: "ai" as const, l: "Talk to Maximus AI", h: "Say everything; AI fills the report", I: Sparkles },
          { k: "form" as const, l: "Fill the report", h: "Table by table", I: ListChecks }].map((m) => (
          <button key={m.k} type="button" role="tab" aria-selected={mode === m.k} onClick={() => setMode(m.k)}
            className={cn("flex flex-col items-center gap-1 rounded-2xl border p-3 text-center",
              mode === m.k ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-fg-muted hover:border-primary/40")}>
            <m.I className="size-5" aria-hidden /><span className="text-sm font-semibold">{m.l}</span><span className="hidden text-xs sm:block">{m.h}</span>
          </button>
        ))}
      </div>

      {mode === "ai" ? (
        <TalkToAi arrange={arrangeOfficeReportAction} onArranged={(data) => merge(data)}
          placeholder="e.g. This week we had 53 active members, average attendance 45, 24 newbies, 14 distributors, 9 managers… We got 29 orders and earned 7,335 dollars, 13 newbies got orders… Services: make.com automation, n8n… Challenge was account creation, we used Webshare…" />
      ) : (
        <div key={version} className="space-y-6">
          {aiFilled && <AiFilledBanner />}
          <section className="card space-y-4 p-5">
            <h2 className="text-sm font-semibold">Office details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Team leader(s)" htmlFor="team_leaders"><Input id="team_leaders" value={r.team_leaders ?? ""} onChange={(e) => set("team_leaders", e.target.value)} maxLength={200} /></Field>
              <Field label="Director in charge" htmlFor="director"><Input id="director" value={r.director ?? ""} onChange={(e) => set("director", e.target.value)} maxLength={120} /></Field>
              <Field label="Office location" htmlFor="location"><Input id="location" value={r.location ?? ""} onChange={(e) => set("location", e.target.value)} maxLength={200} /></Field>
              <Field label="Amounts earned in" htmlFor="currency">
                <Select id="currency" value={r.currency} onChange={(e) => set("currency", e.target.value as OfficeReport["currency"])}>
                  <option value="USD">US dollars ($)</option><option value="NGN">Naira (₦)</option>
                </Select>
              </Field>
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead className="bg-surface-muted text-left text-xs font-semibold text-primary">
                  <tr><th className={cell}>Metric</th><th className={cn(cell, "w-36")}>This week</th><th className={cn(cell, "w-28")}>Last week</th><th className={cn(cell, "w-28")}>Week before</th></tr>
                </thead>
                <tbody>
                  {METRIC_SECTIONS.map((sec) => (
                    <SectionRows key={sec.title ?? "main"} title={sec.title}>
                      {sec.metrics.map((m) => (
                        <tr key={m.key}>
                          <td className={cell}>{m.label}{m.hint && <span className="ml-1 text-xs italic text-fg-subtle">({m.hint})</span>}</td>
                          <td className={cn(cell, "p-0")}>
                            <input inputMode="decimal" aria-label={`${m.label} this week`} value={r.metrics[m.key] ?? ""}
                              onChange={(e) => setMetric(m.key, e.target.value)} className="h-9 w-full bg-transparent px-2 tabular-nums outline-none focus:bg-primary-soft" />
                          </td>
                          <td className={cn(cell, "tabular-nums text-fg-muted")}>{formatMetric(prev.last?.[m.key], m.money, r.currency)}</td>
                          <td className={cn(cell, "tabular-nums text-fg-muted")}>{formatMetric(prev.before?.[m.key], m.money, r.currency)}</td>
                        </tr>
                      ))}
                    </SectionRows>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-4 py-2 text-xs text-fg-subtle">Last week and the week before come from your earlier reports. Some numbers were filled from the app; check them.</p>
          </section>

          <RowsTable<ServiceRow> title="Services offered this week" rows={r.services} onChange={(v) => set("services", v)}
            cols={[{ k: "name", l: "Service" }, { k: "orders", l: "Orders", num: true }, { k: "keywords", l: "Top focus keywords" }, { k: "gig_title", l: "Typical gig title" }]} />
          <RowsTable<NewServiceRow> title="New services discovered" rows={r.new_services} onChange={(v) => set("new_services", v)}
            cols={[{ k: "name", l: "Service" }, { k: "messages", l: "Messages", num: true }, { k: "orders", l: "Orders", num: true }, { k: "keywords", l: "Top focus keywords" }, { k: "gig_title", l: "Typical gig title" }]} />

          <section className="card space-y-4 p-5">
            <h2 className="text-sm font-semibold">Training & information</h2>
            <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
              <Field label="No. of trainings" htmlFor="trainings_count">
                <Input id="trainings_count" inputMode="numeric" value={r.trainings_count ?? ""} onChange={(e) => set("trainings_count", e.target.value === "" ? null : Number(e.target.value))} />
              </Field>
              <Field label="Training topic(s)" htmlFor="training_topics"><Input id="training_topics" value={r.training_topics ?? ""} onChange={(e) => set("training_topics", e.target.value)} maxLength={1000} /></Field>
            </div>
            <Field label="Office timetable" htmlFor="timetable">
              <Textarea id="timetable" rows={2} value={r.timetable ?? ""} onChange={(e) => set("timetable", e.target.value)} maxLength={1000} placeholder="e.g. Sunday–Thursday 10am–6pm office activities. Night office 9pm–3am" />
            </Field>
            <Field label="Fresh updates discovered" htmlFor="fresh_updates">
              <Textarea id="fresh_updates" rows={2} value={r.fresh_updates ?? ""} onChange={(e) => set("fresh_updates", e.target.value)} maxLength={2000} />
            </Field>
          </section>

          <RowsTable<ChallengeRow> title="Challenges / issues faced" rows={r.challenges} onChange={(v) => set("challenges", v)}
            cols={[{ k: "challenge", l: "Challenge / issue" }, { k: "solution", l: "Solution applied" }]} />

          <section className="card space-y-2 p-5">
            <Field label="Anything else (optional)" htmlFor="notes" hint="Type or tap Speak">
              <VoiceTextarea id="notes" rows={3} maxLength={4000} value={r.notes ?? ""} onValueChange={(v) => set("notes", v)} />
            </Field>
          </section>
        </div>
      )}

      <FormMessage state={state} />
      <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
        {reportId && (
          <a href={`/print/office-report/${reportId}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 font-medium hover:bg-surface-muted">
            <Download className="size-4" aria-hidden />Download PDF
          </a>
        )}
        <Button variant="outline" onClick={() => save("draft")} disabled={pending}>{pending ? "Saving…" : "Save draft"}</Button>
        <Button onClick={() => save("submit")} disabled={pending}>{initial.status === "submitted" ? "Save changes" : "Submit report"}</Button>
      </div>
    </div>
  );
}

function SectionRows({ title, children }: { title: string | null; children: React.ReactNode }) {
  return (
    <>
      {title && <tr><td colSpan={4} className={cn(cell, "bg-surface-muted/60 font-semibold text-primary")}>{title}</td></tr>}
      {children}
    </>
  );
}

type Col = { k: string; l: string; num?: boolean };
function RowsTable<T extends object>({ title, rows, onChange, cols }: { title: string; rows: T[]; onChange: (rows: T[]) => void; cols: Col[] }) {
  const update = (i: number, k: string, v: string, num?: boolean) =>
    onChange(rows.map((row, j) => (j === i ? { ...row, [k]: num ? (v === "" ? null : Number(v)) : v } : row)));
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {rows.length < 20 && (
          <Button size="sm" variant="ghost" onClick={() => onChange([...rows, {} as T])}><Plus className="size-4" aria-hidden />Add row</Button>
        )}
      </div>
      <div className="overflow-x-auto p-3">
        {rows.length === 0 ? <p className="px-2 py-3 text-sm text-fg-subtle">No rows yet.</p> : (
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead className="bg-surface-muted text-left text-xs font-semibold text-primary">
              <tr><th className={cn(cell, "w-8")}>#</th>{cols.map((c) => <th key={c.k} className={cn(cell, c.num && "w-24")}>{c.l}</th>)}<th className={cn(cell, "w-10")}><span className="sr-only">Remove</span></th></tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td className={cn(cell, "text-fg-subtle")}>{i + 1}</td>
                  {cols.map((c) => (
                    <td key={c.k} className={cn(cell, "p-0")}>
                      <input value={String((row as Record<string, unknown>)[c.k] ?? "")} inputMode={c.num ? "numeric" : undefined}
                        onChange={(e) => update(i, c.k, e.target.value, c.num)} aria-label={`${c.l} row ${i + 1}`}
                        className="h-9 w-full bg-transparent px-2 outline-none focus:bg-primary-soft" />
                    </td>
                  ))}
                  <td className={cn(cell, "p-0 text-center")}>
                    <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label={`Remove row ${i + 1}`}
                      className="grid size-9 place-items-center text-fg-subtle hover:text-danger"><Trash2 className="size-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
