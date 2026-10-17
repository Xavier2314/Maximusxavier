import { FULL_VIEWBOX, HORIZONTAL_VIEWBOX, MARK_PATHS, MARK_VIEWBOX, TAGLINE_PATHS, WORDMARK_PATHS } from "./logo-paths";

const FILLS = { blue: "#305EE6", green: "#7ED321" } as const;

type Props = {
  className?: string;
  /** "mark" = trophy symbol only, "horizontal" = symbol + wordmark, "full" = with tagline. */
  variant?: "mark" | "horizontal" | "full";
  /** Single-colour rendering (e.g. white on a blue background), as in the logo manual. */
  mono?: boolean;
  title?: string;
};

/**
 * The official Maximus logo. The wordmark uses `currentColor`, so it follows the
 * surrounding text colour: navy on light surfaces, white on dark ones.
 */
export function Logo({ className, variant = "horizontal", mono = false, title = "Maximus" }: Props) {
  const viewBox = variant === "mark" ? MARK_VIEWBOX : variant === "full" ? FULL_VIEWBOX : HORIZONTAL_VIEWBOX;
  return (
    <svg viewBox={viewBox} className={className} role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      <title>{title}</title>
      {MARK_PATHS.map((p, i) => (
        <path key={i} d={p.d} fill={mono ? "currentColor" : FILLS[p.fill]} />
      ))}
      {variant !== "mark" && WORDMARK_PATHS.map((d, i) => <path key={`w${i}`} d={d} fill="currentColor" />)}
      {variant === "full" && TAGLINE_PATHS.map((d, i) => <path key={`t${i}`} d={d} fill="currentColor" />)}
    </svg>
  );
}
