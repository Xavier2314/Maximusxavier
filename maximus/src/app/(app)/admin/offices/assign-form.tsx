"use client";

import { useActionState, useTransition } from "react";
import { X } from "lucide-react";
import { Checkbox, FormMessage, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { assignMemberAction, removeMemberAction } from "./actions";

export function AssignForm({ officeId }: { officeId: string }) {
  const [state, action] = useActionState(assignMemberAction, null);
  return (
    <form action={action} className="space-y-2">
      <FormMessage state={state} />
      <input type="hidden" name="office_id" value={officeId} />
      <div className="flex gap-2">
        <Input name="member_code" placeholder="Member ID e.g. MX-001024" aria-label="Member ID to assign" autoCapitalize="characters" />
        <SubmitButton variant="secondary" pendingLabel="…">Assign</SubmitButton>
      </div>
      <label className="flex items-center gap-2 text-xs text-fg-muted">
        <Checkbox name="is_manager" className="size-4" /> Make office manager
      </label>
    </form>
  );
}

export function RemoveMember({ officeId, userId, name }: { officeId: string; userId: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} aria-label={`Remove ${name} from office`}
      onClick={() => { if (confirm(`Remove ${name} from this office?`)) start(async () => { await removeMemberAction(officeId, userId); }); }}
      className="grid size-7 place-items-center rounded-lg text-fg-subtle hover:bg-danger-soft hover:text-danger">
      <X className="size-3.5" aria-hidden />
    </button>
  );
}
