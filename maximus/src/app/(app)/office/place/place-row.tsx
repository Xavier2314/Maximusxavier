"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { setMemberOfficeAction } from "../../team/actions";

export function PlaceRow({ memberId, current, offices }: { memberId: string; current: string | null; offices: { id: string; name: string }[] }) {
  const [office, setOffice] = useState(current ?? "");
  const [saved, setSaved] = useState(current);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2 sm:w-80">
      <Select value={office} onChange={(e) => setOffice(e.target.value)} aria-label="Office" className="flex-1">
        <option value="" disabled>Choose an office</option>
        {offices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </Select>
      <Button size="md" variant={office && office === saved ? "secondary" : "primary"} disabled={pending || !office || office === saved}
        onClick={() => start(async () => {
          const r = await setMemberOfficeAction(memberId, office);
          if (r?.ok) { setSaved(office); setError(""); } else setError(r?.message ?? "Couldn't save.");
        })}>
        {office && office === saved ? <Check className="size-4" aria-label="Saved" /> : pending ? "…" : "Save"}
      </Button>
      {error && <p className="w-full text-xs text-danger" role="alert">{error}</p>}
    </div>
  );
}
