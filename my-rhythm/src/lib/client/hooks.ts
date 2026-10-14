"use client";
import { useCallback } from "react";
import { DateTime } from "luxon";
import { api, useApi } from "./api";
import type { Profile } from "../types";

export function useProfile() {
  const { data, mutate } = useApi<{ profile: Profile; email: string }>("/api/profile", { revalidateOnFocus: false });
  const tz = data?.profile?.timezone ?? "Africa/Lagos";
  return { profile: data?.profile, email: data?.email, tz, today: DateTime.now().setZone(tz).toISODate()!, mutate };
}

/** CRUD helper for whitelisted module tables (/api/data/<table>). */
export function useCollection<T extends { id: string }>(table: string, query = "") {
  const key = `/api/data/${table}${query ? `?${query}` : ""}`;
  const { data, error, mutate, isLoading } = useApi<{ rows: T[] }>(key);
  const create = useCallback(async (row: Partial<T> | Partial<T>[]) => {
    const res = await api<{ rows: T[] }>(`/api/data/${table}`, { body: row });
    await mutate();
    return res.rows;
  }, [table, mutate]);
  const update = useCallback(async (id: string, patch: Partial<T>) => {
    await api(`/api/data/${table}/${id}`, { method: "PATCH", body: patch });
    await mutate();
  }, [table, mutate]);
  const remove = useCallback(async (id: string) => {
    await api(`/api/data/${table}/${id}`, { method: "DELETE" });
    await mutate();
  }, [table, mutate]);
  return { rows: data?.rows, error, isLoading, mutate, create, update, remove };
}
