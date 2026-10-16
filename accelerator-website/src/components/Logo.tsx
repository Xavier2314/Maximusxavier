import Image from "next/image";

const SRC = {
  "horizontal-reversed": { src: "/brand/logo-horizontal-reversed.png", w: 1000, h: 344 },
  "horizontal-colour": { src: "/brand/logo-horizontal-colour.png", w: 1000, h: 344 },
  "stacked-reversed": { src: "/brand/logo-stacked-reversed.png", w: 1000, h: 723 },
  "stacked-colour": { src: "/brand/logo-stacked-colour.png", w: 1000, h: 723 },
  "icon-colour": { src: "/brand/icon-colour.png", w: 1000, h: 830 },
  "icon-reversed": { src: "/brand/icon-reversed.png", w: 1000, h: 830 },
} as const;

export function Logo({ variant, width, className = "", priority = false }: { variant: keyof typeof SRC; width: number; className?: string; priority?: boolean }) {
  const s = SRC[variant];
  return (
    <Image
      src={s.src}
      width={width}
      height={Math.round((width * s.h) / s.w)}
      alt="Accelerator Community (Accelerators Billionaires) logo"
      className={className}
      priority={priority}
    />
  );
}
