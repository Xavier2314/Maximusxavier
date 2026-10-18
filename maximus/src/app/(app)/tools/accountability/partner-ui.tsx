"use client";

import { useActionState, useState, useTransition } from "react";
import { CalendarClock, Check, Copy, Hand, MessageSquare, Send, Share2, ThumbsUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/form";
import { Avatar, Badge, Progress } from "@/components/ui/misc";
import { SubmitButton } from "@/components/ui/submit-button";
import { MOODS, type ToolGoal } from "@/lib/tools";
import { cn, formatDate, formatRelative } from "@/lib/utils";
import {
  checkinAction, endPartnershipAction, goalCommentAction, requestPartnerAction, respondDeadlineAction, respondPartnerAction, saveSharingAction,
} from "./actions";
import { safeAction } from "@/lib/report-error";
const safe_requestPartnerAction = safeAction(requestPartnerAction, { ok: false, message: "Couldn't save. The app may have just updated. Refresh the page and try again." });
const safe_checkinAction = safeAction(checkinAction, { ok: false, message: "Couldn't save. The app may have just updated. Refresh the page and try again." });

export type Comment = {
  id: string; goal_id: string; author_id: string; kind: "comment" | "encourage" | "request_update" | "deadline";
  body: string | null; proposed_deadline: string | null; proposal_status: "pending" | "accepted" | "declined" | null; created_at: string;
};

export function CodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const text = `Be my accountability partner on Maximus! My code is ${code}. Open Tools > Accountability and enter it.`;
  return (
    <div className="h-fit rounded-3xl bg-brand-navy p-5 text-white shadow-lg ring-1 ring-black/5">
      <p className="text-sm text-white/80">Your partner code</p>
      <p className="mt-2 inline-block rounded-xl bg-white/10 px-3 py-1.5 font-mono text-3xl font-bold tracking-wider text-brand-lime">{code || "—"}</p>
      <p className="mt-2 text-sm text-white/80">Share it with the person you want as your partner.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="lime" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(code); setCopied(true); } catch { /* ignore */ } }}>
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />} {copied ? "Copied" : "Copy"}
        </Button>
        <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-3 text-sm font-medium hover:bg-white/25">
          <Share2 className="size-4" aria-hidden /> WhatsApp
        </a>
      </div>
    </div>
  );
}

export function RequestForm() {
  const [state, action] = useActionState(safe_requestPartnerAction, null);
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <Field label="Their code" htmlFor="code">
        <Input id="code" name="code" required placeholder="ACC-X7K29P" maxLength={10} className="font-mono uppercase" autoComplete="off" />
      </Field>
      <Field label="Message" htmlFor="message" optional>
        <Input id="message" name="message" maxLength={300} placeholder="Let's keep each other on track this month!" />
      </Field>
      <SubmitButton pendingLabel="Sending…"><Send className="size-4" aria-hidden /> Send request</SubmitButton>
    </form>
  );
}

export function RequestRow({ r }: { r: { id: string; incoming: boolean; message: string | null; created_at: string; full_name: string; member_id: string; avatar_url: string | null } }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const act = (accept: boolean) => start(async () => { const res = await respondPartnerAction(r.id, accept); setMsg(res.message); });
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-muted p-3">
      <div className="flex items-center gap-3">
        <Avatar name={r.full_name} src={r.avatar_url} size={40} />
        <div>
          <p className="font-medium">{r.full_name} <span className="text-xs text-fg-subtle">{r.member_id}</span></p>
          <p className="text-sm text-fg-muted">{r.incoming ? "wants you as their partner" : "Waiting for them to accept"} · {formatRelative(r.created_at)}</p>
          {r.message && <p className="mt-1 text-sm italic">&ldquo;{r.message}&rdquo;</p>}
        </div>
      </div>
      {msg ? <p className="text-sm text-fg-muted" role="status">{msg}</p> : r.incoming ? (
        <div className="flex gap-2">
          <Button size="sm" variant="success" disabled={pending} onClick={() => act(true)}><Check className="size-4" aria-hidden /> Accept</Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => act(false)}>Decline</Button>
        </div>
      ) : <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(false)}>Cancel request</Button>}
    </div>
  );
}

type Sharing = { share_goals: boolean; share_habits: boolean; share_focus: boolean; share_score: boolean; checkin_morning: string | null; checkin_evening: string | null };

