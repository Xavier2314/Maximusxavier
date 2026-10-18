import { Bell, KeyRound, Link2, LogOut, Mail, MessageCircle, Music2, Shield, UserRound } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, PageHeader } from "@/components/ui/misc";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireViewer } from "@/lib/auth";
import { env } from "@/lib/env";
import { isGoogleConfigured, isSpotifySearchConfigured, isWhatsAppConfigured } from "@/lib/followup";
import { createClient } from "@/lib/supabase/server";
import { disconnectIntegrationAction, signOutEverywhereAction } from "./actions";
import { PasswordForm, PreferencesForm, PrivacyForm } from "./forms";
import { PushToggle } from "./push-toggle";

export const metadata = { title: "Settings" };

const CONNECT_NOTICES: Record<string, { ok: boolean; text: string }> = {
  "google-connected": { ok: true, text: "Gmail connected. Maximus AI can now email your prospects from your address." },
  "google-failed": { ok: false, text: "Gmail could not be connected. Please try again." },
  "google-scope": { ok: false, text: "Please tick the box that allows Maximus to send email, then try again." },
  "google-not-configured": { ok: false, text: "Gmail connection isn't set up for this organisation yet. An administrator needs to add Google keys." },
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ connect?: string }> }) {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { connect } = await searchParams;
  const [{ data: prefs }, { data: integrations }] = await Promise.all([
    supabase.from("notification_preferences").select("push_enabled, muted_types, quiet_start, quiet_end").eq("user_id", viewer.id).maybeSingle(),
    supabase.rpc("my_integrations"),
  ]);
  const google = ((integrations ?? []) as { provider: string; account_email: string | null }[]).find((i) => i.provider === "google");
  const notice = connect ? CONNECT_NOTICES[connect] : undefined;

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
        <Card id="connections">
          <CardHeader title="Connected accounts" icon={<Link2 className="size-4" />} description="Let Maximus AI follow up with your prospects for you." />
          <CardBody className="space-y-4">
            {notice && <p role="status" className={`rounded-xl px-4 py-3 text-sm ${notice.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>{notice.text}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-danger-soft text-danger"><Mail className="size-5" aria-hidden /></span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">Gmail</p>
                <p className="text-sm text-fg-muted">{google ? `Connected as ${google.account_email ?? "your Google account"}` : "Send prospect emails from your own address and let the AI read their replies."}</p>
              </div>
              {google ? (
                <form action={disconnectIntegrationAction}><input type="hidden" name="provider" value="google" />
                  <SubmitButton variant="outline" size="sm" pendingLabel="Disconnecting…">Disconnect</SubmitButton></form>
              ) : isGoogleConfigured()
                ? <LinkButton href="/api/integrations/google/start" size="sm" prefetch={false}>Connect Gmail</LinkButton>
                : <Badge>Admin setup needed</Badge>}
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
              <span className="grid size-10 place-items-center rounded-xl bg-success-soft text-success"><MessageCircle className="size-5" aria-hidden /></span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">WhatsApp</p>
                <p className="text-sm text-fg-muted">{isWhatsAppConfigured()
                  ? "The Maximus WhatsApp Business number is connected. AI follow-ups and replies work automatically."
                  : "You can always open messages in your own WhatsApp. Automatic sending needs the organisation's WhatsApp Business number."}</p>
              </div>
              <Badge tone={isWhatsAppConfigured() ? "green" : "neutral"}>{isWhatsAppConfigured() ? "Connected" : "Admin setup needed"}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
              <span className="grid size-10 place-items-center rounded-xl bg-[#1db954]/15 text-[#1a9c48]"><Music2 className="size-5" aria-hidden /></span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">Spotify</p>
                <p className="text-sm text-fg-muted">{isSpotifySearchConfigured()
                  ? "Search Spotify podcasts and songs and send them to prospects."
                  : "Paste any Spotify link into a prospect message. Search inside Maximus needs admin setup."}</p>
              </div>
              <Badge tone={isSpotifySearchConfigured() ? "green" : "neutral"}>{isSpotifySearchConfigured() ? "Search on" : "Links only"}</Badge>
            </div>
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
