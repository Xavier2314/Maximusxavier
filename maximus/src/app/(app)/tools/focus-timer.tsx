"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Bell, Check, Flag, Maximize2, Minimize2, Pause, Play, RotateCcw, Settings2, Square, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/form";
import { Badge } from "@/components/ui/misc";
import { alertNotify, buzz, chime } from "@/lib/sound";
import { elapsedSeconds, fmtClock, type FocusKind, type FocusSession, type TimerPrefs } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { toggleTaskAction } from "../planner/actions";
import {
  addInterruptionAction, finishSessionAction, pauseSessionAction, recordProgressAction, resumeSessionAction,
  saveTimerPrefsAction, startSessionAction,
} from "./actions";
import type { TimerGoal, TimerTask } from "./data";

export type TimerMode = "pomodoro" | "stopwatch" | "countdown" | "focus" | "deep_work" | "two_minute";

const MODE_KIND: Record<TimerMode, FocusKind> = {
  pomodoro: "pomodoro", stopwatch: "stopwatch", countdown: "countdown", focus: "focus", deep_work: "deep_work", two_minute: "countdown",
};
const KIND_LABEL: Record<FocusKind, string> = {
  pomodoro: "Pomodoro", break: "Break", deep_work: "Deep work", stopwatch: "Stopwatch", countdown: "Countdown", focus: "Focus mode",
};
const KIND_PATH: Record<FocusKind, string> = {
  pomodoro: "/tools/pomodoro", break: "/tools/pomodoro", deep_work: "/tools/deep-work", stopwatch: "/tools/stopwatch",
  countdown: "/tools/countdown", focus: "/tools/focus",
};
const PRESETS: Record<TimerMode, number[] | null> = {
  pomodoro: null, stopwatch: null, countdown: [5, 10, 15, 30, 45, 60], focus: [25, 45, 60, 90],
  deep_work: [45, 60, 90, 120], two_minute: [2],
};

const DEFAULT_MINUTES: Record<TimerMode, number> = { pomodoro: 25, stopwatch: 0, countdown: 15, focus: 45, deep_work: 60, two_minute: 2 };

type Props = {
  mode: TimerMode;
  active: FocusSession | null;
  serverNow: string;
  prefs: TimerPrefs;
  goals: TimerGoal[];
  tasks: TimerTask[];
  pomodorosToday: number;
  initialGoal?: string;
  initialLabel?: string;
};

/**
 * One timer engine for every focus tool. The session lives in the database with
 * start/pause timestamps, so the time shown is always computed, never counted:
 * a refresh, a locked phone or a closed tab can't lose or add time.
 */
