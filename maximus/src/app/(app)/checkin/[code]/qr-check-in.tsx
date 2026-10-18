"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatTime } from "@/lib/utils";
import { checkInQrAction } from "../../attendance/actions";

type State = { phase: "working" } | { phase: "done"; at: string; review: boolean } | { phase: "error"; message: string };

/** Checks in as soon as the page opens; location is used only if the phone shares it quickly. */
export function QrCheckIn({ code }: { code: string }) {
  const [state, setState] = useState<State>({ phase: "working" });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const go = async (pos: GeolocationPosition | null) => {
      const r = await checkInQrAction({
        code, lat: pos?.coords.latitude ?? null, lng: pos?.coords.longitude ?? null, accuracy: pos?.coords.accuracy ?? null,
      });
      setState(r.ok && r.data ? { phase: "done", at: r.data.check_in_at, review: r.data.status === "pending_review" } : { phase: "error", message: r.message });
    };
    if (!("geolocation" in navigator)) { void go(null); return; }
    navigator.geolocation.getCurrentPosition((p) => void go(p), () => void go(null), { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 });
  }, [code]);

  return (
    <Card className="mx-auto max-w-md p-8 text-center">
      {state.phase === "working" && (<><LoaderCircle className="mx-auto size-12 animate-spin text-primary" aria-hidden /><p className="mt-4 font-medium">Checking you in…</p></>)}
      {state.phase === "done" && (
        <>
          <CheckCircle2 className="mx-auto size-14 text-brand-green" aria-hidden />
          <h2 className="mt-4 text-xl font-bold">{state.review ? "Check-in sent for review" : "You're checked in!"}</h2>
          <p className="mt-1 text-fg-muted">
            {state.review ? "Your location looked far from the office, so a manager will confirm it." : `Welcome. Checked in at ${formatTime(state.at)}.`}
          </p>
          <LinkButton href="/dashboard" className="mt-6">Go to dashboard</LinkButton>
        </>
      )}
      {state.phase === "error" && (
        <>
          <XCircle className="mx-auto size-14 text-danger" aria-hidden />
          <h2 className="mt-4 text-xl font-bold">Couldn&apos;t check you in</h2>
          <p className="mt-1 text-fg-muted">{state.message}</p>
          <LinkButton href="/attendance" variant="outline" className="mt-6">Check in another way</LinkButton>
        </>
      )}
    </Card>
  );
}
