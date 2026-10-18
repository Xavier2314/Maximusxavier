import { notFound } from "next/navigation";
import { PhoneOff } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, NotConfigured } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { ensureRoom, isDailyConfigured, meetingToken } from "@/lib/daily";
import { createClient } from "@/lib/supabase/server";
import { CallScreen } from "./call-screen";

export const metadata = { title: "Call" };

type Call = { id: string; kind: "direct" | "group"; title: string | null; room_name: string; video: boolean; created_by: string; status: string; created_at: string; conversation_id: string | null };

export default async function CallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data: call } = await supabase.from("calls").select("id, kind, title, room_name, video, created_by, status, created_at, conversation_id")
    .eq("id", id).maybeSingle<Call>();
  if (!call) notFound();

  const back = call.conversation_id ? `/messages?c=${call.conversation_id}` : "/calls";
  const tooOld = Date.now() - new Date(call.created_at).getTime() > 3 * 3600 * 1000;
  if (call.status === "ended" || tooOld) {
    return (
      <Card className="mx-auto max-w-md">
        <EmptyState icon={<PhoneOff className="size-6" />} title="This call has ended"
          action={<LinkButton href={back}>Go back</LinkButton>} />
      </Card>
    );
  }
  if (!isDailyConfigured()) {
    return <NotConfigured feature="Calls" envVars={["DAILY_API_KEY"]}>Create a free account at daily.co, copy its API key, and add it in Vercel.</NotConfigured>;
  }

  let url: string; let token: string;
  try {
    if (call.created_by !== viewer.id) await supabase.rpc("join_call", { p_call: call.id });
    url = await ensureRoom(call.room_name, call.video);
    token = await meetingToken(call.room_name, viewer.profile.full_name, call.created_by === viewer.id);
  } catch (e) {
    console.error("Call setup failed", e);
    return (
      <Card className="mx-auto max-w-md">
        <EmptyState icon={<PhoneOff className="size-6" />} title="Couldn't connect the call" description="Please try again in a moment."
          action={<LinkButton href={back}>Go back</LinkButton>} />
      </Card>
    );
  }

  let title = call.title ?? "Call";
  if (call.kind === "direct") {
    const { data: other } = await supabase.from("conversation_members").select("profiles(full_name)")
      .eq("conversation_id", call.conversation_id!).neq("user_id", viewer.id).maybeSingle();
    title = (other as unknown as { profiles: { full_name: string } | null } | null)?.profiles?.full_name ?? "Call";
  }
  return <CallScreen callId={call.id} src={`${url}?t=${encodeURIComponent(token)}`} title={title} video={call.video}
    back={back} canEndForAll={call.kind === "direct" || call.created_by === viewer.id} />;
}
