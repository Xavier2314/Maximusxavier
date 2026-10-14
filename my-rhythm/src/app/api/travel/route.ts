import { z } from "zod";
import { DateTime } from "luxon";
import { body, HttpError, must, route } from "@/lib/api";
import { loadScheduleData } from "@/lib/data";
import { ActivityDraftSchema } from "@/lib/schedule/draft";
import { proposeDrafts } from "@/lib/proposals";

const Trip = z.object({
  destination: z.string().trim().min(1).max(120),
  depart_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  depart_time: z.string().regex(/^\d{2}:\d{2}$/),
  return_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  return_time: z.string().regex(/^\d{2}:\d{2}$/),
  travel_method: z.string().max(60).optional().nullable(),
  travel_duration_minutes: z.number().int().min(0).max(4320).optional().nullable(),
  prep_minutes: z.number().int().min(0).max(600).default(60),
  accommodation_notes: z.string().max(2000).optional().nullable(),
  itinerary: z.string().max(5000).optional().nullable(),
});

export const GET = route(async (_req, { supabase, user }) => ({
  trips: must(await supabase.from("trips").select("*").eq("user_id", user.id).neq("status", "draft").order("depart_at", { ascending: false }).limit(50), "trips"),
}));

/** Travel Mode: store the trip as a draft and analyse the whole trip period. */
export const POST = route(async (req, { supabase, user }) => {
  const t = await body(req, Trip);
  const data = await loadScheduleData(supabase, user.id);
  const tz = data.profile.timezone;
  const depart = DateTime.fromISO(`${t.depart_date}T${t.depart_time}`, { zone: tz });
  const ret = DateTime.fromISO(`${t.return_date}T${t.return_time}`, { zone: tz });
  if (!(ret > depart)) throw new HttpError(400, "Return must be after departure");
  const trip = must(await supabase.from("trips").insert({
    user_id: user.id, destination: t.destination, depart_at: depart.toISO(), return_at: ret.toISO(), travel_method: t.travel_method ?? null,
    travel_duration_minutes: t.travel_duration_minutes ?? null, prep_minutes: t.prep_minutes, accommodation_notes: t.accommodation_notes ?? null,
    itinerary: t.itinerary ?? null, status: "draft",
  }).select("id").single(), "create trip") as { id: string };
  const draft = ActivityDraftSchema.parse({
    title: `Trip to ${t.destination}`, category_key: "travel", kind: "trip", start_date: depart.toISODate(), start_time: depart.toFormat("HH:mm"),
    duration_minutes: Math.round(ret.diff(depart, "minutes").minutes), location: t.destination, classification: "fixed", priority: 2,
    notes: [t.travel_method && `Travel: ${t.travel_method}${t.travel_duration_minutes ? ` (~${t.travel_duration_minutes} min, your estimate)` : ""}`, t.accommodation_notes && `Stay: ${t.accommodation_notes}`].filter(Boolean).join("\n") || null,
    description: t.itinerary ?? null, source: "travel", trip_id: trip.id,
    reminders: [
      { anchor: "start", offset_minutes: -1440, message: `Your trip to ${t.destination} is tomorrow. Check your packing list.` },
      { anchor: "start", offset_minutes: -120, message: `Departure for ${t.destination} in 2 hours.` },
      { anchor: "start", offset_minutes: 0, message: `Time to leave for ${t.destination}. Safe travels!` },
      { anchor: "end", offset_minutes: 0, message: "Welcome back! Take it easy tonight and restart your rhythm tomorrow." },
    ],
  });
  const proposal = await proposeDrafts(supabase, user.id, data, [draft], "travel", { destination: t.destination, prepMinutes: t.prep_minutes, tripId: trip.id });
  await supabase.from("trips").update({ proposal_id: proposal.id }).eq("id", trip.id);
  return { tripId: trip.id, proposal };
});
