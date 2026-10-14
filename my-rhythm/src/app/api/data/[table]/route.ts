import { body, HttpError, must, route } from "@/lib/api";
import { z } from "zod";
import { READ_EXTRA, TABLES, pick } from "@/lib/tables";

function table(name: string) {
  if (!TABLES[name]) throw new HttpError(404, "Unknown collection");
  return TABLES[name];
}

/** GET /api/data/<table>?f.col=value&from.col=date&to.col=date&limit=100 */
export const GET = route<{ table: string }>(async (req, { supabase, user }, params) => {
  const def = table(params.table);
  const url = new URL(req.url);
  const cols = new Set([...def.fields, ...READ_EXTRA]);
  const q = supabase.from(params.table).select("*").eq("user_id", user.id);
  for (const [k, v] of url.searchParams) {
    const [op, col] = k.split(".");
    if (!col || !cols.has(col)) continue;
    if (op === "f") q.eq(col, v);
    else if (op === "from") q.gte(col, v);
    else if (op === "to") q.lte(col, v);
  }
  q.order(def.order, { ascending: !!def.asc }).limit(Math.min(Number(url.searchParams.get("limit") ?? 200), 1000));
  return { rows: must(await q, `list ${params.table}`) };
});

export const POST = route<{ table: string }>(async (req, { supabase, user }, params) => {
  table(params.table);
  const input = await body(req, z.union([z.record(z.string(), z.unknown()), z.array(z.record(z.string(), z.unknown())).max(200)]));
  const rows = (Array.isArray(input) ? input : [input]).map((r) => ({ ...pick(params.table, r), user_id: user.id }));
  const saved = must(await supabase.from(params.table).insert(rows).select(), `create ${params.table}`);
  return { rows: saved };
});
