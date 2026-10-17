"use client";

import { useActionState } from "react";
import { Checkbox, Field, FormMessage, Input, Select } from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";
import { changePasswordAction, savePreferencesAction, savePrivacyAction } from "./actions";

export function PreferencesForm({ prefs }: { prefs: { push_enabled: boolean; muted_types: string[]; quiet_start: string | null; quiet_end: string | null } | null }) {
  const [state, action] = useActionState(savePreferencesAction, null);
  const muted = new Set(prefs?.muted_types ?? []);
  const groups = [...new Set(NOTIFICATION_TYPES.map((t) => t.group))];
  return (
    <form action={action} className="space-y-6">
      <FormMessage state={state} />
      <label className="flex items-center gap-3 text-sm">
        <Checkbox name="push_enabled" defaultChecked={prefs?.push_enabled ?? true} />
        Send push notifications to my devices
      </label>
      <div className="grid gap-6 sm:grid-cols-2">
        {groups.map((g) => (
          <fieldset key={g}>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">{g}</legend>
            <div className="space-y-2">
              {NOTIFICATION_TYPES.filter((t) => t.group === g).map((t) => (
                <label key={t.key} className="flex items-center gap-3 text-sm">
                  <Checkbox name="types" value={t.key} defaultChecked={!muted.has(t.key)} className="size-4" />
                  {t.label}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <div className="grid max-w-md grid-cols-2 gap-4">
        <Field label="Quiet hours from" htmlFor="quiet_start" hint="No push alerts during quiet hours">
          <Input id="quiet_start" name="quiet_start" type="time" defaultValue={prefs?.quiet_start?.slice(0, 5) ?? "22:00"} />
        </Field>
        <Field label="Until" htmlFor="quiet_end">
          <Input id="quiet_end" name="quiet_end" type="time" defaultValue={prefs?.quiet_end?.slice(0, 5) ?? "07:00"} />
        </Field>
      </div>
      <SubmitButton pendingLabel="Saving…">Save preferences</SubmitButton>
    </form>
  );
}

export function PrivacyForm({ birthday, aiMemory }: { birthday: string; aiMemory: boolean }) {
  const [state, action] = useActionState(savePrivacyAction, null);
  return (
    <form action={action} className="space-y-5">
      <FormMessage state={state} />
      <Field label="Birthday visibility" htmlFor="birthday_visibility">
        <Select id="birthday_visibility" name="birthday_visibility" defaultValue={birthday}>
          <option value="private">Private — don&apos;t celebrate publicly</option>
          <option value="day_month">Show day and month only</option>
          <option value="full">Show full date including year</option>
        </Select>
      </Field>
      <label className="flex items-start gap-3 text-sm">
        <Checkbox name="ai_memory_enabled" defaultChecked={aiMemory} className="mt-0.5" />
        <span>
          <span className="font-medium">Let Maximus AI remember things about me</span>
          <span className="block text-fg-muted">Helps the assistant personalise advice. Turning this off immediately deletes everything it remembered.</span>
        </span>
      </label>
      <SubmitButton pendingLabel="Saving…">Save privacy settings</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, null);
  return (
    <form action={action} className="max-w-md space-y-4">
      <FormMessage state={state} />
      <Field label="New password" htmlFor="new-password" error={state?.errors?.password}>
        <PasswordInput id="new-password" name="password" autoComplete="new-password" />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm-new-password" error={state?.errors?.confirm_password}>
        <PasswordInput id="confirm-new-password" name="confirm_password" autoComplete="new-password" />
      </Field>
      <SubmitButton pendingLabel="Updating…">Update password</SubmitButton>
    </form>
  );
}
