"use client";

import { useState, useTransition } from "react";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { FormMessage, Select } from "@/components/ui/form";
import { setMemberOfficeAction, type TeamActionState } from "../actions";

/** Super Admins and Team Leaders (for their own team) put a member in the right office. */
export function OfficePlacement({ memberId, firstName, current, offices }: {
  memberId: string; firstName: string; current: string | null; offices: { id: string; name: string }[];
}) {
  const [office, setOffice] = useState(current ?? "");
  const [state, setState] = useState<TeamActionState>(null);
  const [pending, start] = useTransition();
  const currentName = offices.find((o) => o.id === current)?.name;
  return (
    <Card>
      <CardHeader title="Office" icon={<Building2 className="size-4" />}
        description={currentName ? `${firstName} is in ${currentName}` : `${firstName} has no office yet`} />
      <CardBody className="space-y-3">
        <FormMessage state={state} />
        <div className="flex gap-2">
          <Select value={office} onChange={(e) => setOffice(e.target.value)} aria-label="Office">
            <option value="" disabled>Choose an office</option>
            {offices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </Select>
          <Button size="md" disabled={pending || !office || office === current}
            onClick={() => start(async () => setState(await setMemberOfficeAction(memberId, office)))}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
        <p className="text-xs text-fg-subtle">They check in at this office and appear in its register.</p>
      </CardBody>
    </Card>
  );
}
