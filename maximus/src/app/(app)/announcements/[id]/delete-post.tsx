"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteAnnouncementAction } from "../actions";

export function DeletePost({ id, back }: { id: string; back: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button variant="ghost" size="sm" disabled={pending} className="text-danger hover:bg-danger-soft hover:text-danger"
      onClick={() => { if (confirm("Delete this post? This cannot be undone.")) start(async () => { const r = await deleteAnnouncementAction(id); if (r.ok) router.push(back); }); }}>
      <Trash2 className="size-4" aria-hidden /> Delete post
    </Button>
  );
}
