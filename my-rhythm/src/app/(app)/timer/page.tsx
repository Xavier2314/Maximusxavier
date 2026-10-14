"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DateTime } from "luxon";
import { BellRing, Check, Flag, Pause, Play, RotateCcw, Sun, Timer as TimerIcon, Trash2 } from "lucide-react";
import { Button, Card, Field, Input, PageHeader, SectionTitle, Segmented, Select, Skeleton, Toggle, clsx } from "@/components/ui";
import { useToast } from "@/components/toast";
import { api, useApi } from "@/lib/client/api";
import { useProfile } from "@/lib/client/hooks";
import { playSound, unlockAudio, type SoundName } from "@/lib/client/sounds";
import { durationLabel, t12 } from "@/lib/client/format";
import type { OccurrenceView } from "@/lib/data";

type Mode = "stopwatch" | "countdown";

/** Timer state is kept in localStorage so it survives leaving the page, reloads and app restarts. */
interface TimerState {
  mode: Mode;
  label: string;
  startedAt: number | null; // epoch ms when the current run began (null = paused/stopped)
  accumulated: number; // ms counted before the current run
  durationMs: number; // countdown length
  laps: number[];
  link: { activityId: string; occurrenceDate: string; title: string } | null;
  alertId: string | null; // server-side push alert for countdown end
  finishedNotified: boolean;
}

interface HistoryItem { at: string; label: string; ms: number; mode: Mode }

const KEY = "myrhythm.timer.v1";
const HKEY = "myrhythm.timer.history.v1";
const PRESETS = [5, 10, 15, 25, 30, 45, 60, 90];
const fresh = (mode: Mode = "stopwatch"): TimerState => ({ mode, label: "", startedAt: null, accumulated: 0, durationMs: 25 * 60_000, laps: [], link: null, alertId: null, finishedNotified: false });

function fmt(ms: number) {
  const neg = ms < 0;
  const s = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const body = h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return neg ? `+${body}` : body;
}

export default function TimerPage() {
  return <Suspense fallback={<Skeleton className="h-96" />}><TimerInner /></Suspense>;
}