export function FocusTimer({ mode, active, serverNow, prefs: initialPrefs, goals, tasks, pomodorosToday, initialGoal, initialLabel }: Props) {
  const [session, setSession] = useState<FocusSession | null>(active);
  const [offset] = useState(() => new Date(serverNow).getTime() - Date.now());
  const [now, setNow] = useState(() => Date.now() + offset);
  const [prefs, setPrefs] = useState(initialPrefs);
  const [showSettings, setShowSettings] = useState(false);
  const [minutes, setMinutes] = useState(mode === "pomodoro" ? initialPrefs.work_minutes : DEFAULT_MINUTES[mode]);
  const [label, setLabel] = useState(initialLabel ?? "");
  const [goalId, setGoalId] = useState(initialGoal && goals.some((g) => g.id === initialGoal) ? initialGoal : "");
  const [taskId, setTaskId] = useState("");
  const [count, setCount] = useState(pomodorosToday);
  const [autoBreak, setAutoBreak] = useState(true);
  const [laps, setLaps] = useState<number[]>([]);
  const [finished, setFinished] = useState<FocusSession | null>(null);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [notifyState, setNotifyState] = useState<NotificationPermission | "unsupported">("default");
  const [pending, start] = useTransition();
  const finishing = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNotifyState(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
    const t = setInterval(() => setNow(Date.now() + offset), 250);
    return () => clearInterval(t);
  }, [offset]);

  const elapsed = session ? elapsedSeconds(session, now) : 0;
  const planned = session?.planned_seconds ?? null;
  const remaining = planned != null ? Math.max(0, planned - elapsed) : null;
  const shown = remaining ?? elapsed;
  const isBreak = session?.kind === "break";
  const pct = planned ? Math.min(100, (elapsed / planned) * 100) : 0;

  // Tab title shows the time so it can be seen from other tabs.
  useEffect(() => {
    const base = document.title.replace(/^\(\d[\d:]*\) /, "");
    document.title = session && session.status === "running" ? `(${fmtClock(shown)}) ${base}` : base;
  }, [session, shown]);

  // Keep the screen awake during focus mode where the browser allows it.
  useEffect(() => {
    if (!fullscreen || !session || session.status !== "running") return;
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => { lock = l; }).catch(() => undefined);
    return () => { lock?.release().catch(() => undefined); };
  }, [fullscreen, session]);

  const alertDone = useCallback((title: string, body: string) => {
    if (prefs.sound) chime(3);
    if (prefs.vibrate) buzz([300, 120, 300, 120, 300]);
    void alertNotify(title, body);
  }, [prefs.sound, prefs.vibrate]);

  const begin = useCallback((kind: FocusKind, seconds: number | null, extra?: { label?: string | null; goal_id?: string | null; task_id?: string | null }) => {
    start(async () => {
      const res = await startSessionAction({ kind, planned_seconds: seconds, label: extra?.label ?? null, goal_id: extra?.goal_id || null, task_id: extra?.task_id || null });
      if (!res.ok || !res.data) { setMessage(res.message); return; }
      setMessage(null);
      if (kind !== "break") setFinished(null);
      setLaps([]);
      setSession(res.data.session);
    });
  }, []);

  const finish = useCallback((outcome: "completed" | "abandoned") => {
    if (!session || finishing.current) return;
    finishing.current = true;
    const s = session;
    start(async () => {
      const res = await finishSessionAction(s.id, outcome, s.kind === "deep_work" || notes ? { notes } : undefined);
      finishing.current = false;
      if (!res.ok || !res.data) { setMessage(res.message); return; }
      setSession(null);
      setNotes("");
      if (outcome === "abandoned") { setMessage("Timer stopped. It won't count towards your focus time."); return; }
      const done = res.data.session;
      if (done.kind === "break") {
        alertDone("Break over", "Ready for the next focus session?");
        setMessage("Break over. Start your next focus session when you're ready.");
        return;
      }
      if (planned != null) alertDone(`${KIND_LABEL[done.kind]} complete`, done.label ? `Well done: ${done.label}` : "Well done. Take a breath.");
      setFinished(done);
      if (done.kind === "pomodoro") {
        const n = count + 1;
        setCount(n);
        if (autoBreak) {
          const long = n % prefs.long_every === 0;
          begin("break", (long ? prefs.long_break : prefs.short_break) * 60, { label: long ? "Long break" : "Short break" });
        }
      }
    });
  }, [session, notes, planned, alertDone, count, autoBreak, prefs, begin]);

  // When the countdown reaches zero, save it as completed (once).
  useEffect(() => {
    if (session && session.status === "running" && remaining === 0) finish("completed");
  }, [session, remaining, finish]);

  function pauseOrResume() {
    if (!session) return;
    const s = session;
    start(async () => {
      const res = s.status === "running" ? await pauseSessionAction(s.id) : await resumeSessionAction(s.id);
      if (res.ok && res.data) setSession(res.data.session);
      else setMessage(res.message);
    });
  }

  function interrupt() {
    if (!session) return;
    const s = session;
    setSession({ ...s, interruptions: s.interruptions + 1 });
    start(async () => { await addInterruptionAction(s.id); });
  }

  function onStart() {
    const kind = MODE_KIND[mode];
    const seconds = mode === "stopwatch" ? null : Math.round(minutes * 60);
    const lbl = mode === "two_minute" ? `2-minute challenge${label ? `: ${label}` : ""}` : label;
    begin(kind, seconds, { label: lbl || null, goal_id: goalId || null, task_id: taskId || null });
  }

  async function askNotify() {
    if (typeof Notification === "undefined") return;
    setNotifyState(await Notification.requestPermission());
  }

  async function toggleFullscreen() {
    const next = !fullscreen;
    setFullscreen(next);
    try {
      if (next) await wrapRef.current?.requestFullscreen?.();
      else if (document.fullscreenElement) await document.exitFullscreen();
    } catch { /* not supported (e.g. iPhone): the overlay still covers the app */ }
  }
  useEffect(() => {
    const onChange = () => { if (!document.fullscreenElement) setFullscreen(false); };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const otherMode = session && session.kind !== "break" && session.kind !== MODE_KIND[mode];
  const ringColor = isBreak ? "var(--success)" : "var(--primary)";
  const linkedGoal = goals.find((g) => g.id === (finished?.goal_id ?? ""));

  const face = (
    <div className="flex flex-col items-center">
      <TimerRing pct={planned ? pct : (elapsed % 60) / 0.6} color={ringColor} big={fullscreen}>
        <p className={cn("font-bold tabular-nums tracking-tight", fullscreen ? "text-6xl sm:text-7xl" : "text-5xl")} aria-live="off">{fmtClock(shown)}</p>
        <p className={cn("mt-1 text-sm", fullscreen ? "text-white/70" : "text-fg-muted")}>
          {session ? (session.status === "paused" ? "Paused" : isBreak ? session.label ?? "Break" : planned ? "remaining" : "elapsed") : "Ready"}
        </p>
      </TimerRing>
      {session?.label && !isBreak && <p className={cn("mt-4 max-w-sm text-center font-medium", fullscreen && "text-lg")}>{session.label}</p>}
      {session && (session.kind === "deep_work" || session.kind === "focus") && (
        <p className={cn("mt-1 text-sm", fullscreen ? "text-white/70" : "text-fg-muted")}>
          Interruptions: <b className="tabular-nums">{session.interruptions}</b>
        </p>
      )}
      {session && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={pauseOrResume} disabled={pending} variant={fullscreen ? "lime" : "primary"} size="lg">
            {session.status === "running" ? <><Pause className="size-5" aria-hidden /> Pause</> : <><Play className="size-5" aria-hidden /> Resume</>}
          </Button>
          {session.kind === "stopwatch" && (
            <Button variant="outline" size="lg" onClick={() => setLaps((l) => [elapsed, ...l])} disabled={session.status !== "running"}>
              <Flag className="size-5" aria-hidden /> Lap
            </Button>
          )}
          {(session.kind === "deep_work" || session.kind === "focus") && (
            <Button variant="outline" size="lg" onClick={interrupt} disabled={pending} className={fullscreen ? "border-white/30 bg-white/10 text-white hover:bg-white/20" : undefined}>
              <Zap className="size-5" aria-hidden /> I got interrupted
            </Button>
          )}
          {planned == null || session.kind === "deep_work" || session.kind === "focus" ? (
            <Button variant="success" size="lg" onClick={() => finish("completed")} disabled={pending}>
              <Check className="size-5" aria-hidden /> Finish & save
            </Button>
          ) : null}
          {isBreak ? (
            <Button variant="outline" size="lg" onClick={() => finish("completed")} disabled={pending}>Skip break</Button>
          ) : (
            <Button variant="ghost" size="lg" onClick={() => finish("abandoned")} disabled={pending}
              className={fullscreen ? "text-white/80 hover:bg-white/10 hover:text-white" : undefined}>
              <Square className="size-4" aria-hidden /> Stop
            </Button>
          )}
        </div>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div ref={wrapRef} className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-brand-navy p-6 text-white">
        <button type="button" onClick={toggleFullscreen} className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-white/80 hover:bg-white/10">
          <Minimize2 className="size-4" aria-hidden /> Exit focus mode
        </button>
        {face}
        {!session && (
          <div className="mt-8 text-center">
            <p className="text-white/80">{finished ? "Session saved. Great work." : "Nothing running."}</p>
            <Button className="mt-4" variant="lime" onClick={toggleFullscreen}>Back to the app</Button>
          </div>
        )}
        <p className="absolute bottom-4 max-w-md px-4 text-center text-xs text-white/50">
          Tip: turn on your phone&apos;s Do Not Disturb. Maximus can&apos;t silence other apps.
        </p>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {message && <p className="rounded-xl bg-surface-muted px-4 py-3 text-sm" role="status">{message}</p>}
        {otherMode && session && (
          <p className="rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning" role="status">
            Your {KIND_LABEL[session.kind].toLowerCase()} timer is running. You can control it here or <Link href={KIND_PATH[session.kind]} className="font-semibold underline">open its page</Link>.
          </p>
        )}
        <Card>
          <CardBody className="py-8">
            {face}
            {!session && (
              <div className="mx-auto mt-6 max-w-md space-y-4">
                {PRESETS[mode] && PRESETS[mode]!.length > 1 && (
                  <div>
                    <p className="mb-2 text-sm font-medium">Length</p>
                    <div className="flex flex-wrap gap-2">
                      {PRESETS[mode]!.map((m) => (
                        <button key={m} type="button" onClick={() => setMinutes(m)} aria-pressed={minutes === m}
                          className={cn("rounded-xl border px-3 py-1.5 text-sm", minutes === m ? "border-primary bg-primary-soft font-semibold text-primary" : "border-border")}>
                          {m} min
                        </button>
                      ))}
                      {mode === "countdown" && (
                        <label className="flex items-center gap-1.5 text-sm">
                          <Input type="number" min={1} max={600} value={minutes} onChange={(e) => setMinutes(Math.max(1, Math.min(600, Number(e.target.value) || 1)))}
                            className="h-9 w-20" aria-label="Minutes" /> min
                        </label>
                      )}
                    </div>
                  </div>
                )}
                {mode === "pomodoro" && (
                  <p className="text-center text-sm text-fg-muted">
                    {prefs.work_minutes} min focus · {prefs.short_break} min break · long break ({prefs.long_break} min) every {prefs.long_every}
                  </p>
                )}
                {mode === "two_minute" && (
                  <p className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary">
                    Pick one small thing you&apos;ve been putting off: a reply, a call, a follow-up. Do it in two minutes. Starting is the hardest part.
                  </p>
                )}
                <Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={140}
                  placeholder={mode === "two_minute" ? "What will you do? e.g. Reply Ada on WhatsApp" : "What are you working on? (optional)"} aria-label="What are you working on" />
                {tasks.length > 0 && (
                  <Select value={taskId} onChange={(e) => { setTaskId(e.target.value); const t = tasks.find((x) => x.id === e.target.value); if (t && !label) setLabel(t.title); }} aria-label="Link a task">
                    <option value="">Link a planner task (optional)</option>
                    {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </Select>
                )}
                {goals.length > 0 && mode !== "two_minute" && (
                  <Select value={goalId} onChange={(e) => setGoalId(e.target.value)} aria-label="Link a goal">
                    <option value="">Link a goal (optional)</option>
                    {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                  </Select>
                )}
                <Button size="lg" className="w-full" onClick={onStart} disabled={pending}>
                  <Play className="size-5" aria-hidden /> Start {mode === "two_minute" ? "the 2 minutes" : mode === "stopwatch" ? "stopwatch" : `${mode === "pomodoro" ? prefs.work_minutes : minutes} min`}
                </Button>
              </div>
            )}
            {mode === "focus" || session?.kind === "focus" ? (
              <div className="mt-4 text-center">
                <Button variant="outline" onClick={toggleFullscreen}><Maximize2 className="size-4" aria-hidden /> Full-screen focus</Button>
              </div>
            ) : null}
          </CardBody>
        </Card>

        {session?.kind === "deep_work" && (
          <Card>
            <CardBody className="space-y-2">
              <p className="text-sm font-medium">Session notes</p>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={3}
                placeholder="What did you get done? What's next?" aria-label="Session notes" />
              <p className="text-xs text-fg-subtle">Saved when you finish.</p>
            </CardBody>
          </Card>
        )}

        {laps.length > 0 && (
          <Card>
            <CardBody>
              <p className="mb-2 text-sm font-medium">Laps</p>
              <ol className="divide-y divide-border text-sm">
                {laps.map((l, i) => (
                  <li key={i} className="flex justify-between py-1.5 tabular-nums">
                    <span className="text-fg-muted">Lap {laps.length - i}</span>
                    <span>+{fmtClock(l - (laps[i + 1] ?? 0))}</span>
                    <span className="font-medium">{fmtClock(l)}</span>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        )}

        {finished && <AfterSession session={finished} goal={linkedGoal} />}
      </div>

      <div className="space-y-6">
        <Card>
          <CardBody className="space-y-3 text-sm">
            {mode === "pomodoro" && <p>Sessions today: <b className="tabular-nums">{count}</b></p>}
            {notifyState !== "granted" && notifyState !== "unsupported" && (
              <Button variant="outline" size="sm" onClick={askNotify}><Bell className="size-4" aria-hidden /> Alert me when time is up</Button>
            )}
            {notifyState === "denied" && <p className="text-xs text-fg-subtle">Notifications are blocked in your browser settings. Sound and vibration still work while the app is open.</p>}
            <p className="text-xs text-fg-subtle">
              The timer keeps time even if you close the app. Alerts play while the app is open or in the background;
              on iPhone, add Maximus to your Home Screen to allow notifications.
            </p>
            {mode === "pomodoro" && (
              <label className="flex items-center gap-2"><input type="checkbox" checked={autoBreak} onChange={(e) => setAutoBreak(e.target.checked)} className="size-4 accent-[var(--primary)]" />
                Start breaks automatically</label>
            )}
            <button type="button" onClick={() => setShowSettings((v) => !v)} className="inline-flex items-center gap-1.5 text-primary">
              <Settings2 className="size-4" aria-hidden /> Timer settings
            </button>
            {showSettings && <PrefsForm prefs={prefs} onSaved={setPrefs} />}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function TimerRing({ pct, color, big, children }: { pct: number; color: string; big?: boolean; children: React.ReactNode }) {
  const size = big ? 320 : 260, stroke = big ? 14 : 12;
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, pct));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size, maxWidth: "80vw", maxHeight: "80vw" }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 size-full -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className={big ? "text-white/15" : "text-surface-muted"} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (v / 100) * c} style={{ transition: "stroke-dashoffset 0.3s linear" }} />
      </svg>
      <div className="relative text-center">{children}</div>
    </div>
  );
}

/** After a focus session: record goal progress (time is never counted as progress) or tick off the task. */
function AfterSession({ session, goal }: { session: FocusSession; goal?: TimerGoal }) {
  const [value, setValue] = useState(goal ? String(goal.progress) : "");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [taskDone, setTaskDone] = useState(false);
  const [pending, start] = useTransition();
  const mins = Math.round(elapsedSeconds(session) / 60);
  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="green"><Check className="size-3" aria-hidden /> Saved</Badge>
          <p className="text-sm">{mins} min of {KIND_LABEL[session.kind].toLowerCase()}{session.interruptions ? `, ${session.interruptions} interruption${session.interruptions === 1 ? "" : "s"}` : ""}.</p>
          {session.planned_seconds && session.kind === "deep_work" && (
            <p className="text-sm text-fg-muted">Planned {Math.round(session.planned_seconds / 60)} min · actual {mins} min</p>
          )}
        </div>
        {session.task_id && !taskDone && (
          <Button variant="outline" size="sm" disabled={pending} onClick={() => start(async () => {
            const r = await toggleTaskAction(session.task_id!, true);
            setMsg(r.message); if (r.ok) setTaskDone(true);
          })}><Check className="size-4" aria-hidden /> Mark the task done</Button>
        )}
        {goal && (
          <form className="space-y-2" onSubmit={(e) => {
            e.preventDefault();
            start(async () => { const r = await recordProgressAction(goal.id, Number(value), note || undefined, session.id); setMsg(r.message); });
          }}>
            <p className="text-sm font-medium">Did this move &ldquo;{goal.title}&rdquo; forward? Update your progress.</p>
            <div className="flex flex-wrap items-center gap-2">
              <Input type="number" min={0} step="any" value={value} onChange={(e) => setValue(e.target.value)} className="w-28" aria-label="New progress" />
              <span className="text-sm text-fg-muted">{goal.target != null ? `of ${goal.target} ${goal.unit ?? ""}` : goal.unit ?? ""}</span>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" maxLength={200} className="min-w-40 flex-1" aria-label="Note" />
              <Button type="submit" size="sm" disabled={pending || value === ""}>Save progress</Button>
            </div>
            <p className="text-xs text-fg-subtle">Time spent doesn&apos;t count as progress on its own. Record what you actually achieved.</p>
          </form>
        )}
        {msg && <p className="text-sm text-fg-muted" role="status">{msg}</p>}
      </CardBody>
    </Card>
  );
}

function PrefsForm({ prefs, onSaved }: { prefs: TimerPrefs; onSaved: (p: TimerPrefs) => void }) {
  const [p, setP] = useState(prefs);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const num = (k: "work_minutes" | "short_break" | "long_break" | "long_every", label: string, min: number, max: number) => (
    <label className="flex items-center justify-between gap-2">
      <span>{label}</span>
      <Input type="number" min={min} max={max} value={p[k]} onChange={(e) => setP({ ...p, [k]: Number(e.target.value) })} className="h-9 w-20" />
    </label>
  );
  return (
    <form className="space-y-2 rounded-xl bg-surface-muted p-3" onSubmit={(e) => {
      e.preventDefault();
      start(async () => { const r = await saveTimerPrefsAction(p); setMsg(r.message); if (r.ok) onSaved(p); });
    }}>
      {num("work_minutes", "Focus (min)", 5, 180)}
      {num("short_break", "Short break (min)", 1, 60)}
      {num("long_break", "Long break (min)", 1, 90)}
      {num("long_every", "Long break every", 2, 12)}
      <label className="flex items-center gap-2"><input type="checkbox" checked={p.sound} onChange={(e) => setP({ ...p, sound: e.target.checked })} className="size-4 accent-[var(--primary)]" /> Sound</label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={p.vibrate} onChange={(e) => setP({ ...p, vibrate: e.target.checked })} className="size-4 accent-[var(--primary)]" /> Vibrate (Android)</label>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>Save</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => { chime(2); buzz(); }}><RotateCcw className="size-4" aria-hidden /> Test alert</Button>
      </div>
      {msg && <p className="text-xs text-fg-muted" role="status">{msg}</p>}
    </form>
  );
}
