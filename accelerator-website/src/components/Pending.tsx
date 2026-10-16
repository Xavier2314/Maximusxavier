import { Clock3 } from "lucide-react";

/** Clearly marks content we are waiting to receive. Never replace with invented text. */
export function Pending({ label, className = "" }: { label: string; className?: string }) {
  return (
    <span className={`placeholder-note ${className}`} title="Awaiting official information">
      <Clock3 size={14} aria-hidden="true" /> {label}
    </span>
  );
}
