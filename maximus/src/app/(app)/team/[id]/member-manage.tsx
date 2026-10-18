"use client";

import { useActionState, useMemo, useState } from "react";
import { Camera, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Checkbox, Field, FormMessage, Input } from "@/components/ui/form";
import { Avatar } from "@/components/ui/misc";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";
import { removeFromTeamAction, uploadMemberPhotoAction } from "../actions";

export type TeamPerson = { id: string; name: string; avatar: string | null; depth: number; sponsorId: string | null };

/** Upline tools on a member's page: add their photo, or remove them if they've left. */
export function MemberManage({ member, team }: { member: { id: string; name: string; avatar: string | null }; team: TeamPerson[] }) {
  const [photoState, photoAction] = useActionState(uploadMemberPhotoAction, null);
  const [removeState, removeAction] = useActionState(removeFromTeamAction, null);
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  const first = member.name.split(" ")[0];

  const moving = useMemo(() => {
    const gone = new Set([member.id, ...leaving]);
    return team.filter((p) => !gone.has(p.id) && p.sponsorId && gone.has(p.sponsorId));
  }, [team, leaving, member.id]);
  const toggle = (id: string) => setLeaving((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <Card>
      <CardHeader title="Manage" icon={<UserMinus className="size-4" />} description={`You're ${first}'s upline`} />
      <CardBody className="space-y-6">
        <form action={photoAction} className="space-y-3">
          <FormMessage state={photoState} />
          <input type="hidden" name="member_id" value={member.id} />
          <div className="flex items-center gap-3">
            <Avatar name={member.name} src={member.avatar} size={48} />
            <label className="flex-1 text-sm">
              <span className="mb-1 flex items-center gap-1.5 font-medium"><Camera className="size-4 text-primary" aria-hidden />{member.avatar ? "Change photo" : "Add a photo"}</span>
              <Input type="file" name="photo" accept="image/jpeg,image/png,image/webp" className="h-auto py-2 text-xs" required />
            </label>
          </div>
          <SubmitButton variant="secondary" size="sm" pendingLabel="Uploading…">Save photo</SubmitButton>
        </form>

        <div className="border-t border-border pt-5">
          {!open ? (
            <Button variant="outline" size="sm" className="text-danger" onClick={() => setOpen(true)}>
              <UserMinus className="size-4" aria-hidden />{first} left the team
            </Button>
          ) : (
            <form action={removeAction} className="space-y-4">
              <FormMessage state={removeState} />
              <input type="hidden" name="member_id" value={member.id} />
              <p className="text-sm font-semibold">Remove {member.name}</p>
              {team.length > 0 ? (
                <fieldset>
                  <legend className="mb-2 text-sm text-fg-muted">Did anyone in {first}&apos;s team leave too? Tick only those who left.</legend>
                  <ul className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
                    {team.map((p) => (
                      <li key={p.id}>
                        <label className={cn("flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-surface-muted", leaving.has(p.id) && "bg-danger-soft/60")}
                          style={{ paddingLeft: `${8 + (p.depth - 1) * 16}px` }}>
                          <Checkbox name="also_leaving" value={p.id} checked={leaving.has(p.id)} onChange={() => toggle(p.id)} className="size-4" />
                          <Avatar name={p.name} src={p.avatar} size={28} />
                          <span className="flex-1 truncate text-sm">{p.name}</span>
                          <span className="text-xs text-fg-subtle">{leaving.has(p.id) ? "Left" : "Staying"}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </fieldset>
              ) : <p className="text-sm text-fg-muted">{first} has no one in their team.</p>}

              <div className="rounded-xl bg-surface-muted p-3 text-sm">
                <p><b>{1 + leaving.size}</b> {leaving.size === 0 ? "person" : "people"} will be removed (their records are kept; an admin can restore them).</p>
                {moving.length > 0 && <p className="mt-1"><b>{moving.length}</b> will move directly under you: {moving.map((p) => p.name).join(", ")}.</p>}
              </div>

              <Field label="Reason (optional)" htmlFor="reason">
                <Input id="reason" name="reason" maxLength={300} placeholder="e.g. Relocated, stopped coming" />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox name="confirm" className="size-4" required /> I confirm {first} has left the team
              </label>
              <div className="flex gap-2">
                <SubmitButton variant="danger" size="sm" pendingLabel="Removing…">Remove</SubmitButton>
                <Button variant="ghost" size="sm" onClick={() => { setOpen(false); setLeaving(new Set()); }}>Cancel</Button>
              </div>
            </form>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
