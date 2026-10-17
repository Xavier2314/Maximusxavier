import { NotConfigured, PageHeader } from "@/components/ui/misc";
import { isAiConfigured } from "@/lib/ai";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Chat } from "./chat";

export const metadata = { title: "Maximus AI" };

export default async function AiPage({ searchParams }: { searchParams: Promise<{ c?: string; q?: string }> }) {
  const viewer = await requireViewer();
  const { c, q } = await searchParams;
  const supabase = await createClient();
  const [{ data: conversations }, { data: messages }, { data: memories }] = await Promise.all([
    supabase.from("ai_conversations").select("id, title, updated_at").eq("user_id", viewer.id).order("updated_at", { ascending: false }).limit(30),
    c ? supabase.from("ai_messages").select("id, role, content").eq("conversation_id", c).order("created_at") : Promise.resolve({ data: [] }),
    supabase.from("ai_memories").select("id, content").eq("user_id", viewer.id).order("created_at", { ascending: false }),
  ]);

  return (
    <>
      <PageHeader eyebrow="Grow" title="Maximus AI" description="Your personal growth coach for prospecting, sales, leadership and goals." />
      {!isAiConfigured() && <div className="mb-6"><NotConfigured feature="Maximus AI" envVars={["ANTHROPIC_API_KEY"]} /></div>}
      <Chat
        key={c ?? "new"}
        conversationId={c ?? null}
        initialQuestion={q}
        conversations={(conversations ?? []) as { id: string; title: string; updated_at: string }[]}
        initialMessages={(messages ?? []) as { id: string; role: "user" | "assistant"; content: string }[]}
        memoryEnabled={viewer.profile.ai_memory_enabled}
        memories={(memories ?? []) as { id: string; content: string }[]}
        firstName={viewer.profile.full_name.split(" ")[0]}
        enabled={isAiConfigured()}
      />
    </>
  );
}
