"use client";

import { useActionState, useState } from "react";
import { Sparkles } from "lucide-react";
import { Checkbox, Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { OBJECTIVES, type Objective } from "@/lib/ad-plan";
import { createAdPlanAction } from "../actions";

export function NewPlanForm({ funnelId, defaultOffer, defaultHealth }: { funnelId: string; defaultOffer: string; defaultHealth: boolean }) {
  const [state, action] = useActionState(createAdPlanAction, null);
  const [objective, setObjective] = useState<Objective>("whatsapp");
  const [health, setHealth] = useState(defaultHealth);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="funnelId" value={funnelId} />
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">What should the ads get you?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {OBJECTIVES.map((o) => (
            <label key={o.key} className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm ${objective === o.key ? "border-primary bg-primary-soft" : "border-border"}`}>
              <input type="radio" name="objective" value={o.key} checked={objective === o.key} onChange={() => setObjective(o.key)} className="mt-1" />
              <span><b>{o.label}</b><br /><span className="text-fg-muted">{o.hint}</span></span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Daily budget (₦)" htmlFor="ad-budget" hint="Before tax. Start small and test for a few days. ₦3,000 to ₦5,000 a day is a common test.">
          <Input id="ad-budget" name="dailyBudgetNgn" inputMode="numeric" defaultValue="5000" required />
        </Field>
        <Field label="Where do you deliver?" htmlFor="ad-areas" hint="Show ads only where you can really deliver.">
          <Input id="ad-areas" name="areas" placeholder="e.g. Lagos and Abuja" maxLength={200} required />
        </Field>
      </div>
      <Field label="Offer (optional)" htmlFor="ad-offer" hint="A real offer only: a discount, a free delivery, a bonus. Leave empty if none.">
        <Textarea id="ad-offer" name="offer" rows={2} maxLength={300} defaultValue={defaultOffer} />
      </Field>
      <div className="space-y-2 rounded-xl border border-border p-3">
        <label className="flex items-center gap-2 text-sm font-medium"><Checkbox name="healthProduct" checked={health} onChange={(e) => setHealth(e.target.checked)} />This is a food, supplement, herbal or health product</label>
        {health && (
          <Field label="NAFDAC registration number" htmlFor="ad-reg" hint="Required. Facebook and NAFDAC both look for it. Drugs and herbal medicines may also need advert approval from NAFDAC before they run.">
            <Input id="ad-reg" name="registrationNumber" maxLength={40} placeholder="e.g. A7-1234" />
          </Field>
        )}
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="AI is planning your ads… (up to a minute)"><Sparkles className="size-4" aria-hidden />Plan my ads with AI</SubmitButton>
    </form>
  );
}
