"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import { testAiAction } from "./actions";

export function AiTest() {
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => start(async () => setResult(await testAiAction()))}>
        {pending ? "Testing…" : "Test Maximus AI"}
      </Button>
      <FormMessage state={result} />
    </div>
  );
}
