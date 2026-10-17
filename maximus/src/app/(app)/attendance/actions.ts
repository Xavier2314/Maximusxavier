"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";
import type { Attendance } from "@/lib/types";

export type ActionResult<T = undefined> = { ok: boolean; message: string; data?: T; errors?: Record<string, string[] | undefined> };

const coords = z.object({
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  accuracy: z.number().min(0).max(100000).nullable(),
});

export async function checkInAction(input: { officeId: string; lat: number | null; lng: number | null; accuracy: number | null; note?: string }): Promise<ActionResult<Attendance>> {
  const parsed = coords.extend({ officeId: z.string().uuid(), note: z.string().max(500).optional() }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid check-in details." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_in", {
    p_office: parsed.data.officeId, p_lat: parsed.data.lat, p_lng: parsed.data.lng,
    p_accuracy: parsed.data.accuracy, p_note: parsed.data.note ?? null,
  });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  return { ok: true, message: "Checked in", data: data as Attendance };
}

export async function checkOutAction(input: { lat: number | null; lng: number | null; accuracy: number | null }): Promise<ActionResult<Attendance>> {
  const parsed = coords.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid check-out details." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_out", { p_lat: parsed.data.lat, p_lng: parsed.data.lng, p_accuracy: parsed.data.accuracy });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  return { ok: true, message: "Checked out", data: data as Attendance };
}

const correctionSchema = z.object({
  office_id: z.string().uuid("Choose an office"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
  check_in: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  check_out: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  reason: z.string().trim().min(5, "Explain what happened (at least 5 characters)").max(1000),
  attendance_id: z.string().uuid().optional().or(z.literal("")),
  tz_offset: z.string().regex(/^[+-]\d{2}:\d{2}$/).optional(),
});

export async function requestCorrectionAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = correctionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  const v = parsed.data;
  const offset = v.tz_offset ?? "+01:00";
  const at = (t?: string) => (t ? `${v.date}T${t}:00${offset}` : null);
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_attendance_correction", {
    p_office: v.office_id, p_date: v.date, p_reason: v.reason,
    p_check_in: at(v.check_in || undefined), p_check_out: at(v.check_out || undefined),
    p_attendance: v.attendance_id || null,
  });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/attendance");
  return { ok: true, message: "Correction request sent to your office manager." };
}

export async function reviewCorrectionAction(id: string, approve: boolean, note?: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_attendance_correction", { p_id: id, p_approve: approve, p_note: note ?? null });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/admin/approvals");
  revalidatePath("/attendance/live");
  return { ok: true, message: approve ? "Correction approved." : "Correction rejected." };
}
