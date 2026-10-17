"use client";

import { useActionState } from "react";
import { Field, FormMessage, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { reviewGoalAction } from "../actions";

export function ReviewPanel({ goalId, canDecide }: { goalId: string; canDecide: boolean }) {
  const [state, action] = useActionState(reviewGoalAction, null);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="goal_id" value={goalId} />
      <Field label="Comment" htmlFor="comment" error={state?.errors?.comment}>
        <Textarea id="comment" name="comment" rows={3} placeholder="What's strong about this plan? What should change?" />
      </Field>
      <Field label="Recommended action steps" htmlFor="action_steps" optional>
        <Textarea id="action_steps" name="action_steps" rows={3} placeholder={"1. Book 3 presentations this week\n2. Follow up with last month's prospects"} />
      </Field>
      <div className="grid gap-2">
        {canDecide && (
          <>
            <SubmitButton variant="success" name="action" value="approve" pendingLabel="Saving…">Approve goals</SubmitButton>
            <SubmitButton variant="outline" name="action" value="request_revision" pendingLabel="Saving…">Request revision</SubmitButton>
          </>
        )}
        <SubmitButton variant={canDecide ? "ghost" : "primary"} name="action" value="comment" pendingLabel="Sending…">Send comment only</SubmitButton>
      </div>
    </form>
  );
}
