import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function dbConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Server-only Supabase client using the service role key.
 * Row Level Security is enabled on every table with no public policies, so the
 * database is never reachable from the browser; all access goes through this module.
 */
export function db(): SupabaseClient {
  if (!dbConfigured()) throw new Error("DATABASE_NOT_CONFIGURED");
  if (!client) {
    client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
