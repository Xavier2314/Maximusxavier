"use client";
import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import {
  BellOff, BellRing, CircleCheck, CircleDashed, CircleX, Clock, MonitorSmartphone, RefreshCw, Smartphone, Trash2, TriangleAlert, Volume2,
} from "lucide-react";
import { Badge, Button, Card, ErrorState, Input, PageHeader, SectionTitle, Select, Skeleton, Toggle, clsx } from "@/components/ui";
import { useToast } from "@/components/toast";
import { api, useApi } from "@/lib/client/api";
import { currentSubscription, enablePush, isIOS, isStandalone, permission, pushSupported, reRegister } from "@/lib/client/push";
import { SOUNDS, playSound, unlockAudio, type SoundName } from "@/lib/client/sounds";
import { dayLabel, t12 } from "@/lib/client/format";
import { useProfile } from "@/lib/client/hooks";
import type { CategoryRow, Preferences } from "@/lib/types";

interface Center {
  pushConfigured: boolean;
  vapidPublicKey: string;
  upcoming: { id: string; kind: string; title: string; body: string; fire_at: string; status: string }[];
  recent: { id: string; kind: string; title: string; body: string; fire_at: string; status: string; sent_at: string | null; last_error: string | null }[];
  logs: { id: string; reminder_id: string | null; subscription_id: string | null; event: string; http_status: number | null; detail: string | null; created_at: string }[];
  devices: { id: string; device_label: string | null; platform: string | null; active: boolean; failure_count: number; last_success_at: string | null; created_at: string }[];
  scheduler: { lastRunAt: string | null; notificationsEnabled: boolean };
}



