import { Bell, KeyRound, LogOut, Shield, UserRound } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireViewer } from "@/lib/auth";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { signOutEverywhereAction } from "./actions";
import { PasswordForm, PreferencesForm, PrivacyForm } from "./forms";
import { PushToggle } from "./push-toggle";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data: prefs } = await supabase.from("notification_preferences").select("push_enabled, muted_types, quiet_start, quiet_end").eq("user_id", viewer.id).maybeSingle();

  return (
    <>
      <PageHeader eyebrow="Account" title="Settings" action={<LinkButton href="/profile" variant="outline" size="sm"><UserRound className="size-4" aria-hidden /> Edit profile</LinkButton>} />
      <div className="space-y-6">
        <Card id="notifications">
          <CardHeader title="Notifications" icon={<Bell className="size-4" />} description="Choose what you hear about and when." />
          <CardBody className="space-y-6">
            <PushToggle vapidKey={env.vapidPublicKey} />
            <PreferencesForm prefs={prefs} />
            <p className="text-xs text-fg-subtle">Email notifications are not switched on for this organisation yet. In-app notifications are always kept in your inbox.</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Privacy" icon={<Shield className="size-4" />} />
          <CardBody><PrivacyForm birthday={viewer.profile.birthday_visibility} aiMemory={viewer.profile.ai_memory_enabled} /></CardBody>
        </Card>
        <Card>
          <CardHeader title="Security" icon={<KeyRound className="size-4" />} description={`Signed in as ${viewer.email}`} />
          <CardBody className="space-y-6">
            <PasswordForm />
            <form action={signOutEverywhereAction} className="border-t border-border pt-6">
              <p className="mb-3 text-sm text-fg-muted">Lost a phone or used a shared computer? Sign out of Maximus on every device.</p>
              <SubmitButton variant="outline" pendingLabel="Signing out…"><LogOut className="size-4" aria-hidden /> Sign out everywhere</SubmitButton>
            </form>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
