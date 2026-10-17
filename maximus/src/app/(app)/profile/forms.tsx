"use client";

import { useActionState, useRef } from "react";
import { Camera } from "lucide-react";
import { Avatar } from "@/components/ui/misc";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Profile } from "@/lib/types";
import { updateProfileAction, uploadAvatarAction } from "./actions";

export function AvatarUploader({ name, src }: { name: string; src: string | null }) {
  const [state, action] = useActionState(uploadAvatarAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={action} className="flex flex-col items-center gap-2">
      <label className="group relative cursor-pointer" aria-label="Change profile picture">
        <Avatar name={name} src={src} size={104} className="ring-4 ring-white/20" />
        <span className="absolute bottom-1 right-1 grid size-9 place-items-center rounded-full bg-brand-lime text-brand-navy ring-4 ring-brand-navy transition-transform group-hover:scale-105">
          <Camera className="size-4" aria-hidden />
        </span>
        <input type="file" name="avatar" accept="image/jpeg,image/png,image/webp" className="sr-only"
          onChange={() => formRef.current?.requestSubmit()} />
      </label>
      {state?.message && <p className={`text-xs ${state.ok ? "text-brand-lime" : "text-red-200"}`} role="status">{state.message}</p>}
    </form>
  );
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState(updateProfileAction, null);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field label="Full name" htmlFor="full_name" error={e.full_name}>
        <Input id="full_name" name="full_name" defaultValue={profile.full_name} autoComplete="name" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" htmlFor="phone" error={e.phone}><Input id="phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} /></Field>
        <Field label="WhatsApp" htmlFor="whatsapp" error={e.whatsapp}><Input id="whatsapp" name="whatsapp" type="tel" defaultValue={profile.whatsapp ?? ""} /></Field>
        <Field label="Date of birth" htmlFor="date_of_birth"><Input id="date_of_birth" name="date_of_birth" type="date" defaultValue={profile.date_of_birth ?? ""} /></Field>
        <Field label="Gender" htmlFor="gender" optional>
          <Select id="gender" name="gender" defaultValue={profile.gender ?? ""}>
            <option value="">Prefer not to say</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
          </Select>
        </Field>
      </div>
      <Field label="About me" htmlFor="bio" optional hint="Shown to your sponsor and team leaders.">
        <Textarea id="bio" name="bio" defaultValue={profile.bio ?? ""} maxLength={500} />
      </Field>
      <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
    </form>
  );
}