function TimerInner() {
  const params = useSearchParams();
  const toast = useToast();
  const { tz, today } = useProfile();
  const { data: sched } = useApi<{ occurrences: OccurrenceView[] }>(`/api/schedule?from=${today}&to=${today}`);
  const [t, setT] = useState<TimerState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [custom, setCustom] = useState("");
  const [keepAwake, setKeepAwake] = useState(false);
  const [busy, setBusy] = useState(false);
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);

  // load persisted state; a link passed in the URL (from an activity) pre-fills it
  useEffect(() => {
    let s: TimerState = fresh();
    try { s = { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) ?? "null") }; } catch {}
    try { setHistory(JSON.parse(localStorage.getItem(HKEY) ?? "[]")); } catch {}
    const a = params.get("a"), d = params.get("d"), title = params.get("title");
    if (a && d && title && !s.startedAt && !s.accumulated) s = { ...s, link: { activityId: a, occurrenceDate: d, title }, label: title };
    const mins = Number(params.get("minutes"));
    if (mins > 0 && !s.startedAt && !s.accumulated) s = { ...s, mode: "countdown", durationMs: mins * 60_000 };
    setT(s);
  }, [params]);

  const save = useCallback((s: TimerState) => {
    setT(s);
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  }, []);

  const running = !!t?.startedAt;
  const elapsed = t ? t.accumulated + (t.startedAt ? now - t.startedAt : 0) : 0;
  const remaining = t ? t.durationMs - elapsed : 0;

  useEffect(() => {
    if (!running) return;
    const i = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(i);
  }, [running]);

  // countdown reached zero while the app is open → sound + vibration (once)
  useEffect(() => {
    if (!t || t.mode !== "countdown" || !running || t.finishedNotified || remaining > 0) return;
    let sound: SoundName = "chime";
    try { sound = (localStorage.getItem("myrhythm.soundName") as SoundName) || "chime"; } catch {}
    playSound(sound, 3);
    toast.show("success", `${t.label || "Timer"} finished!`);
    save({ ...t, finishedNotified: true });
  }, [t, running, remaining, save, toast]);

  // keep the screen on while timing (where supported)
  useEffect(() => {
    const nav = navigator as unknown as { wakeLock?: { request: (k: "screen") => Promise<{ release: () => Promise<void> }> } };
    if (keepAwake && running && nav.wakeLock) {
      nav.wakeLock.request("screen").then((l) => (wakeLock.current = l)).catch(() => {});
    }
    return () => { wakeLock.current?.release().catch(() => {}); wakeLock.current = null; };
  }, [keepAwake, running]);

  if (!t) return <Skeleton className="h-96" />;

  async function scheduleAlert(s: TimerState, msLeft: number): Promise<string | null> {
    if (s.mode !== "countdown" || msLeft <= 1000) return null;
    try {
      const r = await api<{ id: string }>("/api/timer/alert", { body: { fireAt: DateTime.now().plus({ milliseconds: msLeft }).toISO(), label: s.label || "Timer", url: "/timer" } });
      return r.id;
    } catch {
      toast.show("info", "Couldn't schedule the phone alert — keep the app open to hear the timer.");
      return null;
    }
  }
  async function cancelAlert(id: string | null) {
    if (id) await api("/api/timer/alert", { method: "DELETE", body: { id } }).catch(() => {});
  }

  async function start() {
    unlockAudio(); // a tap is required before the browser allows the end-of-timer sound
    setBusy(true);
    const base = { ...t!, finishedNotified: false };
    const alertId = await scheduleAlert(base, base.durationMs - base.accumulated);
    if (base.link && !base.accumulated) {
      api("/api/occurrences", { body: { activityId: base.link.activityId, occurrenceDate: base.link.occurrenceDate, action: "start" } }).catch(() => {});
    }
    const n = Date.now();
    setNow(n);
    save({ ...base, startedAt: n, alertId });
    setBusy(false);
  }

  async function pause() {
    await cancelAlert(t!.alertId);
    save({ ...t!, startedAt: null, accumulated: elapsed, alertId: null });
  }

  async function reset() {
    await cancelAlert(t!.alertId);
    save({ ...fresh(t!.mode), durationMs: t!.durationMs, label: t!.link ? "" : t!.label });
  }

  async function finish() {
    const ms = elapsed;
    if (ms < 1000) return;
    setBusy(true);
    await cancelAlert(t!.alertId);
    const minutes = Math.max(1, Math.round(ms / 60_000));
    if (t!.link) {
      try {
        await api("/api/occurrences", { body: { activityId: t!.link.activityId, occurrenceDate: t!.link.occurrenceDate, action: "complete", durationMinutes: minutes } });
        toast.show("success", `“${t!.link.title}” completed — ${durationLabel(minutes)} recorded.`);
      } catch (e) {
        toast.show("error", e instanceof Error ? e.message : "Couldn't record the activity");
      }
    } else {
      toast.show("success", `Timed ${durationLabel(minutes)}${t!.label ? ` of ${t!.label}` : ""}.`);
    }
    const item: HistoryItem = { at: new Date().toISOString(), label: t!.label || t!.link?.title || (t!.mode === "countdown" ? "Countdown" : "Stopwatch"), ms, mode: t!.mode };
    const h = [item, ...history].slice(0, 30);
    setHistory(h);
    try { localStorage.setItem(HKEY, JSON.stringify(h)); } catch {}
    save({ ...fresh(t!.mode), durationMs: t!.durationMs });
    setBusy(false);
  }

  const setMode = (mode: Mode) => !running && !t.accumulated && save({ ...t, mode });
  const linkable = (sched?.occurrences ?? []).filter((o) => o.state !== "cancelled" && o.state !== "completed" && !o.allDay);
  const progress = t.mode === "countdown" ? Math.min(1, Math.max(0, elapsed / t.durationMs)) : (elapsed % 60_000) / 60_000;
  const R = 120;
  const C = 2 * Math.PI * R;
  const over = t.mode === "countdown" && remaining <= 0 && (running || t.accumulated > 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Timer" subtitle="Time yourself — with a stopwatch, or a countdown that alerts your phone when it ends." />

      <Segmented value={t.mode} onChange={setMode} options={[{ value: "stopwatch", label: "Stopwatch" }, { value: "countdown", label: "Countdown" }]} />
      {(running || t.accumulated > 0) && <p className="-mt-3 text-xs text-muted">Reset or finish to switch mode.</p>}

      <Card className="flex flex-col items-center gap-5 p-6">
        <div className="relative" style={{ width: 2 * R + 24, height: 2 * R + 24 }}>
          <svg width={2 * R + 24} height={2 * R + 24} className="-rotate-90" aria-hidden>
            <circle cx={R + 12} cy={R + 12} r={R} stroke="var(--line)" strokeWidth={10} fill="none" />
            <circle cx={R + 12} cy={R + 12} r={R} stroke={over ? "var(--danger)" : t.mode === "countdown" ? "var(--lavender)" : "var(--sage)"} strokeWidth={10} fill="none" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - (t.mode === "countdown" ? 1 - progress : progress))} style={{ transition: "stroke-dashoffset 0.25s linear" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center" role="timer" aria-live="off">
            <span className={clsx("font-display text-6xl font-semibold tabular-nums", over && "text-danger")}>{fmt(t.mode === "countdown" ? remaining : elapsed)}</span>
            <span className="mt-1 max-w-[200px] truncate text-sm text-muted">{over ? "Time's up" : t.link?.title || t.label || (t.mode === "countdown" ? `of ${durationLabel(Math.round(t.durationMs / 60_000))}` : "Stopwatch")}</span>
            {running && <span className="mt-1 flex items-center gap-1 text-xs text-sage"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sage" /> running</span>}
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {running ? (
            <Button variant="secondary" size="lg" onClick={pause}><Pause className="h-5 w-5" /> Pause</Button>
          ) : (
            <Button size="lg" onClick={start} loading={busy}><Play className="h-5 w-5" /> {t.accumulated ? "Resume" : "Start"}</Button>
          )}
          {t.mode === "stopwatch" && running && <Button variant="soft" size="lg" onClick={() => save({ ...t, laps: [elapsed, ...t.laps].slice(0, 50) })}><Flag className="h-5 w-5" /> Lap</Button>}
          <Button variant="sage" size="lg" disabled={elapsed < 1000 || busy} onClick={finish}><Check className="h-5 w-5" /> Finish</Button>
          <Button variant="ghost" size="lg" aria-label="Reset" disabled={!elapsed} onClick={reset}><RotateCcw className="h-5 w-5" /></Button>
        </div>

        {t.mode === "countdown" && t.alertId && running && (
          <p className="flex items-center gap-1.5 text-xs text-muted"><BellRing className="h-3.5 w-3.5 text-lavender" /> Your phone will be notified at {t12(DateTime.fromMillis(Date.now() + Math.max(0, remaining)).toISO()!, tz)}, even if the app is closed.</p>
        )}
      </Card>

      {!running && !t.accumulated && (
        <Card className="space-y-4 p-5">
          {t.mode === "countdown" && (
            <div>
              <p className="mb-2 text-[13px] font-medium text-ink-2">Length</p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((m) => (
                  <button key={m} onClick={() => save({ ...t, durationMs: m * 60_000 })} className={clsx("rounded-full px-3.5 py-1.5 text-sm font-medium", t.durationMs === m * 60_000 ? "bg-lavender text-white" : "bg-surface-2 text-ink-2")}>{m === 60 ? "1 h" : `${m} min`}</button>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input type="number" min={1} max={720} placeholder="Custom minutes" value={custom} onChange={(e) => setCustom(e.target.value)} />
                <Button variant="secondary" onClick={() => { const n = Number(custom); if (n > 0 && n <= 720) { save({ ...t, durationMs: n * 60_000 }); setCustom(""); } }}>Set</Button>
              </div>
            </div>
          )}
          <Field label="Link to one of today's activities (optional)" hint="Starting marks it in progress; Finish marks it complete with the time you actually spent.">
            <Select
              value={t.link ? `${t.link.activityId}|${t.link.occurrenceDate}` : ""}
              onChange={(e) => {
                const o = linkable.find((x) => `${x.activityId}|${x.occurrenceDate}` === e.target.value);
                save({ ...t, link: o ? { activityId: o.activityId, occurrenceDate: o.occurrenceDate, title: o.title } : null, label: o ? o.title : t.label,
                  ...(o && t.mode === "countdown" ? { durationMs: Math.max(60_000, DateTime.fromISO(o.end).diff(DateTime.fromISO(o.start)).toMillis()) } : {}) });
              }}
            >
              <option value="">— Not linked —</option>
              {linkable.map((o) => <option key={o.key} value={`${o.activityId}|${o.occurrenceDate}`}>{t12(o.start, tz)} · {o.title}</option>)}
            </Select>
          </Field>
          {!t.link && <Field label="Label (optional)"><Input value={t.label} maxLength={80} placeholder="e.g. Reading, Scales, Study" onChange={(e) => save({ ...t, label: e.target.value })} /></Field>}
          <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2/60 px-3 py-2">
            <span className="flex items-center gap-2 text-sm"><Sun className="h-4 w-4 text-warn" /> Keep screen on while timing</span>
            <Toggle checked={keepAwake} onChange={setKeepAwake} label="Keep screen on" />
          </div>
        </Card>
      )}

      {t.laps.length > 0 && (
        <section>
          <SectionTitle>Laps</SectionTitle>
          <Card className="divide-y divide-line">
            {t.laps.map((l, i) => {
              const prev = t.laps[i + 1] ?? 0;
              return <div key={i} className="flex justify-between p-3 text-sm tabular-nums"><span className="text-muted">Lap {t.laps.length - i}</span><span>{fmt(l - prev)}</span><span className="text-muted">{fmt(l)}</span></div>;
            })}
          </Card>
        </section>
      )}

      <section>
        <SectionTitle action={history.length ? <Button size="sm" variant="ghost" onClick={() => { setHistory([]); try { localStorage.removeItem(HKEY); } catch {} }}><Trash2 className="h-4 w-4" /> Clear</Button> : undefined}>Recent timings (this device)</SectionTitle>
        {history.length === 0 ? (
          <Card className="flex items-center gap-3 p-4 text-sm text-muted"><TimerIcon className="h-5 w-5 text-lavender" /> Finished timings appear here. Linked activities are also saved to your calendar and progress.</Card>
        ) : (
          <Card className="divide-y divide-line">
            {history.map((h) => (
              <div key={h.at} className="flex items-center justify-between gap-3 p-3 text-sm">
                <span className="min-w-0 truncate">{h.label}</span>
                <span className="shrink-0 text-muted">{DateTime.fromISO(h.at).setZone(tz).toFormat("ccc d LLL, h:mm a")}</span>
                <span className="shrink-0 font-medium tabular-nums">{fmt(h.ms)}</span>
              </div>
            ))}
          </Card>
        )}
      </section>

      <p className="text-xs text-muted">On iPhone the countdown alert uses the standard notification sound (when notifications are enabled). With the app open, you&apos;ll also hear your chosen in-app sound.</p>
    </div>
  );
}
