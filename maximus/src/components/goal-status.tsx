import { CircleCheck, Clock, FilePen, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/misc";
import type { GoalStatus as Status } from "@/lib/types";

export function GoalStatus({ status }: { status: Status }) {
  switch (status) {
    case "approved": return <Badge tone="green"><CircleCheck className="size-3" aria-hidden /> Approved</Badge>;
    case "submitted": return <Badge tone="blue"><Clock className="size-3" aria-hidden /> Awaiting review</Badge>;
    case "revision_requested": return <Badge tone="amber"><RotateCcw className="size-3" aria-hidden /> Revision requested</Badge>;
    default: return <Badge><FilePen className="size-3" aria-hidden /> Draft</Badge>;
  }
}
