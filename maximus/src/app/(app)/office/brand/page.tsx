import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { env } from "@/lib/env";
import { featuredFrom } from "@/lib/featured";
import { OfficeVideoForm } from "./office-video-form";
import { DEFAULT_BRAND, OFFICE_BRAND_COLUMNS, officeBrand, platformBrand, type OfficeBrandRow, type PlatformBrandSetting } from "@/lib/branding";
import { createClient } from "@/lib/supabase/server";
import { OfficePicker } from "../office-picker";
import { BrandEditor } from "./brand-editor";
import { WhiteLabelUnlock } from "./white-label-unlock";
import type { WhiteLabelFee, WhiteLabelRequest } from "@/lib/white-label";
import { resetOfficeBrandAction, saveOfficeBrandAction } from "./actions";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { isFlutterwaveConfigured } from "@/lib/flutterwave";
import { PayOnline } from "../../payments/pay-online";

export const metadata = { title: "Office branding" };

export default async function OfficeBrandPage({ searchParams }: { searchParams: Promise<{ office?: string }> }) {
  const viewer = await requireViewer();
  if (viewer.offices.length === 0) redirect("/forbidden");
  const { office: wanted } = await searchParams;
  const officeId = viewer.offices.find((o) => o.id === wanted)?.id
    ?? viewer.offices.find((o) => o.id === viewer.profile.office_id)?.id ?? viewer.offices[0].id;
  const supabase = await createClient();
  const [{ data: row }, { data: setting }, { data: paidRow }, { data: feeRow }, { data: latest }] = await Promise.all([
    supabase.from("offices").select(OFFICE_BRAND_COLUMNS).eq("id", officeId).single<OfficeBrandRow>(),
    supabase.from("app_settings").select("value").eq("key", "branding").maybeSingle(),
    supabase.from("offices").select("white_label_paid").eq("id", officeId).single(),
    supabase.from("app_settings").select("value").eq("key", "white_label_fee").maybeSingle(),
    supabase.from("white_label_requests").select("*").eq("office_id", officeId).order("created_at", { ascending: false }).limit(1).maybeSingle<WhiteLabelRequest>(),
  ]);
  const unlocked = Boolean(paidRow?.white_label_paid) || viewer.roles.includes("super_admin");
  const fee = feeRow?.value as WhiteLabelFee | undefined;
  const platform = platformBrand(setting?.value as PlatformBrandSetting | null);
  const current = officeBrand(row, platform) ?? { ...platform, isDefault: true };

  return (
    <>
      <PageHeader eyebrow="Office view" title="Branding"
        description={`Make ${row?.name ?? "your office"} feel like yours: your name, logo and colours. Your members see it across the app.`}
        action={<OfficePicker offices={viewer.offices} current={officeId} />} />
      <Card className="mb-6">
        <CardHeader title={row?.slug ? "Your company link" : "Your members' join link"}
          description={row?.slug ? "Share this one link: new members join here, and existing members sign in through it to see your brand." : "Anyone who signs up with this link joins this office, sees its brand and is placed under you."} />
        <CardBody>
          <p className="break-all rounded-xl bg-surface-muted p-3 font-mono text-sm">{row?.slug ? `${env.siteUrl}/c/${row.slug}` : `${env.siteUrl}/register?office=${officeId}&ref=${encodeURIComponent(viewer.profile.referral_code)}`}</p>
          {row?.slug && <p className="mt-2 text-xs text-fg-subtle">Sign-in link for members: {`${env.siteUrl}/c/${row.slug}?to=login`}</p>}
        </CardBody>
      </Card>
      {!unlocked && fee && isFlutterwaveConfigured() && latest?.status !== "pending" && (
        <Card className="mb-6 border-2 border-primary/40">
          <CardHeader title={`Remove "Powered by": pay ₦${Number(fee.amount).toLocaleString()} online`}
            description="Unlocks instantly once Flutterwave confirms the payment. You can still pay by transfer below." />
          <CardBody className="max-w-md"><PayOnline purpose="white_label" fixedAmount={Number(fee.amount)} officeId={officeId} /></CardBody>
        </Card>
      )}
      {unlocked && (
        <Card className="mb-6">
          <CardHeader title="Your featured video" description="Your own YouTube or Loom video for your members: a box on Home, in the side menu, and an optional pop-up." />
          <CardBody className="max-w-xl"><OfficeVideoForm key={officeId} officeId={officeId} current={featuredFrom(row?.featured_video)} /></CardBody>
        </Card>
      )}
      <BrandEditor key={officeId} mode="office" officeId={officeId} initial={{ ...current, logo: row?.logo_url ?? null }}
        fallbackName={row?.name ?? DEFAULT_BRAND.name}
        save={saveOfficeBrandAction} reset={resetOfficeBrandAction.bind(null, officeId)} whiteLabelUnlocked={unlocked}>
        {!unlocked && fee && <WhiteLabelUnlock officeId={officeId} fee={fee} latest={latest ?? null} />}
      </BrandEditor>
    </>
  );
}
