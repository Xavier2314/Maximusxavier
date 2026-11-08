"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import { deleteChecklistAction, remindChecklistAction } from "../actions";

/** Remind the people who haven't finished, or withdraw the checklist. */
export function ChecklistControls({ id, waiting }: { id: string; waiting: number }) {
  const router = useRouter();
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <FormMessage state={notice} />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={pending || !waiting} onClick={() => start(async () => setNotice(await remindChecklistAction(id)))}>
          <Bell className="size-4" aria-hidden />{waiting ? `Remind ${waiting} ${waiting === 1 ? "person" : "people"}` : "Everyone has finished"}
        </Button>
        <Button variant="ghost" disabled={pending} onClick={() => {
          if (!confirm("Withdraw this checklist from everyone's Home? Their progress is deleted too.")) return;
          start(async () => { const r = await deleteChecklistAction(id); setNotice(r); if (r.ok) router.push("/admin/checklists"); });
        }}>
          <Trash2 className="size-4" aria-hidden /> Withdraw
        </Button>
      </div>
    </div>
  );
}
