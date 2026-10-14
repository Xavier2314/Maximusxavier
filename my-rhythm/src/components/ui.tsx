"use client";
import clsx from "clsx";
import { LoaderCircle, X } from "lucide-react";
import { forwardRef, useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { createPortal } from "react-dom";

export { clsx };

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft" | "sage";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-navy text-white dark:bg-lavender dark:text-[#0b1222] hover:opacity-90 shadow-sm",
  secondary: "bg-surface text-ink border border-line hover:bg-surface-2",
  ghost: "text-ink-2 hover:bg-surface-2",
  danger: "bg-danger text-white hover:opacity-90",
  soft: "bg-lavender-soft text-ink hover:brightness-95",
  sage: "bg-sage text-white hover:opacity-90",
};

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg" | "icon"; loading?: boolean }>(
  function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...rest }, ref) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none",
          size === "sm" && "h-9 px-3 text-sm",
          size === "md" && "h-11 px-4 text-[15px]",
          size === "lg" && "h-12 px-5 text-base",
          size === "icon" && "h-10 w-10",
          VARIANTS[variant],
          className,
        )}
        {...rest}
      >
        {loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
        {children}
      </button>
    );
  },
);

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("card", className)} {...rest}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">{children}</h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-5 flex items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-[28px] leading-tight font-semibold tracking-tight md:text-[34px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Badge({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", !color && "bg-surface-2 text-ink-2", className)}
      style={color ? { backgroundColor: `${color}22`, color } : undefined}
    >
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={clsx("h-5 w-5 animate-spin text-muted", className)} aria-label="Loading" />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-xl bg-surface-2", className)} />;
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      {icon && <div className="mb-1 text-lavender">{icon}</div>}
      <p className="font-medium">{title}</p>
      {body && <p className="max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-danger/30 bg-danger-soft p-4 text-sm">
      <p className="font-medium text-danger">Something went wrong</p>
      <p className="mt-1 text-ink-2">{error instanceof Error ? error.message : String(error)}</p>
      {retry && (
        <Button size="sm" variant="secondary" className="mt-3" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={clsx("block", className)}>
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full min-w-0 rounded-xl border border-line bg-surface px-3 py-2.5 text-[16px] text-ink placeholder:text-muted/70 focus:border-lavender focus:outline-none focus:ring-2 focus:ring-[var(--ring)]";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={clsx(inputCls, "h-11", className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={clsx(inputCls, "min-h-[96px]", className)} {...rest} />;
});

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx(inputCls, "h-11 appearance-none pr-8", className)} {...rest}>
      {children}
    </select>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx("relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50", checked ? "bg-sage" : "bg-line")}
    >
      <span className={clsx("absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; className?: string }) {
  return (
    <div className={clsx("inline-flex rounded-xl bg-surface-2 p-1", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx("rounded-lg px-3 py-1.5 text-sm font-medium transition", value === o.value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Bottom sheet on phones, centred dialog on larger screens. */
export function Sheet({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[#0b1222]/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        className={clsx(
          "animate-sheet-up relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-line bg-surface shadow-2xl outline-none md:max-h-[86vh] md:rounded-3xl",
          wide ? "md:max-w-3xl" : "md:max-w-lg",
        )}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-line md:hidden" />
        <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-2 md:pt-5">
          <div className="min-w-0 text-lg font-semibold">{title}</div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-muted hover:bg-surface-2">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <div className="pb-safe border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open, title, body, confirmLabel = "Confirm", danger, onConfirm, onClose, loading,
}: { open: boolean; title: string; body?: ReactNode; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onClose: () => void; loading?: boolean }) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </div>
      }
    >
      <div className="text-[15px] text-ink-2">{body}</div>
    </Sheet>
  );
}

export function ProgressRing({ value, size = 64, stroke = 7, color = "var(--sage)", children }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--line)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

/** Simple accessible bar chart (no chart library). */
export function Bars({ data, max, height = 120, color = "var(--lavender)", format }: { data: { label: string; value: number; color?: string }[]; max?: number; height?: number; color?: string; format?: (v: number) => string }) {
  const m = max ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2" style={{ height }} role="img" aria-label={data.map((d) => `${d.label}: ${format ? format(d.value) : d.value}`).join(", ")}>
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[10px] text-muted tabular-nums">{d.value ? (format ? format(d.value) : d.value) : ""}</span>
          <div className="w-full rounded-t-lg rounded-b-sm transition-all" style={{ height: `${(d.value / m) * (height - 34)}px`, minHeight: d.value ? 4 : 2, backgroundColor: d.value ? d.color ?? color : "var(--line)" }} />
          <span className="text-[11px] text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
