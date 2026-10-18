"use client";

import { useActionState, useState } from "react";
import { MicButton } from "@/components/voice";
import { Field, FormMessage, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { MOODS } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { saveJournalAction } from "../actions";
import { safeAction } from "@/lib/report-error";
const safe_saveJournalAction = safeAction(saveJournalAction, { ok: false, message: "Couldn't save. The app may have just updated. Refresh the page and try again." });

export type Entry = {
  id: string; kind: "journal" | "reflection"; entry_date: string; mood: number | null;
  wins: string | null; challenges: string | null; lessons: string | null; next_focus: string | null; body: string | null;
};


function VoiceArea({ name, label, defaultValue, rows = 3, placeholder }: { name: string; label: string; defaultValue: string; rows?: number; placeholder?: string }) {
  const [v, setV] = useState(defaultValue);
  return (
    <Field label={label} htmlFor={name}>
      <Textarea id={name} name={name} value={v} onChange={(e) => setV(e.target.value)} rows={rows} maxLength={name === "body" ? 6000 : 2000} placeholder={placeholder} />
      <MicButton onText={(t) => setV((cur) => (cur ? `${cur} ${t}` : t))} />
    </Field>
  );
}

export function JournalForm({ kind, entryDate, entry }: { kind: "journal" | "reflection"; entryDate: string; entry: Entry | null }) {
  const [state, action] = useActionState(safe_saveJournalAction, null);
  const [mood, setMood] = useState<number | null>(entry?.mood ?? null);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="entry_date" value={entryDate} />
      <input type="hidden" name="mood" value={mood ?? ""} />
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Mood</legend>
        <div className="flex gap-2">
          {MOODS.map((m, i) => (
            <button key={m.label} type="button" onClick={() => setMood(i + 1)} aria-pressed={mood === i + 1} title={m.label}
              className={cn("flex flex-col items-center rounded-xl border px-2.5 py-1.5 text-xs", mood === i + 1 ? "border-primary bg-primary-soft" : "border-border")}>
              <span className="text-xl" aria-hidden>{m.emoji}</span>{m.label}
            </button>
          ))}
        </div>
      </fieldset>
      {kind === "reflection" ? (
        <>
          <VoiceArea name="wins" label="Wins this week" defaultValue={entry?.wins ?? ""} placeholder="What went well? Sales, sign-ups, habits kept" />
          <VoiceArea name="challenges" label="Challenges" defaultValue={entry?.challenges ?? ""} placeholder="What got in the way?" />
          <VoiceArea name="lessons" label="Lessons learned" defaultValue={entry?.lessons ?? ""} />
          <VoiceArea name="next_focus" label="Focus for next week" defaultValue={entry?.next_focus ?? ""} placeholder="The 1–3 things that matter most" />
        </>
      ) : (
        <VoiceArea name="body" label="Today" defaultValue={entry?.body ?? ""} rows={8} placeholder="Write or speak freely…" />
      )}
      <SubmitButton pendingLabel="Saving…">{entry ? "Update entry" : "Save entry"}</SubmitButton>
    </form>
  );
}