export default function ReminderCenter() {
  const { data, error, mutate } = useApi<Center>("/api/reminders", { refreshInterval: 20_000 });
  const { data: prefs, mutate: mutatePrefs } = useApi<{ preferences: Preferences }>("/api/preferences");
  const { data: cats, mutate: mutateCats } = useApi<{ categories: CategoryRow[] }>("/api/categories");
  const toast = useToast();
  const { tz: TZ } = useProfile();
  const [env, setEnv] = useState({ ios: false, standalone: false, supported: false, perm: "default" as string, subscribed: false });
  const [busy, setBusy] = useState<string | null>(null);
  const [selfTest, setSelfTest] = useState<Record<string, "yes" | "no">>({});
  const [sound, setSound] = useState({ on: false, name: "chime" as SoundName });

  const refreshEnv = async () => {
    const sub = await currentSubscription().catch(() => null);
    setEnv({ ios: isIOS(), standalone: isStandalone(), supported: pushSupported(), perm: permission(), subscribed: !!sub });
  };
  useEffect(() => {
    refreshEnv();
    try {
      setSelfTest(JSON.parse(localStorage.getItem("myrhythm.selftest") ?? "{}"));
      setSound({ on: localStorage.getItem("myrhythm.sound") === "1", name: (localStorage.getItem("myrhythm.soundName") as SoundName) || "chime" });
    } catch {}
  }, []);

  const record = (k: string, v: "yes" | "no") => {
    const next = { ...selfTest, [k]: v, [`${k}_at`]: new Date().toISOString() } as Record<string, "yes" | "no">;
    setSelfTest(next);
    try { localStorage.setItem("myrhythm.selftest", JSON.stringify(next)); } catch {}
  };

  async function run(name: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(name);
    try {
      await fn();
      toast.show("success", ok);
      await refreshEnv();
      mutate();
    } catch (e) {
      toast.show("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  const schedulerAge = data?.scheduler.lastRunAt ? DateTime.now().diff(DateTime.fromISO(data.scheduler.lastRunAt), "minutes").minutes : null;
  const logsByReminder = useMemo(() => {
    const m = new Map<string, Center["logs"]>();
    for (const l of data?.logs ?? []) if (l.reminder_id) m.set(l.reminder_id, [...(m.get(l.reminder_id) ?? []), l]);
    return m;
  }, [data]);

  if (error) return <ErrorState error={error} retry={() => mutate()} />;
  if (!data) return <Skeleton className="h-[60vh]" />;

  const steps: { n: number; label: string; done: boolean | null; detail?: string }[] = [
    { n: 1, label: "Open the deployed website in Safari", done: env.ios ? true : null, detail: env.ios ? undefined : "You're not on an iPhone right now." },
    { n: 2, label: "Share → Add to Home Screen", done: env.standalone || null },
    { n: 3, label: "Launch MY RHYTHM from the Home Screen icon", done: env.standalone, detail: env.ios && !env.standalone ? "You're in Safari — open the Home Screen app instead." : undefined },
    { n: 4, label: "Tap “Enable notifications” below", done: env.subscribed },
    { n: 5, label: "Allow notifications when iOS asks", done: env.perm === "granted" ? true : env.perm === "denied" ? false : null },
    { n: 6, label: "Check Settings → Notifications → My Rhythm (Sounds, Lock Screen, Banners on) and Focus modes", done: selfTest.settings === "yes" ? true : null },
    { n: 7, label: "Send a test notification", done: data.logs.some((l) => l.event === "accepted") || null },
    { n: 8, label: "Verify the alert appears (banner / Lock Screen)", done: selfTest.visible ? selfTest.visible === "yes" : null },
    { n: 9, label: "Verify it is audible (ringer switch on, not in Focus)", done: selfTest.audible ? selfTest.audible === "yes" : null },
    { n: 10, label: "Verify delivery with the app closed (1-minute test, then lock the phone)", done: selfTest.background ? selfTest.background === "yes" : null },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Reminder Center" subtitle="Real Web Push notifications, sent by the server — even when the app is closed." />

      {!data.pushConfigured && (
        <Card className="flex gap-3 border-danger/30 bg-danger-soft p-4 text-sm"><TriangleAlert className="h-5 w-5 shrink-0 text-danger" /><p><strong>Push isn&apos;t configured on the server.</strong> Add the VAPID keys to the environment (see README → Deployment step 5).</p></Card>
      )}

      {/* Status */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatusTile label="Permission" ok={env.perm === "granted"} bad={env.perm === "denied"} value={env.perm === "unsupported" ? "Unsupported" : env.perm === "granted" ? "Allowed" : env.perm === "denied" ? "Blocked" : "Not asked"} />
        <StatusTile label="iPhone install" ok={env.standalone} value={env.standalone ? "Home Screen app" : env.ios ? "In Safari tab" : "Browser"} />
        <StatusTile label="This device" ok={env.subscribed} value={env.subscribed ? "Subscribed" : "Not subscribed"} />
        <StatusTile label="Scheduler" ok={schedulerAge !== null && schedulerAge < 5} bad={schedulerAge !== null && schedulerAge > 15} value={schedulerAge === null ? "Never ran" : schedulerAge < 1 ? "Ran just now" : `${Math.round(schedulerAge)} min ago`} />
      </div>

      <Card className="space-y-3 p-5">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => run("enable", () => enablePush(data.vapidPublicKey), "Notifications enabled on this device.")} loading={busy === "enable"} disabled={!env.supported && !env.ios}>
            <BellRing className="h-4 w-4" /> Enable notifications
          </Button>
          <Button variant="soft" onClick={() => run("test", () => api("/api/reminders/test", { body: { delaySeconds: 0 } }), "Test sent. Look at your phone.")} loading={busy === "test"}>Test notification</Button>
          <Button variant="soft" onClick={() => run("test60", () => api("/api/reminders/test", { body: { delaySeconds: 60 } }), "Scheduled. Close or lock the app now — it arrives in about a minute.")} loading={busy === "test60"}>
            <Clock className="h-4 w-4" /> Send test reminder in 1 minute
          </Button>
          <Button variant="ghost" onClick={() => run("rereg", () => reRegister(data.vapidPublicKey), "Device re-registered.")} loading={busy === "rereg"}><RefreshCw className="h-4 w-4" /> Re-register device</Button>
        </div>
        <p className="text-xs text-muted">“Accepted” in the history below means Apple/Google accepted the push from our server. “Received” means this phone&apos;s app confirmed it arrived and asked iOS to show it. Only you can confirm whether it was visible and audible.</p>
      </Card>

      {/* Setup assistant */}
      <section>
        <SectionTitle>iPhone setup assistant</SectionTitle>
        <Card className="divide-y divide-line">
          {steps.map((s) => (
            <div key={s.n} className="flex items-start gap-3 p-3">
              {s.done === true ? <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-sage" /> : s.done === false ? <CircleX className="mt-0.5 h-5 w-5 shrink-0 text-danger" /> : <CircleDashed className="mt-0.5 h-5 w-5 shrink-0 text-muted" />}
              <div className="flex-1">
                <p className="text-[15px]"><span className="text-muted">{s.n}.</span> {s.label}</p>
                {s.detail && <p className="text-xs text-muted">{s.detail}</p>}
                {[6, 8, 9, 10].includes(s.n) && (
                  <div className="mt-2 flex gap-2">
                    {(["yes", "no"] as const).map((v) => {
                      const key = s.n === 6 ? "settings" : s.n === 8 ? "visible" : s.n === 9 ? "audible" : "background";
                      return <Button key={v} size="sm" variant={selfTest[key] === v ? (v === "yes" ? "sage" : "danger") : "secondary"} onClick={() => record(key, v)}>{v === "yes" ? "Yes, confirmed" : "No"}</Button>;
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </Card>
        <p className="mt-2 text-xs text-muted">Steps 6, 8, 9 and 10 can only be confirmed by you on the real phone — they are recorded as your own observations on this device, never assumed.</p>
      </section>

      {/* Preferences */}
      {prefs && (
        <section>
          <SectionTitle>Notification preferences</SectionTitle>
          <Card className="divide-y divide-line">
            <PrefRow label="All reminders" hint="Master switch for every push reminder">
              <Toggle checked={prefs.preferences.notifications_enabled} label="All reminders" onChange={async (v) => { await api("/api/preferences", { method: "PATCH", body: { notifications_enabled: v } }); mutatePrefs(); mutate(); }} />
            </PrefRow>
            <PrefRow label="Bedtime reminders" hint="Wind-down + bedtime alerts">
              <Toggle checked={prefs.preferences.bedtime_reminders_enabled} label="Bedtime reminders" onChange={async (v) => { await api("/api/preferences", { method: "PATCH", body: { bedtime_reminders_enabled: v } }); mutatePrefs(); mutate(); }} />
            </PrefRow>
            <PrefRow label="Daily agenda summary" hint="A short morning summary of your day">
              <div className="flex items-center gap-2">
                <Input type="time" className="h-9 w-[118px]" value={prefs.preferences.daily_agenda_time} onChange={async (e) => { await api("/api/preferences", { method: "PATCH", body: { daily_agenda_time: e.target.value } }); mutatePrefs(); mutate(); }} />
                <Toggle checked={prefs.preferences.daily_agenda_enabled} label="Daily agenda" onChange={async (v) => { await api("/api/preferences", { method: "PATCH", body: { daily_agenda_enabled: v } }); mutatePrefs(); mutate(); }} />
              </div>
            </PrefRow>
            {cats?.categories.map((c) => (
              <PrefRow key={c.id} label={<span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />{c.name}</span>} hint="Category reminders">
                <Toggle checked={c.notify} label={`${c.name} reminders`} onChange={async (v) => { await api("/api/categories", { method: "PATCH", body: { id: c.id, notify: v } }); mutateCats(); mutate(); }} />
              </PrefRow>
            ))}
          </Card>
          <p className="mt-2 text-xs text-muted">Edit individual reminder times (1 h, 30, 15, 10, 5 min, at start, custom) by tapping any activity → Reminders.</p>
        </section>
      )}

      {/* In-app sound */}
      <section>
        <SectionTitle>In-app alarm sound</SectionTitle>
        <Card className="space-y-3 p-4">
          <PrefRow label="Play a sound when a reminder arrives while MY RHYTHM is open" hint="Works only while the app is open on screen. Tap the switch to allow audio.">
            <Toggle checked={sound.on} label="In-app sound" onChange={(v) => {
              if (v) unlockAudio();
              setSound({ ...sound, on: v });
              try { localStorage.setItem("myrhythm.sound", v ? "1" : "0"); } catch {}
            }} />
          </PrefRow>
          <div className="flex items-center gap-2">
            <Select value={sound.name} onChange={(e) => { const n = e.target.value as SoundName; setSound({ ...sound, name: n }); try { localStorage.setItem("myrhythm.soundName", n); } catch {} }}>
              {SOUNDS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </Select>
            <Button variant="secondary" onClick={() => { unlockAudio(); playSound(sound.name, 1); }}><Volume2 className="h-4 w-4" /> Preview</Button>
          </div>
        </Card>
      </section>

      {/* Upcoming */}
      <section>
        <SectionTitle>Upcoming reminders ({data.upcoming.length})</SectionTitle>
        <Card className="divide-y divide-line">
          {data.upcoming.length === 0 ? <p className="p-4 text-sm text-muted">Nothing scheduled in the next 48 hours.</p> : data.upcoming.map((r) => (
            <div key={r.id} className="flex items-start gap-3 p-3">
              <span className="w-[74px] shrink-0 text-sm font-medium tabular-nums">{t12(r.fire_at, TZ)}<span className="block text-xs font-normal text-muted">{dayLabel(r.fire_at, TZ, "ccc d")}</span></span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{r.body}</p><p className="truncate text-xs text-muted">{r.title}</p></div>
              <Badge>{r.kind}</Badge>
            </div>
          ))}
        </Card>
      </section>

      {/* History */}
      <section>
        <SectionTitle>Recent delivery history</SectionTitle>
        <Card className="divide-y divide-line">
          {data.recent.length === 0 ? <p className="p-4 text-sm text-muted">No reminders have been sent yet.</p> : data.recent.map((r) => {
            const logs = logsByReminder.get(r.id) ?? [];
            const received = logs.some((l) => l.event === "received");
            return (
              <div key={r.id} className="p-3">
                <div className="flex items-start gap-3">
                  <span className="w-[74px] shrink-0 text-sm tabular-nums">{t12(r.fire_at, TZ)}<span className="block text-xs text-muted">{dayLabel(r.fire_at, TZ, "ccc d")}</span></span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm">{r.body}</p>{r.last_error && <p className="text-xs text-danger">{r.last_error}</p>}</div>
                  <Badge color={r.status === "sent" ? "#6f9a7c" : r.status === "suppressed" ? "#66718a" : "#c2413b"}>{r.status === "sent" ? "accepted" : r.status}</Badge>
                </div>
                {logs.length > 0 && (
                  <p className="mt-1 pl-[86px] text-xs text-muted">
                    {received ? "✓ received by device" : r.status === "sent" ? "no device receipt yet" : ""}{logs.some((l) => l.event === "clicked") && " · opened"}
                  </p>
                )}
              </div>
            );
          })}
        </Card>
      </section>

      {/* Devices */}
      <section>
        <SectionTitle>Devices</SectionTitle>
        <Card className="divide-y divide-line">
          {data.devices.length === 0 ? <p className="p-4 text-sm text-muted">No devices yet. Use “Enable notifications” on your iPhone (Home Screen app) and on your MacBook browser.</p> : data.devices.map((d) => (
            <div key={d.id} className="flex items-center gap-3 p-3">
              {d.platform === "ios" ? <Smartphone className="h-5 w-5 text-lavender" /> : <MonitorSmartphone className="h-5 w-5 text-lavender" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{d.device_label ?? "Device"} {!d.active && <Badge color="#c2413b">inactive</Badge>}</p>
                <p className="text-xs text-muted">Added {DateTime.fromISO(d.created_at).toFormat("d LLL yyyy")}{d.last_success_at ? ` · last accepted ${DateTime.fromISO(d.last_success_at).toRelative()}` : ""}{d.failure_count ? ` · ${d.failure_count} failures` : ""}</p>
              </div>
              <Button size="icon" variant="ghost" aria-label="Rename" onClick={async () => { const label = window.prompt("Device name", d.device_label ?? ""); if (label) { await api("/api/push/devices", { method: "PATCH", body: { id: d.id, label } }); mutate(); } }}>✎</Button>
              <Button size="icon" variant="ghost" aria-label="Remove device" onClick={async () => { await api("/api/push/subscribe", { method: "DELETE", body: { id: d.id } }); mutate(); refreshEnv(); }}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </Card>
      </section>

      {/* Limits + troubleshooting */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-4 text-sm">
          <p className="mb-2 flex items-center gap-2 font-semibold"><BellOff className="h-4 w-4 text-warn" /> What iPhone web apps can&apos;t do</p>
          <ul className="list-disc space-y-1 pl-4 text-ink-2">
            <li>Custom notification sounds — iOS uses its standard notification sound.</li>
            <li>Ring continuously like an alarm clock, or override Silent mode / Focus.</li>
            <li>Play audio while the app is closed (the in-app sound only works with the app open).</li>
            <li>Show action buttons on every iOS version — tap the notification and act in the app instead.</li>
          </ul>
          <p className="mt-3 font-semibold">Need a true alarm for 5:00 AM?</p>
          <p className="text-ink-2">Use the iPhone <strong>Clock</strong> app for a 4:55 AM alarm, or an <strong>Apple Shortcuts</strong> personal automation (Time of Day → 4:55 AM, Daily → “Open URL” <code className="rounded bg-surface-2 px-1">{typeof window !== "undefined" ? window.location.origin : ""}/</code>). MY RHYTHM reminders then complement the alarm.</p>
        </Card>
        <Card className="p-4 text-sm">
          <p className="mb-2 font-semibold">Troubleshooting</p>
          <ol className="list-decimal space-y-1 pl-4 text-ink-2">
            <li>Requires iOS 16.4 or later, and the app must be opened from the Home Screen icon (not a Safari tab).</li>
            <li>Settings → Notifications → My Rhythm: Allow Notifications, Sounds, Lock Screen and Banners on.</li>
            <li>Check Focus / Do Not Disturb and the Ring/Silent switch.</li>
            <li>No “received” entries? Tap “Re-register device”, then test again.</li>
            <li>Scheduler not running? Check the cron job (README → Scheduler).</li>
            <li>Deleted and re-added the Home Screen app? Enable notifications again — iOS issues a new subscription.</li>
          </ol>
        </Card>
      </section>
    </div>
  );
}

function StatusTile({ label, value, ok, bad }: { label: string; value: string; ok?: boolean; bad?: boolean }) {
  return (
    <Card className="p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className={clsx("mt-1 flex items-center gap-1.5 text-sm font-semibold", ok ? "text-sage" : bad ? "text-danger" : "text-ink")}>
        {ok ? <CircleCheck className="h-4 w-4" /> : bad ? <CircleX className="h-4 w-4" /> : <CircleDashed className="h-4 w-4 text-muted" />}{value}
      </p>
    </Card>
  );
}

function PrefRow({ label, hint, children }: { label: React.ReactNode; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3">
      <div className="min-w-0"><p className="text-[15px] font-medium">{label}</p>{hint && <p className="text-xs text-muted">{hint}</p>}</div>
      {children}
    </div>
  );
}
