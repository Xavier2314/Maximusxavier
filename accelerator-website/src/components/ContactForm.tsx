"use client";
import { useState } from "react";
import { CircleCheck, LoaderCircle } from "lucide-react";
import { CONTACT_TOPICS } from "@/lib/validation";

export function ContactForm({ defaultTopic }: { defaultTopic?: string }) {
  const [startedAt] = useState(() => Date.now());
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    setErrors({});
    const body = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, startedAt }) });
      const json = await res.json().catch(() => ({}));
      if (res.ok) { setState("sent"); return; }
      setErrors(json.errors ?? {});
      setMessage(json.message ?? "Something went wrong. Please try again.");
      setState("error");
    } catch {
      setMessage("We could not reach the server. Check your connection and try again.");
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div role="status" className="border border-sand bg-white p-10">
        <CircleCheck className="text-royal" size={40} aria-hidden="true" />
        <h3 className="mt-6 font-display text-3xl text-navy">Message received.</h3>
        <p className="mt-3 text-ink/75">Thank you for reaching out. A member of the team will reply by email.</p>
      </div>
    );
  }

  const err = (k: string) => errors[k] ? <p id={`${k}-err`} className="field-error">{errors[k]}</p> : null;
  const aria = (k: string) => ({ "aria-invalid": errors[k] ? true : undefined, "aria-describedby": errors[k] ? `${k}-err` : undefined });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div><label htmlFor="c-name" className="field-label">Full name *</label><input id="c-name" name="name" autoComplete="name" required className="field" {...aria("name")} />{err("name")}</div>
        <div><label htmlFor="c-email" className="field-label">Email *</label><input id="c-email" name="email" type="email" autoComplete="email" required className="field" {...aria("email")} />{err("email")}</div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div><label htmlFor="c-phone" className="field-label">Phone (optional)</label><input id="c-phone" name="phone" type="tel" autoComplete="tel" className="field" {...aria("phone")} />{err("phone")}</div>
        <div>
          <label htmlFor="c-topic" className="field-label">Topic *</label>
          <select id="c-topic" name="topic" defaultValue={defaultTopic ?? ""} required className="field" {...aria("topic")}>
            <option value="" disabled>Choose a topic</option>
            {CONTACT_TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {err("topic")}
        </div>
      </div>
      <div><label htmlFor="c-message" className="field-label">Message *</label><textarea id="c-message" name="message" rows={6} required className="field min-h-40" {...aria("message")} />{err("message")}</div>
      {/* Honeypot: hidden from people, tempting to bots */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label htmlFor="c-website">Website</label><input id="c-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {state === "error" && <p role="alert" className="border-l-4 border-red bg-red/5 px-4 py-3 text-sm text-ink">{message}</p>}
      <button type="submit" className="btn btn-navy w-full sm:w-auto" disabled={state === "sending"}>
        {state === "sending" ? <><LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> Sending</> : "Send message"}
      </button>
    </form>
  );
}