export function SharingForm({ partnershipId, initial }: { partnershipId: string; initial: Sharing }) {
  const [s, setS] = useState<Sharing>({ ...initial, checkin_morning: initial.checkin_morning?.slice(0, 5) ?? null, checkin_evening: initial.checkin_evening?.slice(0, 5) ?? null });
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toggle = (k: "share_goals" | "share_habits" | "share_focus" | "share_score", label: string) => (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span>{label}</span>
      <input type="checkbox" checked={s[k]} onChange={(e) => setS({ ...s, [k]: e.target.checked })} className="size-5 accent-[var(--primary)]" />
    </label>
  );
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveSharingAction(partnershipId, s); setMsg(r.message); }); }}>
      {toggle("share_goals", "My goals and progress")}
      {toggle("share_habits", "My habits")}
      {toggle("share_focus", "My focus time")}
      {toggle("share_score", "My productivity score")}
      <p className="pt-2 text-sm font-medium">Check-in reminders</p>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Morning" htmlFor="cm"><Input id="cm" type="time" value={s.checkin_morning ?? ""} onChange={(e) => setS({ ...s, checkin_morning: e.target.value || null })} /></Field>
        <Field label="Evening" htmlFor="ce"><Input id="ce" type="time" value={s.checkin_evening ?? ""} onChange={(e) => setS({ ...s, checkin_evening: e.target.value || null })} /></Field>
      </div>
      <p className="text-xs text-fg-subtle">Reminders arrive in your notifications within the hour you pick.</p>
      <Button type="submit" size="sm" disabled={pending}>Save</Button>
      {msg && <p className="text-xs text-fg-muted" role="status">{msg}</p>}
    </form>
  );
}

type Checkin = { slot: "morning" | "evening"; mood: number | null; plan: string | null; done: string | null; blockers: string | null };

