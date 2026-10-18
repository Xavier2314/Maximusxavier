import { redirect } from "next/navigation";
import { ChatWidget } from "@/components/chat-widget";
import { AppShell } from "@/components/shell/app-shell";
import { featuredFrom } from "@/lib/featured";
import { BOTTOM_NAV, OFFICE_BOTTOM_NAV, visibleNav, visibleOfficeNav } from "@/components/shell/nav";
import { getViewer, primaryRole, ROLE_LABELS } from "@/lib/auth";
import { OFFICE_BRAND_COLUMNS, officeBrand, platformBrand, type OfficeBrandRow, type PlatformBrandSetting } from "@/lib/branding";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "../(auth)/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.profile.status !== "active") redirect("/suspended");

  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  // Which office's brand the Office view wears: your own office if you manage it, else your only managed office.
  const brandOfficeId = viewer.offices.find((o) => o.id === viewer.profile.office_id)?.id
    ?? (viewer.offices.length === 1 ? viewer.offices[0].id : null);
  const officeIds = [viewer.profile.office_id, brandOfficeId].filter(Boolean) as string[];
  const [{ count }, { data: announcements }, { data: brandSetting }, { data: brandOffices }, { data: featuredSetting }] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", viewer.id).is("read_at", null),
    supabase.from("announcements").select("id, title, kind").lte("published_at", nowIso)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order("pinned", { ascending: false }).order("published_at", { ascending: false }).limit(5),
    supabase.from("app_settings").select("value").eq("key", "branding").maybeSingle(),
    officeIds.length ? supabase.from("offices").select(OFFICE_BRAND_COLUMNS).in("id", officeIds).returns<OfficeBrandRow[]>()
      : Promise.resolve({ data: [] as OfficeBrandRow[] }),
    supabase.from("app_settings").select("value").eq("key", "featured_video").maybeSingle(),
  ]);
  const featured = featuredFrom(featuredSetting?.value);
  const platform = platformBrand(brandSetting?.value as PlatformBrandSetting | null);
  const homeBrand = officeBrand((brandOffices ?? []).find((o) => o.id === viewer.profile.office_id), platform);
  const managedBrand = officeBrand((brandOffices ?? []).find((o) => o.id === brandOfficeId), platform);
  // Members (sponsors and team leaders included) see their office's brand everywhere.
  // People who run an office get the platform look in My view and their office's look in Office view.
  const brands = {
    me: viewer.offices.length === 0 && homeBrand ? homeBrand : platform,
    office: managedBrand ?? platform,
  };

  const managesOffice = viewer.offices.length > 0;
  const officeSections = viewer.hasOfficeView ? visibleOfficeNav(viewer.permissions, managesOffice, viewer.roles) : [];
  const officeHome = managesOffice ? "/office" : viewer.isLeader ? "/office/team" : officeSections[0]?.items[0]?.href;
  // Everyone who belongs to an office gets a read-only "My office" page in Office view.
  const myOffice = viewer.profile.office_id && !managesOffice
    ? { title: "Office", items: [{ href: "/office/my", label: "My office", icon: "building" }] } : null;
  const office = officeHome ? {
    home: officeHome,
    label: managesOffice ? "Office view" : viewer.isLeader ? "Team view" : "Approvals",
    officeName: viewer.offices.length === 1 ? viewer.offices[0].name : managesOffice ? `${viewer.offices.length} offices` : undefined,
    sections: myOffice ? [myOffice, ...officeSections] : officeSections,
    bottom: managesOffice ? OFFICE_BOTTOM_NAV : [...(myOffice?.items ?? []), ...officeSections.flatMap((s) => s.items)].slice(0, 4),
  } : myOffice ? {
    home: "/office/my",
    label: "Office view",
    sections: [myOffice],
    bottom: [{ href: "/office/my", label: "My office", icon: "building" }, ...BOTTOM_NAV.slice(0, 3)],
  } : null;

  return (
    <AppShell
      featured={featured}
      sections={visibleNav(viewer.permissions)}
      office={office}
      brands={brands}
      platformName={platform.name}
      unread={count ?? 0}
      signOut={signOutAction}
      announcements={(announcements ?? []) as { id: string; title: string; kind: string }[]}
      user={{
        id: viewer.id,
        name: viewer.profile.full_name,
        avatar: viewer.profile.avatar_url,
        role: ROLE_LABELS[primaryRole(viewer.roles)],
        memberId: viewer.profile.member_id,
      }}>
      {children}
      <ChatWidget firstName={viewer.profile.full_name.split(" ")[0]} />
    </AppShell>
  );
}

/** Tab titles follow the brand: "Goals · Richies Blazers" for a white-labelled office, otherwise the platform name. */
export async function generateMetadata() {
  const viewer = await getViewer();
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("value").eq("key", "branding").maybeSingle();
  const platform = platformBrand(data?.value as PlatformBrandSetting | null);
  let name = platform.name;
  if (viewer?.profile.office_id) {
    const { data: o } = await supabase.from("offices").select(OFFICE_BRAND_COLUMNS).eq("id", viewer.profile.office_id).maybeSingle<OfficeBrandRow>();
    const b = officeBrand(o, platform);
    if (b?.whiteLabel) name = b.name;
  }
  return { title: { default: name, template: `%s · ${name}` } };
}
