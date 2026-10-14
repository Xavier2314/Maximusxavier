"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Download, LogOut, Moon, Plus, Sun, Laptop, Trash2, Upload, CircleCheck, CircleX } from "lucide-react";
import { Button, Card, ConfirmDialog, Field, Input, PageHeader, SectionTitle, Segmented, Select, Skeleton, Toggle, clsx } from "@/components/ui";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/toast";
import { api, useApi } from "@/lib/client/api";
import { useProfile } from "@/lib/client/hooks";
import { describeRecurrence } from "@/lib/schedule/occurrences";
import { hhmmTo12 } from "@/lib/client/format";
import type { ActivityRow, CategoryRow, Preferences, TimeWindow } from "@/lib/types";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ZONES = ["Africa/Lagos", "Africa/Accra", "Africa/Nairobi", "Africa/Johannesburg", "Europe/London", "Europe/Paris", "America/New_York", "America/Chicago", "America/Los_Angeles", "Asia/Dubai", "Asia/Singapore"];

export default function SettingsPage() {
  const toast = useToast();
  const { theme, setTheme } = useTheme();
  const { profile, email, mutate: mutateProfile } = useProfile();
  const { data: prefsRes, mutate: mutatePrefs } = useApi<{ preferences: Preferences; services: { ai: boolean; push: boolean; cron: boolean } }>("/api/preferences");
  const { data: acts, mutate: mutateActs } = useApi<{ activities: ActivityRow[] }>("/api/activities?recurring=1");
  const { data: cats, mutate: mutateCats } = useApi<{ categories: CategoryRow[] }>("/api/categories");
  const [p, setP] = useState({ display_name: "", timezone: "Africa/Lagos", wake_time: "05:00", bedtime: "21:00" });
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [wipeText, setWipeText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (profile) setP({ display_name: profile.display_name, timezone: profile.timezone, wake_time: profile.wake_time.slice(0, 5), bedtime: profile.bedtime.slice(0, 5) });
  }, [profile]);

  const prefs = prefsRes?.preferences;
  const savePrefs = async (patch: Partial<Preferences>) => {
    try {
      await api("/api/preferences", { method: "PATCH", body: patch });
      mutatePrefs();
      toast.show("success", "Saved.");
    } catch (e) {
      toast.show("error", e instanceof Error ? e.message : "Failed");
    }
  };

  const catById = useMemo(() => new Map((cats?.categories ?? []).map((c) => [c.id, c])), [cats]);
  const gym = (acts?.activities ?? []).filter((a) => a.group_key === "gym-morning");
  const devotion = (acts?.activities ?? []).find((a) => a.group_key === "devotion");
  const others = (acts?.activities ?? []).filter((a) => a.group_key !== "gym-morning").sort((a, b) => (catById.get(a.category_id ?? "")?.priority_rank ?? 9) - (catById.get(b.category_id ?? "")?.priority_rank ?? 9));

  async function patchActivity(id: string, changes: Partial<ActivityRow>, msg = "Routine updated. Reminders re-planned.") {
    await api(`/api/activities/${id}`, { method: "PATCH", body: { scope: "all", changes } });
    mutateActs();
    toast.show("success", msg);
  }

  async function setGymDays(days: number[]) {
    if (!days.length) return toast.show("error", "Keep at least one gym day (or delete the routine from the calendar).");
    setBusy("gym");
    try {
      for (const a of gym) await api(`/api/activities/${a.id}`, { method: "PATCH", body: { scope: "all", changes: { recurrence: { ...a.recurrence!, by_weekday: days } } } });
      mutateActs();
      toast.show("success", "Gym days updated.");
    } finally {
      setBusy(null);
    }
  }

  if (!prefs || !profile || !acts || !cats) return <Skeleton className="h-[70vh]" />;
  const gymDays = gym[0]?.recurrence?.by_weekday ?? [];

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" subtitle={email ? `Signed in as ${email}` : undefined} />

      <section>
        <SectionTitle>Profile & sleep</SectionTitle>
        <Card className="grid gap-4 p-5 md:grid-cols-2">
          <Field label="Name"><Input value={p.display_name} onChange={(e) => setP({ ...p, display_name: e.target.value })} /></Field>
          <Field label="Timezone" hint="Your routine follows you when you travel (wall-clock times are kept).">
            <Select value={ZONES.includes(p.timezone) ? p.timezone : "custom"} onChange={(e) => e.target.value !== "custom" && setP({ ...p, timezone: e.target.value })}>
              {ZONES.map((z) => <option key={z} value={z}>{z.replace("_", " ")}</option>)}
              <option value="custom">Other…</option>
            </Select>
            {!ZONES.includes(p.timezone) && <Input className="mt-2" value={p.timezone} onChange={(e) => setP({ ...p, timezone: e.target.value })} placeholder="e.g. Europe/Berlin" />}
          </Field>
          <Field label="Wake-up time" hint={hhmmTo12(p.wake_time)}><Input type="time" value={p.wake_time} onChange={(e) => setP({ ...p, wake_time: e.target.value })} /></Field>
          <Field label="Bedtime" hint={hhmmTo12(p.bedtime)}><Input type="time" value={p.bedtime} onChange={(e) => setP({ ...p, bedtime: e.target.value })} /></Field>
          <div className="md:col-span-2">
            <Button loading={busy === "profile"} onClick={async () => {
              setBusy("profile");
              try { await api("/api/profile", { method: "PATCH", body: p }); mutateProfile(); toast.show("success", "Profile saved. Reminders re-planned."); }
              catch (e) { toast.show("error", e instanceof Error ? e.message : "Failed"); }
              finally { setBusy(null); }
            }}>Save profile</Button>
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle>My routine</SectionTitle>
        <div className="space-y-3">
          {devotion && (
            <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div><p className="font-medium">Bible devotion time</p><p className="text-sm text-muted">Every day · {devotion.duration_minutes} min</p></div>
              <Input type="time" className="w-[130px]" defaultValue={devotion.start_time?.slice(0, 5)} onBlur={(e) => e.target.value && e.target.value !== devotion.start_time?.slice(0, 5) && patchActivity(devotion.id, { start_time: e.target.value })} />
            </Card>
          )}
          {gym.length > 0 && (
            <Card className="p-4">
              <p className="font-medium">Gym days</p>
              <p className="mb-3 text-sm text-muted">Changes the whole gym morning (prepare → travel → workout → return → recovery).</p>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((d, i) => {
                  const n = i + 1;
                  const on = gymDays.includes(n);
                  return <button key={d} disabled={busy === "gym"} onClick={() => setGymDays(on ? gymDays.filter((x) => x !== n) : [...gymDays, n].sort())} className={clsx("h-10 w-12 rounded-xl text-sm font-medium", on ? "bg-sage text-white" : "bg-surface-2 text-ink-2")}>{d}</button>;
                })}
              </div>
            </Card>
          )}
          <Card className="divide-y divide-line">
            {others.filter((a) => a.group_key !== "devotion").map((a) => <RoutineRow key={a.id} a={a} cat={catById.get(a.category_id ?? "")} onSave={(c) => patchActivity(a.id, c)} />)}
          </Card>
          <Link href="/add" className="inline-flex items-center gap-2 text-sm font-medium text-lavender"><Plus className="h-4 w-4" /> Add a custom recurring activity</Link>
        </div>
      </section>

      <section>
        <SectionTitle>Priorities</SectionTitle>
        <Card className="space-y-2 p-4">
          <p className="text-sm text-muted">The AI and the scheduling engine use this order when recommending changes.</p>
          <PriorityEditor value={prefs.priorities} onSave={(v) => savePrefs({ priorities: v })} />
        </Card>
        <Card className="mt-3 divide-y divide-line">
          {cats.categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 p-3">
              <span className="flex items-center gap-2 font-medium"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />{c.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Priority</span>
                <Select className="h-9 w-20" value={c.priority_rank} onChange={async (e) => { await api("/api/categories", { method: "PATCH", body: { id: c.id, priority_rank: Number(e.target.value) } }); mutateCats(); }}>
                  {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
                </Select>
                <input type="color" aria-label={`${c.name} colour`} value={c.color} className="h-9 w-10 rounded-lg border border-line bg-surface" onChange={async (e) => { await api("/api/categories", { method: "PATCH", body: { id: c.id, color: e.target.value } }); mutateCats(); }} />
              </div>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <SectionTitle>Focus hours & protected rest</SectionTitle>
        <div className="grid gap-3 md:grid-cols-2">
          <Card className="p-4"><p className="mb-1 font-medium">Preferred focus hours</p><p className="mb-3 text-sm text-muted">Suggestions for practice & projects prefer these.</p><WindowsEditor value={prefs.focus_hours} onSave={(v) => savePrefs({ focus_hours: v })} /></Card>
          <Card className="p-4"><p className="mb-1 font-medium">Protected rest periods</p><p className="mb-3 text-sm text-muted">Never suggested for new activities.</p><WindowsEditor value={prefs.protected_rest} onSave={(v) => savePrefs({ protected_rest: v })} /></Card>
        </div>
        <Card className="mt-3 grid gap-4 p-4 md:grid-cols-3">
          <Field label="Max hours of commitments per day"><Input type="number" min={4} max={18} step={0.5} defaultValue={prefs.max_daily_hours} onBlur={(e) => savePrefs({ max_daily_hours: Number(e.target.value) })} /></Field>
          <Field label="Buffer between activities (min)"><Input type="number" min={0} max={120} defaultValue={prefs.min_buffer_minutes} onBlur={(e) => savePrefs({ min_buffer_minutes: Number(e.target.value) })} /></Field>
          <Field label="Wind-down before bed (min)"><Input type="number" min={0} max={180} defaultValue={prefs.wind_down_minutes} onBlur={(e) => savePrefs({ wind_down_minutes: Number(e.target.value) })} /></Field>
        </Card>
      </section>

      <section>
        <SectionTitle>Reminders & devices</SectionTitle>
        <Card className="flex items-center justify-between p-4">
          <p className="text-sm">Notification preferences, devices, test notifications and sound are in the Reminder Center.</p>
          <Link href="/reminders"><Button variant="secondary" size="sm">Open</Button></Link>
        </Card>
      </section>

      <section>
        <SectionTitle>Appearance</SectionTitle>
        <Card className="p-4">
          <Segmented value={theme} onChange={(t) => { setTheme(t); savePrefs({ theme: t }); }} options={[
            { value: "system", label: <span className="flex items-center gap-1.5"><Laptop className="h-4 w-4" /> Auto</span> },
            { value: "light", label: <span className="flex items-center gap-1.5"><Sun className="h-4 w-4" /> Light</span> },
            { value: "dark", label: <span className="flex items-center gap-1.5"><Moon className="h-4 w-4" /> Dark</span> },
          ]} />
        </Card>
      </section>

      <section>
        <SectionTitle>AI & connected services</SectionTitle>
        <Card className="divide-y divide-line">
          <div className="flex items-center justify-between gap-3 p-4">
            <div><p className="font-medium">AI features</p><p className="text-sm text-muted">Natural-language parsing, explanations and the assistant. Off = built-in parser only.</p></div>
            <Toggle checked={prefs.ai_enabled} onChange={(v) => savePrefs({ ai_enabled: v })} label="AI features" />
          </div>
          {[
            ["Claude AI (Anthropic)", prefsRes!.services.ai, "ANTHROPIC_API_KEY"],
            ["Web Push (VAPID)", prefsRes!.services.push, "VAPID keys"],
            ["Background scheduler", prefsRes!.services.cron, "CRON_SECRET + cron job"],
          ].map(([name, ok, need]) => (
            <div key={name as string} className="flex items-center justify-between p-4 text-sm">
              <span>{name}</span>
              <span className={clsx("flex items-center gap-1.5 font-medium", ok ? "text-sage" : "text-danger")}>{ok ? <><CircleCheck className="h-4 w-4" /> Configured</> : <><CircleX className="h-4 w-4" /> Needs {need}</>}</span>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <SectionTitle>Your data</SectionTitle>
        <Card className="flex flex-wrap gap-2 p-4">
          <a href="/api/export"><Button variant="secondary"><Download className="h-4 w-4" /> Export backup (JSON)</Button></a>
          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-4 font-medium hover:bg-surface-2">
            <Upload className="h-4 w-4" /> Restore backup
            <input type="file" accept="application/json" className="hidden" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const res = await api<{ restored: Record<string, number> }>("/api/import", { method: "POST", raw: await f.text() });
                toast.show("success", `Restored ${Object.values(res.restored).reduce((a, b) => a + b, 0)} records.`);
              } catch (err) { toast.show("error", err instanceof Error ? err.message : "Restore failed"); }
            }} />
          </label>
          <Button variant="ghost" className="text-danger" onClick={() => setConfirmWipe(true)}><Trash2 className="h-4 w-4" /> Delete all my data</Button>
          <form action="/auth/signout" method="post" onSubmit={() => { caches?.keys().then((ks) => ks.forEach((k) => caches.delete(k))).catch(() => {}); }}>
            <Button variant="ghost" type="submit"><LogOut className="h-4 w-4" /> Sign out</Button>
          </form>
        </Card>
      </section>

      <ConfirmDialog open={confirmWipe} onClose={() => setConfirmWipe(false)} title="Delete all your data?" danger confirmLabel="Delete everything" loading={busy === "wipe"}
        onConfirm={async () => {
          setBusy("wipe");
          try { await api("/api/account", { method: "DELETE", body: { confirm: wipeText } }); toast.show("success", "All data deleted. Your routine will be re-created on next load."); setConfirmWipe(false); window.location.href = "/"; }
          catch (e) { toast.show("error", e instanceof Error ? e.message : "Failed"); }
          finally { setBusy(null); }
        }}
        body={<div className="space-y-3"><p>This permanently deletes your schedule, journals, workouts, practice logs, podcast notes, habits, AI conversations and devices. Export a backup first if you want to keep anything.</p><Field label='Type "DELETE" to confirm'><Input value={wipeText} onChange={(e) => setWipeText(e.target.value)} /></Field></div>} />
    </div>
  );
}

function RoutineRow({ a, cat, onSave }: { a: ActivityRow; cat?: CategoryRow; onSave: (c: Partial<ActivityRow>) => Promise<void> }) {
  const [edit, setEdit] = useState(false);
  const [time, setTime] = useState(a.start_time?.slice(0, 5) ?? "09:00");
  const [dur, setDur] = useState(a.duration_minutes);
  const [days, setDays] = useState<number[]>(a.recurrence?.by_weekday ?? []);
  return (
    <div className="p-3">
      <div className="flex items-center gap-3">
        <span className="h-8 w-1 rounded-full" style={{ backgroundColor: cat?.color ?? "#6b7280" }} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{a.title}</p>
          <p className="truncate text-xs text-muted">{describeRecurrence(a.recurrence)} · {a.start_time ? hhmmTo12(a.start_time) : "All day"} · {a.duration_minutes} min · {a.classification}{a.start_date > new Date().toISOString().slice(0, 10) ? ` · starts ${a.start_date}` : ""}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setEdit(!edit)}>{edit ? "Close" : "Edit"}</Button>
      </div>
      {edit && (
        <div className="mt-3 space-y-3 rounded-xl bg-surface-2/50 p-3">
          {a.recurrence?.freq === "weekly" && (
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d, i) => { const n = i + 1; const on = days.includes(n); return <button key={d} onClick={() => setDays(on ? days.filter((x) => x !== n) : [...days, n].sort())} className={clsx("h-9 w-11 rounded-lg text-sm", on ? "bg-lavender text-white" : "bg-surface text-ink-2")}>{d}</button>; })}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start time"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
            <Field label="Duration (min)"><Input type="number" min={5} max={720} value={dur} onChange={(e) => setDur(Number(e.target.value))} /></Field>
          </div>
          <Button size="sm" onClick={async () => { await onSave({ start_time: time, duration_minutes: dur, ...(a.recurrence?.freq === "weekly" ? { recurrence: { ...a.recurrence, by_weekday: days } } : {}) }); setEdit(false); }}>Save for every week</Button>
        </div>
      )}
    </div>
  );
}

