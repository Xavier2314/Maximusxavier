"use client";
import { useState } from "react";
import Link from "next/link";
import { DateTime } from "luxon";
import { Luggage, MapPin, Plane } from "lucide-react";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, SectionTitle, Select, Skeleton, Textarea } from "@/components/ui";
import { ProposalReview, type ProposalRecord } from "@/components/ProposalReview";
import { useToast } from "@/components/toast";
import { api, useApi } from "@/lib/client/api";
import { useProfile } from "@/lib/client/hooks";
import type { CategoryRow } from "@/lib/types";

interface Trip { id: string; destination: string; depart_at: string; return_at: string; travel_method: string | null; status: string; proposal_id: string | null; accommodation_notes: string | null }

export default function TravelPage() {
  const { tz, today } = useProfile();
  const toast = useToast();
  const { data: trips, mutate } = useApi<{ trips: Trip[] }>("/api/travel");
  const { data: cats } = useApi<{ categories: CategoryRow[] }>("/api/categories");
  const [f, setF] = useState({ destination: "", depart_date: "", depart_time: "09:00", return_date: "", return_time: "18:00", travel_method: "", travel_duration_minutes: "", prep_minutes: "60", accommodation_notes: "", itinerary: "" });
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<ProposalRecord | null>(null);

  async function analyze(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api<{ proposal: ProposalRecord }>("/api/travel", { body: {
        ...f, travel_method: f.travel_method || null, travel_duration_minutes: f.travel_duration_minutes ? Number(f.travel_duration_minutes) : null,
        prep_minutes: Number(f.prep_minutes) || 60, accommodation_notes: f.accommodation_notes || null, itinerary: f.itinerary || null,
      } });
      setProposal(res.proposal);
    } catch (err) {
      toast.show("error", err instanceof Error ? err.message : "Could not analyse the trip");
    } finally {
      setBusy(false);
    }
  }

  if (proposal && cats) {
    return (
      <div>
        <PageHeader title={proposal.title} subtitle="Here's how the trip affects your routine. Approve what you want." />
        <ProposalReview proposal={proposal} categories={cats.categories} onDone={() => { setProposal(null); mutate(); }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Travel mode" subtitle="Plan a trip and I'll reorganise your routine around it — with your approval." />
      <form onSubmit={analyze}>
        <Card className="grid gap-4 p-5 md:grid-cols-2">
          <Field label="Destination" className="md:col-span-2"><Input required value={f.destination} onChange={(e) => setF({ ...f, destination: e.target.value })} placeholder="e.g. Abuja" /></Field>
          <Field label="Departure date"><Input type="date" required min={today} value={f.depart_date} onChange={(e) => setF({ ...f, depart_date: e.target.value, return_date: f.return_date || e.target.value })} /></Field>
          <Field label="Departure time"><Input type="time" required value={f.depart_time} onChange={(e) => setF({ ...f, depart_time: e.target.value })} /></Field>
          <Field label="Return date"><Input type="date" required min={f.depart_date || today} value={f.return_date} onChange={(e) => setF({ ...f, return_date: e.target.value })} /></Field>
          <Field label="Return time"><Input type="time" required value={f.return_time} onChange={(e) => setF({ ...f, return_time: e.target.value })} /></Field>
          <Field label="Travel method">
            <Select value={f.travel_method} onChange={(e) => setF({ ...f, travel_method: e.target.value })}>
              <option value="">—</option><option>Flight</option><option>Road (car)</option><option>Bus</option><option>Train</option><option>Other</option>
            </Select>
          </Field>
          <Field label="Your estimated journey time (min)" hint="Your own estimate — I don't invent journey times or bookings."><Input type="number" min={0} value={f.travel_duration_minutes} onChange={(e) => setF({ ...f, travel_duration_minutes: e.target.value })} /></Field>
          <Field label="Preparation time needed (min)"><Input type="number" min={0} max={600} value={f.prep_minutes} onChange={(e) => setF({ ...f, prep_minutes: e.target.value })} /></Field>
          <Field label="Accommodation notes"><Input value={f.accommodation_notes} onChange={(e) => setF({ ...f, accommodation_notes: e.target.value })} /></Field>
          <Field label="Itinerary (optional)" className="md:col-span-2"><Textarea value={f.itinerary} onChange={(e) => setF({ ...f, itinerary: e.target.value })} /></Field>
          <Button type="submit" size="lg" className="md:col-span-2" loading={busy}><Plane className="h-4 w-4" /> Analyse my schedule for this trip</Button>
        </Card>
      </form>

      <section>
        <SectionTitle>Trips</SectionTitle>
        {!trips ? <Skeleton className="h-24" /> : trips.trips.length === 0 ? <EmptyState icon={<Luggage className="h-8 w-8" />} title="No trips yet" /> : (
          <Card className="divide-y divide-line">
            {trips.trips.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-4">
                <MapPin className="h-5 w-5 text-lavender" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{t.destination}</p>
                  <p className="text-sm text-muted">{DateTime.fromISO(t.depart_at).setZone(tz).toFormat("ccc d LLL, h:mm a")} → {DateTime.fromISO(t.return_at).setZone(tz).toFormat("ccc d LLL, h:mm a")}{t.travel_method ? ` · ${t.travel_method}` : ""}</p>
                </div>
                <Badge color={t.status === "planned" ? "#14b8a6" : undefined}>{t.status}</Badge>
                {t.proposal_id && <Link href={`/proposals/${t.proposal_id}`} className="text-sm text-lavender">Plan</Link>}
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
