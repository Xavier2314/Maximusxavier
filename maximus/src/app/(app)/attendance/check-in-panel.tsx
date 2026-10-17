"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, LocateFixed, LogIn, LogOut, MapPin, ShieldCheck } from "lucide-react";
import { AttendanceBadge } from "@/components/attendance-badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import type { Attendance } from "@/lib/types";
import { formatTime } from "@/lib/utils";
import { checkInAction, checkOutAction } from "./actions";

type Office = { id: string; name: string; radius_m: number };
type Fix = { lat: number | null; lng: number | null; accuracy: number | null };

function getLocation(): Promise<Fix & { denied?: boolean }> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve({ lat: null, lng: null, accuracy: null });
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Math.round(p.coords.accuracy) }),
      (err) => resolve({ lat: null, lng: null, accuracy: null, denied: err.code === err.PERMISSION_DENIED }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

export function CheckInPanel({ offices, open }: { offices: Office[]; open: Attendance | null }) {
  const [officeId, setOfficeId] = useState(offices[0]?.id ?? "");
  const [current, setCurrent] = useState<Attendance | null>(open);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [locating, setLocating] = useState(false);
  const [pending, startTransition] = useTransition();
  const busy = locating || pending;

  async function run(kind: "in" | "out") {
    setMessage(null);
    setLocating(true);
    const fix = await getLocation();
    setLocating(false);
    startTransition(async () => {
      const res = kind === "in"
        ? await checkInAction({ officeId, lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy })
        : await checkOutAction({ lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy });
      if (!res.ok) { setMessage({ ok: false, text: res.message }); return; }
      setCurrent(kind === "in" ? res.data ?? null : null);
      const s = res.data?.status;
      setMessage({
        ok: true,
        text: kind === "out" ? "You're checked out. See you next time!"
          : s === "verified_in_office" ? "Checked in — your location matched the office."
          : s === "outside_radius" ? "Checked in, but your location was outside the office radius. If you're at the office, submit a correction."
          : s === "pending_review" ? "Checked in. Your location was borderline, so your manager will review it."
          : fix.denied ? "Checked in without location (permission denied). You can submit a correction for review."
          : "Checked in, but your location was unavailable. You can submit a correction for review.",
      });
    });
  }

  if (offices.length === 0) {
    return (
      <div className="rounded-2xl bg-white/10 p-4 text-sm text-white/80 ring-1 ring-white/15">
        You&apos;re not assigned to an office yet. Ask your office manager to add you.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {current ? (
        <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
          <p className="text-sm text-white/70">Checked in at {formatTime(current.check_in_at)} · {offices.find((o) => o.id === current.office_id)?.name}</p>
          <div className="mt-2"><AttendanceBadge status={current.status} /></div>
        </div>
      ) : offices.length > 1 ? (
        <label className="block">
          <span className="mb-1.5 block text-sm text-white/70">Office</span>
          <Select value={officeId} onChange={(e) => setOfficeId(e.target.value)} className="border-white/20 bg-white/10 text-white [&>option]:text-fg">
            {offices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </Select>
        </label>
      ) : (
        <p className="flex items-center gap-2 text-white/80"><MapPin className="size-4 text-brand-lime" aria-hidden /> {offices[0].name}</p>
      )}

      <Button size="lg" variant={current ? "outline" : "lime"} disabled={busy} onClick={() => run(current ? "out" : "in")}
        className={current ? "w-full border-white/25 bg-white/5 text-white hover:bg-white/10 sm:w-auto" : "w-full sm:w-auto"}>
        {busy ? <LoaderCircle className="size-5 animate-spin" aria-hidden />
          : current ? <LogOut className="size-5" aria-hidden /> : <LogIn className="size-5" aria-hidden />}
        {locating ? "Getting your location…" : pending ? "Saving…" : current ? "Check out" : "Check in now"}
      </Button>

      <p className="flex items-start gap-2 text-xs text-white/60">
        <LocateFixed className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        With your permission, your device&apos;s location is read once and compared with the office&apos;s registered location.
        It is not tracked in the background, and a match does not prove you are inside the building.
      </p>

      {message && (
        <div role="status" className={`flex items-start gap-2 rounded-2xl p-3 text-sm ${message.ok ? "bg-brand-green/15 text-white" : "bg-danger/20 text-white"}`}>
          {message.ok && <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-lime" aria-hidden />}
          {message.text}
        </div>
      )}
    </div>
  );
}
