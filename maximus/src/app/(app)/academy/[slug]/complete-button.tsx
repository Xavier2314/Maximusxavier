"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArrowRight, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markLessonAction } from "../actions";

export function CompleteButton({ lessonId, done, nextHref }: { lessonId: string; done: boolean; nextHref: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <>
      <Button variant={done ? "outline" : "success"} disabled={pending}
        onClick={() => start(async () => { await markLessonAction(lessonId, !done); if (!done && nextHref) router.push(nextHref); else router.refresh(); })}>
        <CircleCheck className="size-4" aria-hidden /> {done ? "Completed — mark as not done" : "Mark as complete"}
      </Button>
      {nextHref && done && (
        <Button variant="ghost" onClick={() => router.push(nextHref)}>Next lesson <ArrowRight className="size-4" aria-hidden /></Button>
      )}
    </>
  );
}