export function CheckinForm({ partnershipId, today, existing }: { partnershipId: string; today: string; existing: { morning: Checkin | null; evening: Checkin | null } }) {
  const hour = new Date().getHours();
  const [slot, setSlot] = useState<"morning" | "evening">(hour < 14 ? "morning" : "evening");
  const [state, action] = useActionState(safe_checkinAction, null);
  const cur = existing[slot];
  const [mood, setMood] = useState<number | null>(cur?.mood ?? null);
  return (
    <form action={action} className="space-y-3" key={slot}>
      <FormMessage state={state} />
      <input type="hidden" name="partnership_id" value={partnershipId} />
      <input type="hidden" name="checkin_date" value={today} />
      <input type="hidden" name="slot" value={slot} />
      <input type="hidden" name="mood" value={mood ?? ""} />
      <div className="flex rounded-xl bg-surface-muted p-1 text-sm" role="radiogroup" aria-label="Check-in">
        {(["morning", "evening"] as const).map((x) => (
          <button key={x} type="button" role="radio" aria-checked={slot === x} onClick={() => { setSlot(x); setMood(existing[x]?.mood ?? null); }}
            className={cn("flex-1 rounded-lg px-3 py-1.5", slot === x ? "bg-surface font-medium shadow-sm" : "text-fg-muted")}>
            {x === "morning" ? "Morning plan" : "Evening review"}{existing[x] ? " ✓" : ""}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5" role="group" aria-label="Mood">
        {MOODS.map((m, i) => (
          <button key={m.label} type="button" onClick={() => setMood(i + 1)} aria-pressed={mood === i + 1} title={m.label}
            className={cn("rounded-xl border px-2 py-1 text-lg", mood === i + 1 ? "border-primary bg-primary-soft" : "border-border")}>{m.emoji}</button>
        ))}
      </div>
      {slot === "morning" ? (
        <Textarea name="plan" defaultValue={cur?.plan ?? ""} rows={3} maxLength={1000} placeholder="Today I will… (e.g. call 5 prospects, finish my Academy lesson)" aria-label="Plan" />
      ) : (
        <>
          <Textarea name="done" defaultValue={cur?.done ?? ""} rows={3} maxLength={1000} placeholder="Today I got done…" aria-label="Done" />
          <Textarea name="blockers" defaultValue={cur?.blockers ?? ""} rows={2} maxLength={1000} placeholder="What got in the way? (optional)" aria-label="Blockers" />
        </>
      )}
      <SubmitButton pendingLabel="Sharing…">{cur ? "Update check-in" : "Share check-in"}</SubmitButton>
    </form>
  );
}

export function PartnerGoal({ goal, comments, today, partnerName, viewerId }: { goal: ToolGoal; comments: Comment[]; today: string; partnerName: string; viewerId: string }) {
  const [list, setList] = useState(comments);
  const [text, setText] = useState("");
  const [date, setDate] = useState("");
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const pct = goal.target ? Math.min(100, (goal.progress / goal.target) * 100) : 0;
  function send(kind: Comment["kind"], body?: string, proposed?: string) {
    start(async () => {
      const r = await goalCommentAction({ goal_id: goal.id, kind, body, proposed_deadline: proposed });
      setMsg(r.message);
      if (r.ok) {
        setList((l) => [...l, { id: crypto.randomUUID(), goal_id: goal.id, author_id: viewerId, kind, body: body ?? (kind === "encourage" ? "Keep going, you've got this! 💪" : kind === "request_update" ? "How is this going? Share an update." : null), proposed_deadline: proposed ?? null, proposal_status: kind === "deadline" ? "pending" : null, created_at: new Date().toISOString() }]);
        setText(""); setDate("");
      }
    });
  }
  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{goal.title}</p>
          {goal.deadline && <p className={cn("text-xs", goal.deadline < today ? "text-danger" : "text-fg-muted")}>Due {formatDate(goal.deadline, { day: "numeric", month: "short" })}</p>}
        </div>
        {goal.target != null && <Badge tone={pct >= 100 ? "green" : "blue"}>{goal.progress}/{goal.target} {goal.unit}</Badge>}
      </div>
      {goal.target != null && <Progress value={pct} className="mt-2" label={goal.title} />}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => send("encourage")}><ThumbsUp className="size-4" aria-hidden /> Encourage</Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => send("request_update")}><Hand className="size-4" aria-hidden /> Ask for update</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}><MessageSquare className="size-4" aria-hidden /> {list.length ? `Comments (${list.length})` : "Comment"}</Button>
      </div>
      {open && (
        <div className="mt-3 space-y-2">
          {list.map((c) => (
            <div key={c.id} className="rounded-xl bg-surface-muted px-3 py-2 text-sm">
              <span className="font-medium">{c.author_id === viewerId ? "You" : partnerName}: </span>
              {c.kind === "deadline" ? <>suggested a deadline of <b>{formatDate(c.proposed_deadline, { day: "numeric", month: "short" })}</b> <Badge>{c.proposal_status}</Badge></> : c.body}
            </div>
          ))}
          <div className="flex gap-2">
            <Input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Write a comment" aria-label="Comment" className="h-9" />
            <Button size="sm" disabled={pending || !text.trim()} onClick={() => send("comment", text.trim())}>Send</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <CalendarClock className="size-4 text-fg-muted" aria-hidden /> Suggest a deadline:
            <Input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} className="h-9 w-auto" aria-label="Suggested deadline" />
            <Button size="sm" variant="outline" disabled={pending || !date} onClick={() => send("deadline", undefined, date)}>Suggest</Button>
          </div>
          <p className="text-xs text-fg-subtle">{partnerName} decides whether to accept. You can&apos;t change their goal.</p>
        </div>
      )}
      {msg && <p className="mt-2 text-xs text-fg-muted" role="status">{msg}</p>}
    </div>
  );
}

export function DeadlineAnswer({ id, goal, date }: { id: string; goal: string; date: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const act = (accept: boolean) => start(async () => { const r = await respondDeadlineAction(id, accept); setMsg(r.message); });
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-muted px-3 py-2 text-sm">
      <span><b>{goal}</b>: new deadline {formatDate(date, { day: "numeric", month: "short", year: "numeric" })}</span>
      {msg ? <span className="text-fg-muted">{msg}</span> : (
        <span className="flex gap-2">
          <Button size="sm" variant="success" disabled={pending} onClick={() => act(true)}><Check className="size-4" aria-hidden /> Accept</Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(false)}><X className="size-4" aria-hidden /> Decline</Button>
        </span>
      )}
    </div>
  );
}

export function EndButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="ghost" size="sm" className="w-full text-danger" disabled={pending}
      onClick={() => { if (confirm(`End your partnership with ${name}? They'll be told, and you'll both stop seeing each other's shared data.`)) start(async () => { await endPartnershipAction(id); }); }}>
      End partnership
    </Button>
  );
}
