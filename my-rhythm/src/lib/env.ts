/** Centralised environment access. Server-only values must never be imported into client components. */
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
};

export function serverEnv() {
  return {
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    allowedEmails: (process.env.ALLOWED_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "",
    vapidSubject: process.env.VAPID_SUBJECT ?? "mailto:admin@example.com",
    cronSecret: process.env.CRON_SECRET ?? "",
    anthropicKey: process.env.ANTHROPIC_API_KEY ?? "",
    anthropicModel: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
    pushActionSecret: process.env.PUSH_ACTION_SECRET || process.env.CRON_SECRET || "",
  };
}

export function isEmailAllowed(email: string | undefined | null): boolean {
  const allowed = serverEnv().allowedEmails;
  if (!email) return false;
  // If no allow-list is configured we fail closed in production.
  if (!allowed.length) return process.env.NODE_ENV !== "production";
  return allowed.includes(email.toLowerCase());
}
