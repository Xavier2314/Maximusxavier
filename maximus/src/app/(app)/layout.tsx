import { redirect } from "next/navigation";
import { ChatWidget } from "@/components/chat-widget";
import { AppShell } from "@/components/shell/app-shell";
import { OFFICE_BOTTOM_NAV, visibleNav, visibleOfficeNav } from "@/components/shell/nav";
import { getViewer, primaryRole, ROLE_LABELS } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "../(auth)/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.profile.status !== "active") redirect("/suspended");

  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const [{ count }, { data: announcements }] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", viewer.id).is("read_at", null),
    supabase.from("announcements").select("id, title, kind").lte("published_at", nowIso)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order("pinned", { ascending: false }).order("published_at", { ascending: false }).limit(5),
  ]);

  const managesOffice = viewer.offices.length > 0;
  const officeSections = viewer.hasOfficeView ? visibleOfficeNav(viewer.permissions, managesOffice, viewer.roles) : [];
  const officeHome = managesOffice ? "/office" : viewer.isLeader ? "/office/team" : officeSections[0]?.items[0]?.href;
  const office = officeHome ? {
    home: officeHome,
    label: managesOffice ? "Office view" : viewer.isLeader ? "Team view" : "Approvals",
    officeName: viewer.offices.length === 1 ? viewer.offices[0].name : managesOffice ? `${viewer.offices.length} offices` : undefined,
    sections: officeSections,
    bottom: managesOffice ? OFFICE_BOTTOM_NAV : officeSections.flatMap((s) => s.items).slice(0, 4),
  } : null;

  return (
    <AppShell
      sections={visibleNav(viewer.permissions)}
      office={office}
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
