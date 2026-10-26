import { body, HttpError, must, route } from "@/lib/api";
import { z } from "zod";
import { TABLES, pick } from "@/lib/tables";

export const PATCH = route<{ table: string; id: string }>(async (req, { supabase }, params) => {
  if (!TABLES[params.table]) throw new HttpError(404, "Unknown collection");
  const patch = pick(params.table, await body(req, z.record(z.string(), z.unknown())));
  const saved = must(await supabase.from(params.table).update(patch).eq("id", params.id).select().maybeSingle(), `update ${params.table}`);
  if (!saved) throw new HttpError(404, "Not found");
  return { row: saved };
});

export const DELETE = route<{ table: string; id: string }>(async (_req, { supabase }, params) => {
  if (!TABLES[params.table]) throw new HttpError(404, "Unknown collection");
  must(await supabase.from(params.table).delete().eq("id", params.id), `delete ${params.table}`);
  return { ok: true };
});
