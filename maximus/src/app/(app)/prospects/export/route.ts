import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { contactsToCsv, type ExportContact } from "@/lib/contacts";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** The member's own contacts as a CSV file. */
export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return new NextResponse("Not signed in", { status: 401 });
  const supabase = await createClient();
  const { data } = await supabase.from("prospects").select("full_name, phone, email, stage, source, tags, notes, created_at").eq("owner_id", viewer.id).order("created_at", { ascending: false }).limit(20000);
  return new NextResponse(`﻿${contactsToCsv((data ?? []) as ExportContact[])}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="contacts.csv"', "Cache-Control": "no-store" } });
}
