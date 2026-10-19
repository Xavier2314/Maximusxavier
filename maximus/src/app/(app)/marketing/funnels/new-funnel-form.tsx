"use client";

import { useActionState, useState } from "react";
import { Sparkles } from "lucide-react";
import { Checkbox, Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { ImageField } from "@/components/funnels/image-upload";
import { createFunnelAction } from "./actions";

export function NewFunnelForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(createFunnelAction, null);
  const [mode, setMode] = useState<"ai" | "blank">("ai");
  const [imageUrl, setImageUrl] = useState("");
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="imageUrl" value={imageUrl} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Product name" htmlFor="name"><Input id="name" name="name" required maxLength={120} placeholder="e.g. Daily Wellness Pack" /></Field>
        <Field label="Price" htmlFor="price" optional hint="Type it the way customers should see it, e.g. ₦25,000"><Input id="price" name="price" maxLength={40} placeholder="₦25,000" /></Field>
      </div>
      <Field label="What is it?" htmlFor="description" hint="Describe the product in your own words: what it is, what is in it, how it is used.">
        <Textarea id="description" name="description" rows={3} maxLength={2000} />
      </Field>
      <Field label="Benefits and selling points" htmlFor="benefits" hint="One per line. The AI only uses what you write here, so be specific and truthful.">
        <Textarea id="benefits" name="benefits" rows={4} maxLength={2000} placeholder={"Easy to use every day\nMade for busy people\n30-day supply per pack"} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Who is it for?" htmlFor="audience" optional><Input id="audience" name="audience" maxLength={300} placeholder="e.g. Busy parents and professionals" /></Field>
        <Field label="Offer or bonus" htmlFor="offer" optional><Input id="offer" name="offer" maxLength={400} placeholder="e.g. Free delivery in Lagos this week" /></Field>
      </div>
      <Field label="Product photo" htmlFor="imageUrl-field" optional><ImageField id="imageUrl-field" userId={userId} value={imageUrl} onChange={setImageUrl} /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Goal" htmlFor="goal"><Select id="goal" name="goal" defaultValue="sell"><option value="sell">Sell the product (orders)</option><option value="leads">Collect leads</option></Select></Field>
        <Field label="Tone" htmlFor="tone"><Select id="tone" name="tone" defaultValue="friendly and confident">
          <option>friendly and confident</option><option>bold and energetic</option><option>premium and elegant</option><option>calm and caring</option><option>fun and playful</option>
        </Select></Field>
        <Field label="Build it" htmlFor="mode"><Select id="mode" name="mode" value={mode} onChange={(e) => setMode(e.target.value as "ai" | "blank")}>
          <option value="ai">Design it with AI</option><option value="blank">Start from a template</option>
        </Select></Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><Checkbox name="whatsapp" defaultChecked />Offer a &quot;Message us on WhatsApp&quot; button after an order</label>
      <SubmitButton className="h-12 w-full text-base font-semibold" pendingLabel={mode === "ai" ? "AI is designing your funnel… (up to a minute)" : "Creating…"}>
        <Sparkles className="size-5" aria-hidden />{mode === "ai" ? "Design my funnel with AI" : "Create funnel"}
      </SubmitButton>
    </form>
  );
}
