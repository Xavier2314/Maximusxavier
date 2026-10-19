import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { cleanForm, toCsv } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** The owner's responses as a CSV file. Row-level security means only the form's owner gets any rows. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getViewer()) || !/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });
  const supabase = await createClient();
  const { data: f } = await supabase.from("forms").select("title, slug, definition").eq("id", id).maybeSingle();
  if (!f) return new NextResponse("Not found", { status: 404 });
  const { data } = await supabase.from("form_responses").select("answers, created_at").eq("form_id", id).order("created_at", { ascending: false }).limit(5000);
  const csv = toCsv(cleanForm(f.definition), (data ?? []) as { created_at: string; answers: Record<string, string> }[]);
  return new NextResponse(`﻿${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${f.slug}-responses.csv"`, "Cache-Control": "no-store" } });
}
