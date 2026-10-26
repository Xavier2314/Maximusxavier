import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env, serverEnv } from "../env";

/**
 * Service-role client. BYPASSES Row Level Security — only used by the
 * scheduler/push pipeline, which always scopes queries by user_id explicitly.
 */
export function createAdminClient() {
  const key = serverEnv().serviceRoleKey;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return createClient(env.supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
