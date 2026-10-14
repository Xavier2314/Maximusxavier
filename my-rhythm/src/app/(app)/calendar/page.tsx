"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DateTime } from "luxon";
import { ChevronLeft, ChevronRight, Flag, Plus } from "lucide-react";
import { Button, Card, EmptyState, ErrorState, Segmented, Sheet, Skeleton, clsx } from "@/components/ui";
import { ActivitySheet } from "@/components/ActivitySheet";
import { useToast } from "@/components/toast";
import { api, useApi } from "@/lib/client/api";
import { useNow } from "@/lib/client/useNow";
import { dayLabel, t12, t12s } from "@/lib/client/format";
import type { OccurrenceView } from "@/lib/data";
import type { CategoryRow } from "@/lib/types";

type View = "day" | "week" | "month" | "agenda";
interface ScheduleRes { timezone: string; categories: CategoryRow[]; occurrences: OccurrenceView[] }

const HOUR_PX = 56;
const SNAP = 15;

export default function CalendarPage() {
  return <Suspense fallback={<Skeleton className="h-[70vh]" />}><CalendarInner /></Suspense>;
}

function CalendarInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [tz, setTz] = useState("Africa/Lagos");
  const [view, setView] = useState<View>((params.get("view") as View) || "day");
  const [anchor, setAnchor] = useState(() => params.get("date") ?? DateTime.now().setZone("Africa/Lagos").toISODate()!);
  const [open, setOpen] = useState<OccurrenceView | null>(null);

  useEffect(() => {
    if (!params.get("view") && window.matchMedia("(min-width: 768px)").matches) setView("week");
  }, [params]);

  const a = DateTime.fromISO(anchor, { zone: tz });
  const range = useMemo(() => {
    switch (view) {
      case "day": return [a.toISODate()!, a.toISODate()!];
      case "week": return [a.startOf("week").toISODate()!, a.endOf("week").toISODate()!];
      case "month": return [a.startOf("month").startOf("week").toISODate()!, a.endOf("month").endOf("week").toISODate()!];
      case "agenda": return [a.toISODate()!, a.plus({ days: 30 }).toISODate()!];
    }
  }, [view, a]);
  const { data, error, mutate, isLoading } = useApi<ScheduleRes>(`/api/schedule?from=${range[0]}&to=${range[1]}`);
  useEffect(() => { if (data?.timezone && data.timezone !== tz) setTz(data.timezone); }, [data, tz]);

  const step = (dir: 1 | -1) => {
    const unit = view === "day" ? { days: 1 } : view === "week" ? { weeks: 1 } : view === "month" ? { months: 1 } : { days: 30 };
    setAnchor((dir === 1 ? a.plus(unit) : a.minus(unit)).toISODate()!);
  };
  const title = view === "day" ? a.toFormat("cccc d LLLL") : view === "week" ? `${a.startOf("week").toFormat("d LLL")} – ${a.endOf("week").toFormat("d LLL yyyy")}` : view === "month" ? a.toFormat("LLLL yyyy") : `From ${a.toFormat("d LLL")}`;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={() => step(-1)} aria-label="Previous"><ChevronLeft className="h-5 w-5" /></Button>
          <Button size="icon" variant="ghost" onClick={() => step(1)} aria-label="Next"><ChevronRight className="h-5 w-5" /></Button>
          <h1 className="ml-1 font-display text-xl font-semibold md:text-2xl">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setAnchor(DateTime.now().setZone(tz).toISODate()!)}>Today</Button>
          <Segmented value={view} onChange={setView} options={[{ value: "day", label: "Day" }, { value: "week", label: "Week" }, { value: "month", label: "Month" }, { value: "agenda", label: "Agenda" }]} />
        </div>
      </div>

      {data && <Legend categories={data.categories} />}

      {error ? <ErrorState error={error} retry={() => mutate()} /> : isLoading && !data ? <Skeleton className="h-[70vh]" /> : data && (
        <>
          {(view === "day" || view === "week") && (
            <TimeGrid
              days={view === "day" ? [a.toISODate()!] : Array.from({ length: 7 }, (_, i) => a.startOf("week").plus({ days: i }).toISODate()!)}
              occ={data.occurrences}
              tz={tz}
              onOpen={setOpen}
              onChanged={() => mutate()}
              onEmpty={(date) => router.push(`/add?date=${date}`)}
            />
          )}
          {view === "month" && <MonthGrid anchor={a} occ={data.occurrences} tz={tz} onPick={(d) => { setAnchor(d); setView("day"); }} />}
          {view === "agenda" && <Agenda occ={data.occurrences} tz={tz} onOpen={setOpen} />}
        </>
      )}

      <Link href={`/add?date=${anchor}`} className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+148px)] z-30 flex h-12 w-12 items-center justify-center rounded-full bg-navy text-white shadow-lg md:hidden dark:bg-lavender dark:text-[#0b1222]" aria-label="Add on this day">
        <Plus className="h-6 w-6" />
      </Link>
      <ActivitySheet occ={open} tz={tz} categories={data?.categories ?? []} onClose={() => setOpen(null)} onChanged={() => mutate()} />
    </div>
  );
}

