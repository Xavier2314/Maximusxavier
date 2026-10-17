import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env, requireServiceRoleKey } from "@/lib/env";

/** Supabase client acting as the signed-in member. All RLS policies apply. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: the middleware refreshes the session instead.
        }
      },
    },
  });
}

/**
 * Service-role client that BYPASSES row level security. Only for trusted
 * server jobs (cron reminders, push delivery). Never use it to answer a
 * member's request for data.
 */
export function createAdminClient() {
  return createSupabaseClient(env.supabaseUrl, requireServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
