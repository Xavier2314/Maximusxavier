"use client";
import { motion, useReducedMotion, useScroll, useSpring, useTransform, type Variants } from "framer-motion";
import { useRef, type ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Thin red reading-progress bar fixed to the top of the page. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });
  return <motion.div aria-hidden="true" style={{ scaleX }} className="fixed inset-x-0 top-0 z-[70] h-[3px] origin-left bg-red" />;
}

/** Moves its content slower than the page scroll (background images). */
export function Parallax({ children, className = "", distance = 80 }: { children: ReactNode; className?: string; distance?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : distance]);
  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }} className="absolute inset-[-6%_0]">{children}</motion.div>
    </div>
  );
}

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } };
const item: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

/** Staggers its <StaggerItem> children in as the group scrolls into view. */
export function Stagger({ children, className = "", as = "div" }: { children: ReactNode; className?: string; as?: "div" | "ol" | "ul" }) {
  const reduce = useReducedMotion();
  const M = as === "ol" ? motion.ol : as === "ul" ? motion.ul : motion.div;
  if (reduce) { const T = as; return <T className={className}>{children}</T>; }
  return <M className={className} variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>{children}</M>;
}

export function StaggerItem({ children, className = "", as = "div" }: { children: ReactNode; className?: string; as?: "div" | "li" }) {
  const M = as === "li" ? motion.li : motion.div;
  return <M className={className} variants={item}>{children}</M>;
}

/** Wipes an image (or block) in from the bottom with a clip-path as it enters the viewport. */
export function ImageReveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ clipPath: "inset(100% 0% 0% 0%)" }}
      whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 1.1, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