function Legend({ categories }: { categories: CategoryRow[] }) {
  return (
    <div className="scroll-hide mb-4 flex gap-3 overflow-x-auto pb-1">
      {categories.map((c) => (
        <span key={c.id} className="flex shrink-0 items-center gap-1.5 text-xs text-muted"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />{c.name}</span>
      ))}
    </div>
  );
}

interface Placed { o: OccurrenceView; top: number; height: number; col: number; cols: number }

function layoutDay(occ: OccurrenceView[], date: string, tz: string): Placed[] {
  const dayStart = DateTime.fromISO(date, { zone: tz }).startOf("day");
  const items = occ
    .filter((o) => !o.allDay)
    .map((o) => {
      const s = DateTime.max(DateTime.fromISO(o.start), dayStart)!;
      const e = DateTime.min(DateTime.fromISO(o.end), dayStart.plus({ days: 1 }))!;
      return { o, s: s.diff(dayStart, "minutes").minutes, e: e.diff(dayStart, "minutes").minutes };
    })
    .filter((x) => x.e > x.s || x.e === x.s)
    .sort((x, y) => x.s - y.s);
  const out: Placed[] = [];
  let cluster: typeof items = [];
  let clusterEnd = -1;
  const flush = () => {
    const colsEnd: number[] = [];
    const placed = cluster.map((x) => {
      let col = colsEnd.findIndex((end) => end <= x.s);
      if (col === -1) { col = colsEnd.length; colsEnd.push(x.e); } else colsEnd[col] = x.e;
      return { x, col };
    });
    placed.forEach(({ x, col }) => out.push({ o: x.o, top: (x.s / 60) * HOUR_PX, height: Math.max(22, ((x.e - x.s) / 60) * HOUR_PX), col, cols: colsEnd.length }));
    cluster = [];
    clusterEnd = -1;
  };
  for (const x of items) {
    if (cluster.length && x.s >= clusterEnd) flush();
    cluster.push(x);
    clusterEnd = Math.max(clusterEnd, x.e);
  }
  if (cluster.length) flush();
  return out;
}

