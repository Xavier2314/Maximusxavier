"use client";

import { useActionState, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormMessage, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Office } from "@/lib/types";
import { saveOfficeAction } from "./actions";

const DAYS = [["mon", "Mon"], ["tue", "Tue"], ["wed", "Wed"], ["thu", "Thu"], ["fri", "Fri"], ["sat", "Sat"], ["sun", "Sun"]] as const;

export function OfficeForm({ office }: { office?: Office }) {
  const [state, action] = useActionState(saveOfficeAction, null);
  const [locMsg, setLocMsg] = useState<string | null>(null);
  const lat = useRef<HTMLInputElement>(null);
  const lng = useRef<HTMLInputElement>(null);
  const e = state?.errors ?? {};
  const sched = office?.schedule ?? {};
  const firstDay = Object.values(sched)[0];
  const id = office?.id ?? "new";

  function useHere() {
    setLocMsg("Getting location…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (lat.current) lat.current.value = p.coords.latitude.toFixed(6);
        if (lng.current) lng.current.value = p.coords.longitude.toFixed(6);
        setLocMsg(`Set from this device (±${Math.round(p.coords.accuracy)} m). Stand inside the office for best results.`);
      },
      () => setLocMsg("Couldn't read your location. Enter coordinates from Google Maps instead."),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      {office && <input type="hidden" name="id" value={office.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Office name" htmlFor={`name-${id}`} error={e.name}>
          <Input id={`name-${id}`} name="name" defaultValue={office?.name} required />
        </Field>
        <Field label="Address" htmlFor={`addr-${id}`} optional error={e.address}>
          <Input id={`addr-${id}`} name="address" defaultValue={office?.address ?? ""} />
        </Field>
        <Field label="Latitude" htmlFor={`lat-${id}`} error={e.latitude}>
          <Input ref={lat} id={`lat-${id}`} name="latitude" inputMode="decimal" defaultValue={office?.latitude ?? ""} placeholder="6.5560" required />
        </Field>
        <Field label="Longitude" htmlFor={`lng-${id}`} error={e.longitude}>
          <Input ref={lng} id={`lng-${id}`} name="longitude" inputMode="decimal" defaultValue={office?.longitude ?? ""} placeholder="3.3920" required />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={useHere}><LocateFixed className="size-4" aria-hidden /> Use my current location</Button>
        {locMsg && <p className="text-xs text-fg-muted" role="status">{locMsg}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Check-in radius (m)" htmlFor={`rad-${id}`} error={e.radius_m} hint="100–200 m suits most buildings">
          <Input id={`rad-${id}`} name="radius_m" type="number" min={10} max={5000} defaultValue={office?.radius_m ?? 100} />
        </Field>
        <Field label="Opens" htmlFor={`open-${id}`}>
          <Input id={`open-${id}`} name="opens" type="time" defaultValue={firstDay?.open ?? "08:00"} />
        </Field>
        <Field label="Closes" htmlFor={`close-${id}`}>
          <Input id={`close-${id}`} name="closes" type="time" defaultValue={firstDay?.close ?? "17:00"} />
        </Field>
      </div>
      <fieldset>
        <legend className="text-sm font-medium">Working days</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {DAYS.map(([k, label]) => (
            <label key={k} className="flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft">
              <Checkbox name={`day_${k}`} defaultChecked={office ? k in sched : k !== "sun"} className="size-4" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <input type="hidden" name="timezone" value={office?.timezone ?? "Africa/Lagos"} />
      <label className="flex items-center gap-2 text-sm">
        <Checkbox name="is_active" defaultChecked={office?.is_active ?? true} /> Active (members can check in)
      </label>
      <SubmitButton pendingLabel="Saving…">{office ? "Save changes" : "Create office"}</SubmitButton>
    </form>
  );
}
