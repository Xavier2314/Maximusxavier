import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/admin-auth";
import { db, dbConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

const COLS = ["reference", "status", "ticket_id", "full_name", "email", "phone", "city", "is_member", "organisation", "referral_source", "notes", "amount_kobo", "currency", "channel", "paid_at", "created_at"] as const;

function cell(v: unknown) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // guard against spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  if (!(await getSession())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  if (!dbConfigured()) return NextResponse.json({ error: "database not configured" }, { status: 503 });
  const sp = req.nextUrl.searchParams;
  let q = db().from("registrations").select(COLS.join(",")).order("created_at", { ascending: true }).limit(50000);
  const status = sp.get("status"); const ticket = sp.get("ticket"); const term = (sp.get("q") ?? "").trim().replace(/[%,()]/g, "");
  if (status && status !== "all") q = q.eq("status", status);
  if (ticket && ticket !== "all") q = q.eq("ticket_id", ticket);
  if (term) q = q.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,reference.ilike.%${term}%`);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  const csv = [COLS.join(","), ...rows.map((r) => COLS.map((c) => cell(r[c])).join(","))].join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse("﻿" + csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="registrations-${stamp}.csv"`, "Cache-Control": "no-store" } });
}