function TimeGrid({ days, occ, tz, onOpen, onChanged, onEmpty }: { days: string[]; occ: OccurrenceView[]; tz: string; onOpen: (o: OccurrenceView) => void; onChanged: () => void; onEmpty: (date: string) => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const now = useNow(60_000);
  const toast = useToast();
  const [drag, setDrag] = useState<{ o: OccurrenceView; startY: number; startX: number; dy: number; dx: number; moved: boolean } | null>(null);
  const [pendingMove, setPendingMove] = useState<{ o: OccurrenceView; start: DateTime; end: DateTime; warnings: string[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const suppressClick = useRef(false);

  useEffect(() => { scroller.current?.scrollTo({ top: 4.5 * HOUR_PX }); }, []);

  const byDay = days.map((d) => ({
    date: d,
    allDay: occ.filter((o) => o.allDay && DateTime.fromISO(o.start).setZone(tz).toISODate()! <= d && DateTime.fromISO(o.end).setZone(tz).minus({ minutes: 1 }).toISODate()! >= d),
    placed: layoutDay(occ.filter((o) => DateTime.fromISO(o.start).setZone(tz).toISODate()! <= d && DateTime.fromISO(o.end).setZone(tz).toISODate()! >= d), d, tz),
  }));
  const nowDt = DateTime.fromMillis(now).setZone(tz);
  const colWidth = () => (gridRef.current ? gridRef.current.clientWidth / days.length : 1);

  function onPointerDown(e: React.PointerEvent, o: OccurrenceView) {
    // Drag with mouse/trackpad/pencil. On touch, a tap opens the activity (with Reschedule) so scrolling stays natural.
    if (o.state === "cancelled" || e.pointerType === "touch") return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ o, startY: e.clientY, startX: e.clientX, dy: 0, dx: 0, moved: false });
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return;
    const dy = e.clientY - drag.startY;
    const dx = e.clientX - drag.startX;
    setDrag({ ...drag, dy, dx, moved: drag.moved || Math.abs(dy) > 6 || Math.abs(dx) > 6 });
  }
  async function onPointerUp() {
    if (!drag) return;
    const d = drag;
    setDrag(null);
    if (!d.moved) return;
    suppressClick.current = true;
    const minutes = Math.round(((d.dy / HOUR_PX) * 60) / SNAP) * SNAP;
    const dayShift = days.length > 1 ? Math.round(d.dx / colWidth()) : 0;
    if (!minutes && !dayShift) return;
    const s = DateTime.fromISO(d.o.start).setZone(tz).plus({ minutes, days: dayShift });
    const en = DateTime.fromISO(d.o.end).setZone(tz).plus({ minutes, days: dayShift });
    try {
      const check = await api<{ conflicts: { type: string; message: string }[] }>("/api/schedule/check", { body: { title: d.o.title, start: s.toISO(), end: en.toISO(), replaces: [d.o.key] } });
      setPendingMove({ o: d.o, start: s, end: en, warnings: check.conflicts.filter((c) => c.type !== "protected_rest").map((c) => c.message) });
    } catch (err) {
      toast.show("error", err instanceof Error ? err.message : "Could not check conflicts");
    }
  }
  async function confirmMove() {
    if (!pendingMove) return;
    setSaving(true);
    try {
      await api("/api/occurrences", { body: { activityId: pendingMove.o.activityId, occurrenceDate: pendingMove.o.occurrenceDate, action: "reschedule", newStart: pendingMove.start.toISO(), newEnd: pendingMove.end.toISO() } });
      toast.show("success", `Moved “${pendingMove.o.title}” to ${pendingMove.start.toFormat("ccc h:mm a")}. Reminders updated.`, {
        label: "Undo",
        run: async () => {
          const h = await api<{ history: { batch_id: string; undone_at: string | null }[] }>("/api/history");
          const last = h.history.find((x) => !x.undone_at);
          if (last) await api("/api/history/undo", { body: { batchId: last.batch_id } });
          onChanged();
        },
      });
      onChanged();
    } catch (err) {
      toast.show("error", err instanceof Error ? err.message : "Could not move");
    } finally {
      setSaving(false);
      setPendingMove(null);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex border-b border-line">
        <div className="w-14 shrink-0" />
        {byDay.map(({ date, allDay }) => {
          const dt = DateTime.fromISO(date, { zone: tz });
          const isToday = dt.hasSame(nowDt, "day");
          return (
            <div key={date} className="min-w-0 flex-1 border-l border-line px-1 py-2 text-center">
              <div className="text-[11px] font-medium uppercase text-muted">{dt.toFormat("ccc")}</div>
              <div className={clsx("mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold", isToday && "bg-lavender text-white")}>{dt.day}</div>
              {allDay.map((o) => (
                <button key={o.key} onClick={() => onOpen(o)} className="mt-1 block w-full truncate rounded-md px-1 py-0.5 text-[11px] font-medium text-white" style={{ backgroundColor: o.category?.color ?? "#6b7280" }}>{o.title}</button>
              ))}
            </div>
          );
        })}
      </div>
      <div ref={scroller} className="relative max-h-[68vh] overflow-y-auto" onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => setDrag(null)}>
        <div className="flex" style={{ height: 24 * HOUR_PX }}>
          <div className="relative w-14 shrink-0">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="absolute right-2 -translate-y-1/2 text-[11px] text-muted tabular-nums" style={{ top: h * HOUR_PX }}>{h === 0 ? "" : DateTime.fromObject({ hour: h }).toFormat("h a")}</div>
            ))}
          </div>
          <div ref={gridRef} className="relative flex flex-1">
            {Array.from({ length: 24 }, (_, h) => <div key={h} className="pointer-events-none absolute inset-x-0 border-t border-line/70" style={{ top: h * HOUR_PX }} />)}
            {byDay.map(({ date, placed }) => {
              const isToday = DateTime.fromISO(date, { zone: tz }).hasSame(nowDt, "day");
              return (
                <div key={date} className="relative min-w-0 flex-1 border-l border-line" onDoubleClick={() => onEmpty(date)}>
                  {isToday && <div className="pointer-events-none absolute inset-x-0 z-20 h-0.5 bg-danger" style={{ top: (nowDt.hour * 60 + nowDt.minute) / 60 * HOUR_PX }}><span className="absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full bg-danger" /></div>}
                  {placed.map((p) => {
                    const dragging = drag?.o.key === p.o.key && drag.moved;
                    const color = p.o.category?.color ?? "#6b7280";
                    const done = p.o.state === "completed" || p.o.state === "skipped" || p.o.state === "cancelled";
                    return (
                      <div
                        key={p.o.key}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && onOpen(p.o)}
                        onPointerDown={(e) => onPointerDown(e, p.o)}
                        onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } onOpen(p.o); }}
                        className={clsx("absolute touch-pan-y overflow-hidden rounded-lg border-l-[3px] px-1.5 py-1 text-left select-none", dragging ? "z-30 opacity-90 shadow-xl" : "z-10", done && "opacity-55")}
                        style={{
                          top: p.top + 1 + (dragging ? drag!.dy : 0),
                          height: p.height - 2,
                          left: `calc(${(p.col / p.cols) * 100}% + 2px + ${dragging ? drag!.dx : 0}px)`,
                          width: `calc(${100 / p.cols}% - 4px)`,
                          backgroundColor: `${color}26`,
                          borderLeftColor: color,
                          cursor: "grab",
                        }}
                      >
                        <p className={clsx("truncate text-[12px] leading-tight font-semibold", done && "line-through")}>{p.o.status === "needs_reschedule" && <Flag className="mr-0.5 inline h-3 w-3 text-warn" />}{p.o.title}</p>
                        {p.height > 34 && <p className="truncate text-[11px] text-muted">{t12s(p.o.start, tz)}–{t12s(p.o.end, tz)}</p>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <p className="border-t border-line px-3 py-2 text-[11px] text-muted">Tip: on a Mac, drag an activity to move it (15-min steps). On iPhone, tap it and choose Reschedule.</p>

      <Sheet open={!!pendingMove} onClose={() => setPendingMove(null)} title="Move this activity?" footer={
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setPendingMove(null)}>Cancel</Button><Button onClick={confirmMove} loading={saving}>Move</Button></div>
      }>
        {pendingMove && (
          <div className="space-y-3 text-[15px]">
            <p><strong>{pendingMove.o.title}</strong><br />{dayLabel(pendingMove.o.start, tz)} {t12(pendingMove.o.start, tz)} → <strong>{pendingMove.start.toFormat("ccc d LLL, h:mm a")}</strong></p>
            {pendingMove.o.recurring && <p className="text-sm text-muted">Only this occurrence moves. Edit the activity to change every week.</p>}
            {pendingMove.o.classification === "fixed" && <p className="rounded-xl bg-warn-soft p-3 text-sm">This is a <strong>fixed</strong> commitment. Make sure the people involved know.</p>}
            {pendingMove.warnings.length > 0 ? (
              <ul className="space-y-1 rounded-xl bg-danger-soft p-3 text-sm">{pendingMove.warnings.map((w) => <li key={w}>• {w}</li>)}</ul>
            ) : <p className="rounded-xl bg-sage-soft p-3 text-sm">No conflicts at the new time.</p>}
          </div>
        )}
      </Sheet>
    </Card>
  );
}

function MonthGrid({ anchor, occ, tz, onPick }: { anchor: DateTime; occ: OccurrenceView[]; tz: string; onPick: (d: string) => void }) {
  const start = anchor.startOf("month").startOf("week");
  const days = Array.from({ length: 42 }, (_, i) => start.plus({ days: i })).filter((d, i) => i < 35 || d.month === anchor.month);
  const today = DateTime.now().setZone(tz).toISODate();
  const byDay = new Map<string, OccurrenceView[]>();
  for (const o of occ) {
    const k = DateTime.fromISO(o.start).setZone(tz).toISODate()!;
    byDay.set(k, [...(byDay.get(k) ?? []), o]);
  }
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7 border-b border-line text-center text-[11px] font-medium uppercase text-muted">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const iso = d.toISODate()!;
          const items = (byDay.get(iso) ?? []).filter((o) => o.state !== "cancelled" && !(o.groupKey === "gym-morning" && !/workout/i.test(o.title)));
          return (
            <button key={iso} onClick={() => onPick(iso)} className={clsx("min-h-[78px] border-t border-l border-line p-1 text-left align-top md:min-h-[104px]", d.month !== anchor.month && "bg-surface-2/40 text-muted")}>
              <span className={clsx("inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold", iso === today && "bg-lavender text-white")}>{d.day}</span>
              <div className="mt-0.5 hidden space-y-0.5 md:block">
                {items.slice(0, 3).map((o) => <div key={o.key} className="truncate rounded px-1 text-[11px]" style={{ backgroundColor: `${o.category?.color ?? "#6b7280"}22` }}>{o.title}</div>)}
                {items.length > 3 && <div className="px-1 text-[10px] text-muted">+{items.length - 3} more</div>}
              </div>
              <div className="mt-1 flex flex-wrap gap-0.5 md:hidden">
                {items.slice(0, 6).map((o) => <span key={o.key} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: o.category?.color ?? "#6b7280" }} />)}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function Agenda({ occ, tz, onOpen }: { occ: OccurrenceView[]; tz: string; onOpen: (o: OccurrenceView) => void }) {
  const groups = new Map<string, OccurrenceView[]>();
  for (const o of occ) {
    const k = DateTime.fromISO(o.start).setZone(tz).toISODate()!;
    groups.set(k, [...(groups.get(k) ?? []), o]);
  }
  if (!occ.length) return <EmptyState title="Nothing scheduled" body="No activities in the next 30 days." />;
  return (
    <div className="space-y-4">
      {[...groups.entries()].map(([day, items]) => (
        <section key={day}>
          <h3 className="mb-2 text-sm font-semibold text-muted">{DateTime.fromISO(day).toFormat("cccc d LLLL")}</h3>
          <Card className="divide-y divide-line">
            {items.map((o) => (
              <button key={o.key} onClick={() => onOpen(o)} className="flex w-full items-center gap-3 p-3 text-left">
                <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: o.category?.color ?? "#6b7280" }} />
                <span className="w-24 shrink-0 text-[13px] text-muted tabular-nums">{o.allDay ? "All day" : `${t12s(o.start, tz)}–${t12s(o.end, tz)}`}</span>
                <span className={clsx("min-w-0 flex-1 truncate font-medium", o.state === "completed" && "text-muted line-through")}>{o.title}</span>
                {o.status === "needs_reschedule" && <Flag className="h-4 w-4 text-warn" />}
              </button>
            ))}
          </Card>
        </section>
      ))}
    </div>
  );
}
