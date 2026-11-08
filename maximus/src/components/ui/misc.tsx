import { EmptyIllustration, type EmptyArt } from "@/components/brand/illustrations";
import Image from "next/image";
import type { ReactNode } from "react";
import { cn, initials } from "@/lib/utils";

const tones = {
  neutral: "bg-surface-muted text-fg-muted",
  blue: "bg-primary-soft text-primary",
  green: "bg-success-soft text-success",
  amber: "bg-warning-soft text-warning",
  red: "bg-danger-soft text-danger",
  lime: "bg-brand-lime/25 text-brand-navy dark:text-brand-lime",
} as const;
export type Tone = keyof typeof tones;

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", tones[tone], className)}>
      {children}
    </span>
  );
}

const AVATAR_COLORS = ["bg-brand-blue", "bg-[#4f9a10]", "bg-[#1e3a8a]", "bg-[#7c3aed]", "bg-[#0e7490]", "bg-[#b45309]"];

export function Avatar({ name, src, size = 40, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const color = AVATAR_COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold text-white ring-2 ring-surface", color, className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden={!src}>
      {src ? <Image src={src} alt={name} fill sizes={`${size}px`} className="object-cover" unoptimized /> : initials(name)}
    </span>
  );
}

export function Progress({ value, tone = "blue", className, label }: { value: number; tone?: "blue" | "green" | "lime"; className?: string; label?: string }) {
  const bar = tone === "green" ? "bg-brand-green" : tone === "lime" ? "bg-brand-lime" : "bg-primary";
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-surface-muted", className)}
      role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cn("h-full rounded-full transition-[width] duration-700 ease-out", bar)} style={{ width: `${v}%` }} />
    </div>
  );
}

/** The logo's base arc, reused as a circular progress indicator. Drawn on dark banners; `color` is any CSS colour. */
export function ProgressRing({ value, size = 96, stroke = 10, color = "var(--brand-lime)", children }: {
  value: number; size?: number; stroke?: number; color?: string; children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-white/15" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (v / 100) * c} className="transition-[stroke-dashoffset] duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

/** An empty list: a small picture that matches what's missing, a title, a hint and one action. */
export function EmptyState({ title, description, action, className, art = "generic", illustration }: {
  title: string; description?: ReactNode; action?: ReactNode; className?: string;
  /** Which picture to show; `illustration` replaces it entirely (error and access pages). */
  art?: EmptyArt; illustration?: ReactNode;
}) {
  return (
    <div className={cn("px-5 py-10 text-center", className)}>
      {illustration ?? <EmptyIllustration art={art} className="mx-auto mb-4 w-40 sm:w-44" />}
      <h3 className="font-medium">{title}</h3>
      {brief(description, 100) && <p className="mx-auto mt-1 max-w-sm text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/**
 * Keeps screens quiet: a supporting line shows only when it's short (a status like "3 to go today").
 * Long explanations are left out; the screen itself should make them unnecessary.
 */
export function brief(text: ReactNode, max: number) {
  if (text == null || text === false || text === "") return false;
  return typeof text !== "string" || text.length <= max;
}

export function PageHeader({ title, description, action, eyebrow }: { title: string; description?: ReactNode; action?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-sm text-fg-subtle">{eyebrow}</p>}
        <h1 className="text-[34px] leading-none tracking-[-0.03em] sm:text-[40px]">{title}</h1>
        {brief(description, 40) && <p className="mt-2 max-w-2xl text-fg-muted">{description}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, className }: {
  label: string; value: ReactNode; hint?: ReactNode; className?: string;
}) {
  return (
    <div className={cn("card p-4 sm:p-5", className)}>
      <p className="text-sm text-fg-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-sm text-fg-subtle">{hint}</p>}
    </div>
  );
}

/** Notice for features waiting on an external credential. Never pretends the feature works. */
export function NotConfigured({ feature, envVars, children }: { feature: string; envVars: string[]; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-warning/50 bg-warning-soft/60 p-4 text-sm">
      <p className="font-semibold text-warning">{feature} is not configured yet</p>
      <p className="mt-1 text-fg-muted">
        An administrator needs to set {envVars.map((v, i) => (
          <span key={v}>{i > 0 && (i === envVars.length - 1 ? " and " : ", ")}<code className="rounded bg-surface px-1 py-0.5 text-xs">{v}</code></span>
        ))} in the deployment settings. {children}
      </p>
    </div>
  );
}
