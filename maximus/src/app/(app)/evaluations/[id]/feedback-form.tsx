"use client";

import { useActionState } from "react";
import { FormMessage, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { addEvaluationFeedbackAction } from "../actions";

export function FeedbackForm({ evaluationId }: { evaluationId: string }) {
  const [state, action] = useActionState(addEvaluationFeedbackAction, null);
  return (
    <form action={action} className="space-y-3 border-t border-border pt-4">
      <FormMessage state={state} />
      <input type="hidden" name="evaluation_id" value={evaluationId} />
      <Textarea name="comment" rows={3} placeholder="Encourage, advise, or offer specific support…" aria-label="Feedback" />
      <SubmitButton className="w-full" pendingLabel="Sending…">Send feedback</SubmitButton>
    </form>
  );
}
