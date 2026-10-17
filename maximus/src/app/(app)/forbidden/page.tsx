import { Lock } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";

export const metadata = { title: "No access" };

export default function ForbiddenPage() {
  return (
    <div className="card mx-auto mt-10 max-w-lg">
      <EmptyState icon={<Lock className="size-6" />} title="You don't have access to this page"
        description="This area is limited to members with a specific role. If you think you should have access, ask an administrator."
        action={<LinkButton href="/dashboard">Back to dashboard</LinkButton>} />
    </div>
  );
}
