"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ListChecks, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/form";
import { Progress } from "@/components/ui/misc";
import { SubmitButton } from "@/components/ui/submit-button";
import type { UpworkInput, UpworkReport } from "@/lib/upwork";
import { analyseUpworkAction, unlockMemberAction } from "./actions";

export function AnalyserForm({ last }: { last: UpworkInput | null }) {
  const [state, action] = useActionState(analyseUpworkAction, null);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok && state.id) { router.push(`/tools/upwork?r=${state.id}`); window.scrollTo({ top: 0, behavior: "smooth" }); }
  }, [state, router]);
  const d = last ?? ({} as Partial<UpworkInput>);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="What do you offer?" htmlFor="niche"><Input id="niche" name="niche" maxLength={200} defaultValue={d.niche} placeholder="e.g. Shopify store design" /></Field>
        <Field label="Who are your ideal clients?" htmlFor="target_clients"><Input id="target_clients" name="target_clients" maxLength={500} defaultValue={d.target_clients} placeholder="e.g. US fashion brands" /></Field>
      </div>
      <Field label="Profile title" htmlFor="title"><Input id="title" name="title" required maxLength={200} defaultValue={d.title} placeholder="Your current Upwork title" /></Field>
      <Field label="Profile overview" htmlFor="overview" hint="Paste the whole overview.">
        <Textarea id="overview" name="overview" required rows={8} maxLength={6000} defaultValue={d.overview} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Skills tags" htmlFor="skills"><Input id="skills" name="skills" maxLength={1500} defaultValue={d.skills} placeholder="Comma separated" /></Field>
        <Field label="Hourly rate" htmlFor="hourly_rate"><Input id="hourly_rate" name="hourly_rate" maxLength={60} defaultValue={d.hourly_rate} placeholder="e.g. $15/hr" /></Field>
      </div>
      <Field label="Portfolio items (optional)" htmlFor="portfolio" hint="Title and a line about each project.">
        <Textarea id="portfolio" name="portfolio" rows={4} maxLength={4000} defaultValue={d.portfolio} />
      </Field>
      <Field label="Your stats (optional)" htmlFor="stats" hint="Job Success Score, jobs done, total earned, reviews, badges, or “new freelancer”.">
        <Input id="stats" name="stats" maxLength={1500} defaultValue={d.stats} />
      </Field>
      <SubmitButton className="h-12 w-full text-base font-semibold" pendingLabel="Analysing your profile… (up to a minute)">
        <Sparkles className="size-5" aria-hidden />Analyse my profile
      </SubmitButton>
    </form>
  );
}

function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{label}</p>
        <Button size="sm" variant="ghost" onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* blocked */ } }}>
          {copied ? <Check className="size-4 text-success" aria-hidden /> : <Copy className="size-4" aria-hidden />}{copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="whitespace-pre-line text-sm">{text}</p>
    </div>
  );
}

export function ReportView({ report, createdAt }: { report: UpworkReport; createdAt: string }) {
  const score = Math.round(report.overall_score);
  const tone = score >= 75 ? "text-success" : score >= 50 ? "text-warning" : "text-danger";
  return (
    <div className="card space-y-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-5">
        <div className="text-center">
          <p className={`text-5xl font-extrabold tabular-nums ${tone}`}>{score}</p>
          <p className="text-xs text-fg-subtle">out of 100</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold leading-snug">{report.headline}</p>
          <p className="text-xs text-fg-subtle">Report from {new Date(createdAt).toLocaleString()}</p>
        </div>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-2 font-semibold"><Target className="size-4" aria-hidden />Do these first</p>
        <ol className="list-decimal space-y-1 pl-5 text-sm">{report.top_actions.map((a, i) => <li key={i}>{a}</li>)}</ol>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {report.sections.map((s) => (
          <div key={s.name} className="rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{s.name}</p>
              <p className="text-sm font-bold tabular-nums">{s.score}/10</p>
            </div>
            <Progress value={s.score * 10} tone={s.score >= 7 ? "green" : "blue"} className="mt-2" />
            <p className="mt-2 text-sm text-fg-muted">{s.verdict}</p>
            {s.fixes.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{s.fixes.map((f, i) => <li key={i}>{f}</li>)}</ul>}
          </div>
        ))}
      </div>

      <CopyBlock label="Suggested title" text={report.rewritten_title} />
      <CopyBlock label="Suggested overview" text={report.rewritten_overview} />
      {report.suggested_skills.length > 0 && <CopyBlock label="Skill tags to use" text={report.suggested_skills.join(", ")} />}
      <div className="rounded-2xl bg-surface-muted p-4 text-sm"><p className="mb-1 font-semibold">Rate advice</p>{report.rate_advice}</div>

      <div>
        <p className="mb-2 flex items-center gap-2 font-semibold"><ListChecks className="size-4" aria-hidden />Your 7-day plan</p>
        <ul className="space-y-2">
          {report.seven_day_plan.map((p) => (
            <li key={p.day} className="flex gap-3 text-sm"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">{p.day}</span><span className="pt-1">{p.task}</span></li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function UnlockMemberForm() {
  const [state, action] = useActionState(unlockMemberAction, null);
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <Field label="Member ID" htmlFor="member_id"><Input id="member_id" name="member_id" required placeholder="MX-001024" autoCapitalize="characters" /></Field>
      <SubmitButton className="w-full" pendingLabel="Unlocking…">Unlock Upwork Analyser</SubmitButton>
    </form>
  );
}
