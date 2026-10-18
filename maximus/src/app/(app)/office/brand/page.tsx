import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { DEFAULT_BRAND, OFFICE_BRAND_COLUMNS, officeBrand, platformBrand, type OfficeBrandRow, type PlatformBrandSetting } from "@/lib/branding";
import { createClient } from "@/lib/supabase/server";
import { OfficePicker } from "../office-picker";
import { BrandEditor } from "./brand-editor";
import { resetOfficeBrandAction, saveOfficeBrandAction } from "./actions";

export const metadata = { title: "Office branding" };

export default async function OfficeBrandPage({ searchParams }: { searchParams: Promise<{ office?: string }> }) {
  const viewer = await requireViewer();
  if (viewer.offices.length === 0) redirect("/forbidden");
  const { office: wanted } = await searchParams;
  const officeId = viewer.offices.find((o) => o.id === wanted)?.id
    ?? viewer.offices.find((o) => o.id === viewer.profile.office_id)?.id ?? viewer.offices[0].id;
  const supabase = await createClient();
  const [{ data: row }, { data: setting }] = await Promise.all([
    supabase.from("offices").select(OFFICE_BRAND_COLUMNS).eq("id", officeId).single<OfficeBrandRow>(),
    supabase.from("app_settings").select("value").eq("key", "branding").maybeSingle(),
  ]);
  const platform = platformBrand(setting?.value as PlatformBrandSetting | null);
  const current = officeBrand(row, platform) ?? { ...platform, isDefault: true };

  return (
    <>
      <PageHeader eyebrow="Office view" title="Branding"
        description={`Make ${row?.name ?? "your office"} feel like yours: your name, logo and colours. Your members see it across the app.`}
        action={<OfficePicker offices={viewer.offices} current={officeId} />} />
      <BrandEditor key={officeId} mode="office" officeId={officeId} initial={{ ...current, logo: row?.logo_url ?? null }}
        fallbackName={row?.name ?? DEFAULT_BRAND.name}
        save={saveOfficeBrandAction} reset={resetOfficeBrandAction.bind(null, officeId)} />
    </>
  );
}
