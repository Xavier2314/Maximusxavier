import { CircleCheck, CircleDashed, Flame, Plug, ToggleRight } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { requirePermission } from "@/lib/auth";
import { integrationStatus } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { ActiveDefinitionForm } from "./settings-forms";

export const metadata = { title: "System settings" };

export default async function SettingsAdminPage() {
  await requirePermission("manage_roles");
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("key, value");
  const settings = Object.fromEntries((data ?? []).map((r) => [r.key as string, r.value as Record<string, unknown>]));
  const s = integrationStatus();
  const integrations = [
    { name: "Supabase (database, auth, storage, realtime)", ok: s.supabase && s.serviceRole, env: "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY" },
    { name: "Daily reminders (Vercel Cron)", ok: s.cron && s.serviceRole, env: "CRON_SECRET" },
    { name: "Web push notifications", ok: s.webPush, env: "NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT" },
    { name: "Maximus AI (Claude)", ok: s.ai, env: "ANTHROPIC_API_KEY" },
    { name: "Email notifications", ok: false, env: "Not built yet — Supabase Auth emails (sign-up, reset) work separately" },
  ];
  const features = settings.features ?? {};

  return (
    <>
      <PageHeader eyebrow="Administration" title="System settings" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Active member definition" icon={<Flame className="size-4" />}
            description="Used for active/inactive counts and leader alerts. Set a threshold to 0 to ignore it." />
          <CardBody><ActiveDefinitionForm value={settings.active_member_definition ?? {}} /></CardBody>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Integrations" icon={<Plug className="size-4" />} description="Configured through environment variables in Vercel." />
            <CardBody className="space-y-3">
              {integrations.map((i) => (
                <div key={i.name} className="flex items-start gap-3">
                  {i.ok ? <CircleCheck className="mt-0.5 size-5 text-success" aria-label="Configured" /> : <CircleDashed className="mt-0.5 size-5 text-fg-subtle" aria-label="Not configured" />}
                  <div><p className="text-sm font-medium">{i.name}</p><p className="font-mono text-xs text-fg-subtle">{i.env}</p></div>
                </div>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Feature flags" icon={<ToggleRight className="size-4" />} />
            <CardBody className="space-y-3 text-sm">
              <p><b>NIN verification:</b> {features.nin_verification ? "on" : "off"} — disabled by design. It requires an established lawful need, an approved verification provider and a privacy review before it can be built. No NIN data is collected.</p>
              <p><b>AI assistant:</b> {features.ai_assistant === false ? "off" : "on"}</p>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
