import { DateTime } from "luxon";
import { HttpError, route } from "@/lib/api";
import { decorate, loadScheduleData, occurrencesForDays } from "@/lib/data";

/** GET /api/schedule?from=YYYY-MM-DD&to=YYYY-MM-DD → decorated occurrences + categories */
export const GET = route(async (req, { supabase, user }) => {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to") ?? from;
  if (!from || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !to || !/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new HttpError(400, "from/to required");
  if (DateTime.fromISO(to).diff(DateTime.fromISO(from), "days").days > 62) throw new HttpError(400, "Range too large");
  const data = await loadScheduleData(supabase, user.id, { completionsFrom: DateTime.fromISO(from).minus({ days: 2 }).toISODate()!, completionsTo: to });
  const now = DateTime.now().setZone(data.profile.timezone);
  const occurrences = decorate(occurrencesForDays(data, from, to, url.searchParams.get("cancelled") === "1"), data, now);
  return { timezone: data.profile.timezone, profile: data.profile, categories: data.categories, occurrences };
});
