import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-xl border border-border bg-surface px-3.5 text-[15px] text-fg placeholder:text-fg-subtle " +
  "transition-colors focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 " +
  "disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-11", className)} {...props} />;
}

export function Textarea({ className, rows = 3, ...props }: ComponentProps<"textarea">) {
  return <textarea rows={rows} className={cn(control, "py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(control, "h-11 appearance-none bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-9", className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238792a8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
      {...props}>
      {children}
    </select>
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-sm font-medium text-fg", className)} {...props} />;
}

/** Label + control + hint/error, wired up for screen readers. */
export function Field({
  label, htmlFor, hint, error, optional, children, className,
}: {
  label: ReactNode; htmlFor: string; hint?: ReactNode; error?: string | string[]; optional?: boolean;
  children: ReactNode; className?: string;
}) {
  const message = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {optional && <span className="ml-1 font-normal text-fg-subtle">(optional)</span>}
      </Label>
      {children}
      {message ? (
        <p id={`${htmlFor}-error`} className="text-sm text-danger" role="alert">{message}</p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-fg-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

export function Checkbox({ className, ...props }: ComponentProps<"input">) {
  return (
    <input type="checkbox"
      className={cn("size-5 shrink-0 cursor-pointer rounded-md border-border accent-[var(--primary)]", className)}
      {...props} />
  );
}

/** Banner for form-level success/error messages. */
export function FormMessage({ state }: { state?: { ok?: boolean; message?: string } | null }) {
  if (!state?.message) return null;
  return (
    <div role={state.ok ? "status" : "alert"}
      className={cn("rounded-xl px-4 py-3 text-sm",
        state.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}>
      {state.message}
    </div>
  );
}
