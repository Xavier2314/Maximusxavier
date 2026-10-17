"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyReferral({ code, memberId }: { code: string; memberId: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  // Built on click (not during render) so server and client markup match.
  const inviteLink = () => `${window.location.origin}/register?ref=${encodeURIComponent(code)}`;

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch { /* clipboard blocked */ }
  }

  async function share() {
    if (navigator.share) {
      await navigator.share({ title: "Join me on Maximus", text: `Register on Maximus with my referral code ${code}`, url: inviteLink() }).catch(() => {});
    } else {
      await copy(inviteLink(), "link");
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex flex-1 items-center gap-3 rounded-2xl bg-surface-muted p-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-fg-subtle">Referral code</p>
          <p className="font-mono text-lg font-bold tracking-wider">{code}</p>
          <p className="text-xs text-fg-subtle">or your Member ID {memberId}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => copy(code, "code")} aria-label="Copy referral code">
          {copied === "code" ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
        </Button>
      </div>
      <Button onClick={share} size="lg">
        {copied === "link" ? <Check className="size-4" aria-hidden /> : <Share2 className="size-4" aria-hidden />}
        {copied === "link" ? "Link copied" : "Share invite link"}
      </Button>
    </div>
  );
}
