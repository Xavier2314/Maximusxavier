import { LockedIllustration } from "@/components/brand/illustrations";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";

export const metadata = { title: "No access" };

export default function ForbiddenPage() {
  return (
    <div className="card mx-auto mt-10 max-w-lg">
      <EmptyState illustration={<LockedIllustration className="mx-auto mb-4 w-44" />} title="You don't have access to this page"
        description="This area is limited to members with a specific role. If you think you should have access, ask an administrator."
        action={<LinkButton href="/dashboard">Back to dashboard</LinkButton>} />
    </div>
  );
}
