import { redirect } from "next/navigation";
import { ChatWidget } from "@/components/chat-widget";
import { AppShell } from "@/components/shell/app-shell";
import { OFFICE_BOTTOM_NAV, visibleNav, visibleOfficeNav, visibleTeamNav } from "@/components/shell/nav";
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
  const [{ count }, { data: announcements }, { data: brandSetting }, { data: brandOffices }] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", viewer.id).is("read_at", null),
    supabase.from("announcements").select("id, title, kind").lte("published_at", nowIso)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order("pinned", { ascending: false }).order("published_at", { ascending: false }).limit(5),
    supabase.from("app_settings").select("value").eq("key", "branding").maybeSingle(),
    officeIds.length ? supabase.from("offices").select(OFFICE_BRAND_COLUMNS).in("id", officeIds).returns<OfficeBrandRow[]>()
      : Promise.resolve({ data: [] as OfficeBrandRow[] }),
  ]);
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
  // Team view: anyone leading a downline, whether or not they're tied to an office.
  const teamSections = viewer.isLeader ? visibleTeamNav(viewer.permissions, viewer.roles) : [];
  const team = teamSections.length > 0 ? {
    home: "/office/team",
    label: "Team view",
    sections: teamSections,
    bottom: teamSections.flatMap((s) => s.items).slice(0, 4),
  } : null;

  // Office view: the office itself (full dashboard, roster, and — for managers only —
  // settings/branding/QR). Team leaders assigned to an office get the read-only subset;
  // office managers get everything. An earnings-manager with neither falls back to Approvals.
  const canOfficeView = managesOffice || (viewer.isLeader && Boolean(viewer.profile.office_id));
  const officeSections = canOfficeView ? visibleOfficeNav(viewer.permissions, viewer.roles) : [];
  const office = canOfficeView && officeSections.length > 0 ? {
    home: "/office",
    label: "Office view",
    officeName: viewer.offices.length === 1 ? viewer.offices[0].name : viewer.offices.length > 1 ? `${viewer.offices.length} offices` : undefined,
    sections: officeSections,
    bottom: managesOffice ? OFFICE_BOTTOM_NAV : officeSections.flatMap((s) => s.items).slice(0, 4),
  } : !team && viewer.hasOfficeView ? {
    home: "/admin/approvals",
    label: "Approvals",
    sections: [{ title: "Office", items: [{ href: "/admin/approvals", label: "Approvals", icon: "check" }] }],
    bottom: [],
  } : null;

  return (
    <AppShell
      sections={visibleNav(viewer.permissions)}
      team={team}
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
