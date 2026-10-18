"use client";

import { useActionState } from "react";
import { Camera, LoaderCircle } from "lucide-react";
import { PhotoPicker } from "@/components/photo-picker";
import { Avatar } from "@/components/ui/misc";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Profile } from "@/lib/types";
import { RANKS } from "@/lib/ranks";
import { saveBusinessAction, updateProfileAction, uploadAvatarAction } from "./actions";

export function AvatarUploader({ name, src }: { name: string; src: string | null }) {
  return (
    <PhotoPicker action={uploadAvatarAction} fileField="avatar" label="Change profile picture" messageClassName="text-white/80">
      {(busy) => (
        <span className="group relative block">
          <Avatar name={name} src={src} size={104} className={busy ? "opacity-60 ring-4 ring-white/20" : "ring-4 ring-white/20"} />
          <span className="absolute bottom-1 right-1 grid size-9 place-items-center rounded-full bg-brand-lime text-brand-navy ring-4 ring-brand-navy transition-transform group-hover:scale-105">
            {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Camera className="size-4" aria-hidden />}
          </span>
        </span>
      )}
    </PhotoPicker>
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

export function BusinessForm({ rank, newlifeId }: { rank: string | null; newlifeId: string | null }) {
  const [state, action] = useActionState(saveBusinessAction, null);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <Field label="My business status" htmlFor="business_rank">
        <Select id="business_rank" name="business_rank" defaultValue={rank ?? ""}>
          <option value="">Choose your status</option>
          {RANKS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </Select>
      </Field>
      <Field label="NeoLife ID number" htmlFor="newlife_id" optional
        hint="Visible to you, your sponsor line and admins. Your downline can't see it.">
        <Input id="newlife_id" name="newlife_id" defaultValue={newlifeId ?? ""} maxLength={40} autoComplete="off" />
      </Field>
      <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
    </form>
  );
}
