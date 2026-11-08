import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChecklistComposer } from "./composer";

export const metadata = { title: "Push a checklist" };

export default async function NewChecklistPage() {
  const viewer = await requireViewer();
  if (!viewer.roles.includes("super_admin")) redirect("/forbidden");
  const supabase = await createClient();
  const { data: members } = await supabase.from("profiles").select("id, full_name, avatar_url, member_id")
    .eq("status", "active").order("full_name").limit(2000);
  return (
    <>
      <Link href="/admin/checklists" className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden /> Checklists</Link>
      <PageHeader title="Push a checklist" />
      <ChecklistComposer members={members ?? []} />
    </>
  );
}
