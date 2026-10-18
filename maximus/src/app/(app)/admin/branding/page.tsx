import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { DEFAULT_BRAND, platformBrand, type PlatformBrandSetting } from "@/lib/branding";
import { createClient } from "@/lib/supabase/server";
import { BrandEditor } from "../../office/brand/brand-editor";
import { resetPlatformBrandAction, savePlatformBrandAction } from "../../office/brand/actions";

export const metadata = { title: "Platform branding" };

export default async function PlatformBrandingPage() {
  const viewer = await requireViewer();
  if (!viewer.roles.includes("super_admin")) redirect("/forbidden");
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("value").eq("key", "branding").maybeSingle();
  const setting = (data?.value ?? {}) as PlatformBrandSetting;
  const current = platformBrand(setting);

  return (
    <>
      <PageHeader eyebrow="Organisation" title="Platform branding (white-label)"
        description="Rename and recolour the whole system. Offices with their own branding keep it; everyone else sees this look." />
      <BrandEditor mode="platform" initial={{ ...current, logo: setting.logo_url ?? null, isDefault: !setting.app_name }}
        fallbackName={DEFAULT_BRAND.name} save={savePlatformBrandAction} reset={resetPlatformBrandAction} />
    </>
  );
}
