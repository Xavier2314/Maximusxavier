import { CircleCheck, CircleDashed } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { integrationStatus } from "@/lib/env";

export const metadata = { title: "Setup" };
export const dynamic = "force-dynamic";

/** Shown until Supabase is configured; lists which integrations are ready. */
export default function SetupPage() {
  const s = integrationStatus();
  const items = [
    { ok: s.supabase, name: "Supabase connection", env: "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY", required: true },
    { ok: s.serviceRole, name: "Background jobs (reminders, push delivery)", env: "SUPABASE_SERVICE_ROLE_KEY", required: true },
    { ok: s.cron, name: "Scheduled reminders security", env: "CRON_SECRET", required: true },
    { ok: s.webPush, name: "Web push notifications", env: "NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY", required: false },
    { ok: s.ai, name: "Maximus AI assistant", env: "ANTHROPIC_API_KEY", required: false },
  ];
  return (
    <main className="auth-gradient grid min-h-dvh place-items-center px-5 py-12 text-white">
      <div className="w-full max-w-xl">
        <Logo variant="full" className="h-12 w-auto" />
        <h1 className="mt-10 text-3xl font-bold tracking-tight">Finish setting up Maximus</h1>
        <p className="mt-2 text-white/70">
          Add these environment variables in Vercel → Project → Settings → Environment Variables, then redeploy.
          Full instructions are in the project README.
        </p>
        <ul className="mt-8 space-y-3">
          {items.map((i) => (
            <li key={i.name} className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              {i.ok ? <CircleCheck className="mt-0.5 size-5 text-brand-green" aria-label="Configured" />
                : <CircleDashed className="mt-0.5 size-5 text-white/40" aria-label="Not configured" />}
              <div>
                <p className="font-medium">{i.name} {!i.required && <span className="text-xs text-white/50">(optional)</span>}</p>
                <p className="mt-0.5 font-mono text-xs text-white/50">{i.env}</p>
              </div>
            </li>
          ))}
        </ul>
        {s.supabase && <a href="/login" className="mt-8 inline-flex h-11 items-center rounded-xl bg-brand-lime px-5 font-medium text-brand-navy">Continue to sign in</a>}
      </div>
    </main>
  );
}
