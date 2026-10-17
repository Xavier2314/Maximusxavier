/**
 * Central access to configuration. Public values are inlined by Next.js at build
 * time; server-only values must only be read from server code.
 */
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);

export function requireServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return key;
}

/** Feature status for integrations that need extra credentials. Server-only. */
export function integrationStatus() {
  return {
    supabase: isSupabaseConfigured,
    serviceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    webPush: Boolean(env.vapidPublicKey && process.env.VAPID_PRIVATE_KEY),
    ai: Boolean(process.env.ANTHROPIC_API_KEY),
    cron: Boolean(process.env.CRON_SECRET),
  };
}