function PriorityEditor({ value, onSave }: { value: string[]; onSave: (v: string[]) => void }) {
  const [items, setItems] = useState(value);
  const move = (i: number, d: -1 | 1) => { const n = [...items]; [n[i], n[i + d]] = [n[i + d], n[i]]; setItems(n); };
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-5 text-center text-sm font-semibold text-muted">{i + 1}</span>
          <Input value={it} onChange={(e) => setItems(items.map((x, j) => (j === i ? e.target.value : x)))} />
          <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => setItems([...items, "New priority"])}><Plus className="h-4 w-4" /> Add</Button>
        <Button size="sm" onClick={() => onSave(items.filter((x) => x.trim()))}>Save priorities</Button>
      </div>
    </div>
  );
}

function WindowsEditor({ value, onSave }: { value: TimeWindow[]; onSave: (v: TimeWindow[]) => void }) {
  const [items, setItems] = useState(value);
  return (
    <div className="space-y-3">
      {items.map((w, i) => (
        <div key={i} className="space-y-2 rounded-xl bg-surface-2/50 p-2">
          <div className="flex flex-wrap gap-1">
            {DAYS.map((d, j) => { const n = j + 1; const on = w.days.includes(n); return <button key={d} onClick={() => setItems(items.map((x, k) => (k === i ? { ...x, days: on ? x.days.filter((y) => y !== n) : [...x.days, n].sort() } : x)))} className={clsx("h-8 w-10 rounded-lg text-xs", on ? "bg-lavender text-white" : "bg-surface text-ink-2")}>{d}</button>; })}
          </div>
          <div className="flex items-center gap-2">
            <Input type="time" value={w.start} onChange={(e) => setItems(items.map((x, k) => (k === i ? { ...x, start: e.target.value } : x)))} />
            <span className="text-muted">–</span>
            <Input type="time" value={w.end} onChange={(e) => setItems(items.map((x, k) => (k === i ? { ...x, end: e.target.value } : x)))} />
            <Button size="icon" variant="ghost" onClick={() => setItems(items.filter((_, k) => k !== i))} aria-label="Remove"><Trash2 className="h-4 w-4" /></Button>
          </div>
          <Input placeholder="Label (optional)" value={w.label ?? ""} onChange={(e) => setItems(items.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} />
        </div>
      ))}
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => setItems([...items, { days: [1, 2, 3, 4, 5], start: "09:00", end: "11:00" }])}><Plus className="h-4 w-4" /> Add window</Button>
        <Button size="sm" onClick={() => onSave(items.filter((w) => w.days.length && w.start < w.end))}>Save</Button>
      </div>
    </div>
  );
}
