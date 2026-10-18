import { redirect } from "next/navigation";
import { ChatWidget } from "@/components/chat-widget";
import { AppShell } from "@/components/shell/app-shell";
import { visibleNav } from "@/components/shell/nav";
import { getViewer, primaryRole, ROLE_LABELS } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "../(auth)/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.profile.status !== "active") redirect("/suspended");

  const supabase = await createClient();
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true })
    .eq("user_id", viewer.id).is("read_at", null);

  return (
    <AppShell
      sections={visibleNav(viewer.permissions)}
      unread={count ?? 0}
      signOut={signOutAction}
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
