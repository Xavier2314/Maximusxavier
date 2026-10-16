/** Simple line icons for the social platforms we link to (no external icon set needed). */
export function SocialIcon({ name, size = 20, className = "" }: { name: string; size?: number; className?: string }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className, "aria-hidden": true };
  switch (name) {
    case "Instagram":
      return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" /></svg>;
    case "YouTube":
      return <svg {...common}><rect x="2" y="5" width="20" height="14" rx="4" /><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor" /></svg>;
    case "Facebook":
      return <svg {...common}><path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V10H6.5v3.5H9V21h3.5v-7.5H15l.5-3.5h-3V7a1 1 0 0 1 1-1H15z" /></svg>;
    case "LinkedIn":
      return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 10.5V16M8 7.5v.01M12 16v-5.5M12 13a2.5 2.5 0 0 1 5 0v3" /></svg>;
    case "X":
      return <svg {...common}><path d="M4 4l16 16M20 4L4 20" /></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="9" /></svg>;
  }
}
