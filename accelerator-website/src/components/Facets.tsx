/**
 * Geometric "facet" clusters: diamonds and triangles cut from the AB Heart palette.
 * Decorative only (aria-hidden). Echoes the faceted, energetic event graphics.
 */
type Props = { side?: "left" | "right"; className?: string; tone?: "dark" | "light" };

export function Facets({ side = "left", className = "", tone = "dark" }: Props) {
  const flip = side === "right" ? "scale(-1,1) translate(-240,0)" : undefined;
  const pale = tone === "dark" ? "#F4F1EA" : "#FFFFFF";
  return (
    <svg viewBox="0 0 240 520" className={className} aria-hidden="true" focusable="false">
      <g transform={flip}>
        <polygon points="0,40 70,110 0,180" fill="#E11E2D" />
        <polygon points="0,180 70,110 120,160 50,230" fill="#1E4BFF" />
        <polygon points="70,110 140,40 140,180" fill="#0B2E8A" />
        <polygon points="50,230 120,160 190,230 120,300" fill="#E11E2D" />
        <polygon points="96,230 120,206 144,230 120,254" fill={pale} />
        <polygon points="0,250 50,230 0,320" fill="#C4A062" opacity="0.9" />
        <polygon points="0,320 60,380 0,440" fill="#1E4BFF" />
        <polygon points="60,380 120,300 120,440" fill="#0B1E3F" opacity="0.85" />
        <polygon points="120,300 190,230 190,370" fill="#0B2E8A" />
        <polygon points="0,440 60,380 120,440 60,500" fill="#E11E2D" />
        <polygon points="40,440 60,420 80,440 60,460" fill={pale} />
        <polygon points="140,40 200,0 200,100" fill="#E11E2D" opacity="0.9" />
      </g>
    </svg>
  );
}

export function FacetStrip({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 24" preserveAspectRatio="none" className={className} aria-hidden="true" focusable="false">
      <polygon points="0,0 150,0 130,24 0,24" fill="#E11E2D" />
      <polygon points="150,0 300,0 280,24 130,24" fill="#1E4BFF" />
      <polygon points="300,0 450,0 430,24 280,24" fill="#0B2E8A" />
      <polygon points="450,0 600,0 600,24 430,24" fill="#C4A062" />
    </svg>
  );
}
