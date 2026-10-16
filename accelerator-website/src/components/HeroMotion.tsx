"use client";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

/* ---------------------------------------------------------------------------------------------
 * Kinetic type: every word rises out of a mask, line by line.
 * ------------------------------------------------------------------------------------------- */
export function KineticHeadline({ lines, className = "" }: { lines: { text: string; className?: string }[]; className?: string }) {
  const reduce = useReducedMotion();
  let i = 0;
  return (
    <h1 className={className}>
      {lines.map((line, li) => (
        <span key={li} className={`block ${line.className ?? ""}`}>
          {line.text.split(" ").map((w, wi) => {
            const d = 0.15 + i++ * 0.07;
            return (
              <span key={wi} className="inline-block overflow-hidden pb-[0.12em] align-top">
                <motion.span
                  className="inline-block will-change-transform"
                  initial={reduce ? false : { y: "110%", rotate: 6, opacity: 0 }}
                  animate={{ y: "0%", rotate: 0, opacity: 1 }}
                  transition={{ duration: 0.9, delay: d, ease: EASE }}
                >
                  {w}
                </motion.span>
                {wi < line.text.split(" ").length - 1 && " "}
              </span>
            );
          })}
        </span>
      ))}
    </h1>
  );
}

/** Cycles through short phrases with a vertical swap. */
export function WordCycler({ words, interval = 2400, className = "" }: { words: string[]; interval?: number; className?: string }) {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setI((n) => (n + 1) % words.length), interval);
    return () => clearInterval(id);
  }, [words.length, interval, reduce]);
  return (
    <span className={`relative inline-grid overflow-hidden align-bottom ${className}`} aria-live="off">
      {/* reserve the width of the longest phrase */}
      <span className="invisible col-start-1 row-start-1" aria-hidden="true">{words.reduce((a, b) => (a.length >= b.length ? a : b))}</span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={i}
          className="col-start-1 row-start-1"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          {words[i]}
        </motion.span>
      </AnimatePresence>
      <span className="sr-only">{words.join(", ")}</span>
    </span>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Shape morphing: one brand shape flows through diamond, square, octagon and triangle while
 * a red dot system orbits it.
 * ------------------------------------------------------------------------------------------- */
const SHAPES = [
  "polygon(50% 0%, 75% 25%, 100% 50%, 75% 75%, 50% 100%, 25% 75%, 0% 50%, 25% 25%)", // diamond
  "polygon(50% 6%, 94% 6%, 94% 50%, 94% 94%, 50% 94%, 6% 94%, 6% 50%, 6% 6%)", // square
  "polygon(50% 0%, 85% 15%, 100% 50%, 85% 85%, 50% 100%, 15% 85%, 0% 50%, 15% 15%)", // octagon
  "polygon(50% 4%, 72% 42%, 96% 92%, 72% 92%, 50% 92%, 28% 92%, 4% 92%, 28% 42%)", // triangle
];
export function MorphShape({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className={`pointer-events-none aspect-square ${className || "relative"}`} aria-hidden="true">
      <motion.div
        className="absolute inset-[14%]"
        style={{ clipPath: SHAPES[0], background: "linear-gradient(135deg,#E11E2D,#1E4BFF)" }}
        animate={reduce ? undefined : { clipPath: [...SHAPES, SHAPES[0]], rotate: [0, 90, 180, 270, 360] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", times: [0, 0.25, 0.5, 0.75, 1] }}
      />
      <motion.div
        className="absolute inset-[30%] mix-blend-overlay"
        style={{ clipPath: SHAPES[2], background: "#F4F1EA" }}
        animate={reduce ? undefined : { clipPath: [SHAPES[2], SHAPES[0], SHAPES[3], SHAPES[1], SHAPES[2]], rotate: [0, -90, -180, -270, -360] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* orbit ring + dots */}
      <div className="absolute inset-0 rounded-full border border-white/15" />
      <div className="orbit absolute inset-0"><span className="absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red shadow-[0_0_18px_4px_rgba(225,30,45,.7)]" /></div>
      <div className="orbit orbit-rev absolute inset-[8%]"><span className="absolute bottom-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-white shadow-[0_0_12px_2px_rgba(255,255,255,.6)]" /></div>
      <div className="orbit orbit-slow absolute -inset-[6%]"><span className="absolute left-0 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C4A062]" /></div>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Animated brand mark: the blue "A" and red "B" fly in and lock into the heart, then the logo
 * floats and sways in 3D (tilting toward the pointer), a light gleam sweeps across it, a glow
 * pulses behind it and the dot system orbits around it.
 * ------------------------------------------------------------------------------------------- */
export function LogoMotion({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0), my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [12, -12]), { stiffness: 120, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-16, 16]), { stiffness: 120, damping: 18 });

  useEffect(() => {
    if (reduce || !window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      const r = ref.current?.getBoundingClientRect(); if (!r) return;
      mx.set(Math.max(-0.5, Math.min(0.5, (e.clientX - (r.left + r.width / 2)) / window.innerWidth)));
      my.set(Math.max(-0.5, Math.min(0.5, (e.clientY - (r.top + r.height / 2)) / window.innerHeight)));
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce, mx, my]);

  const part = (src: string, from: number) => (
    <motion.img
      src={src}
      alt=""
      draggable={false}
      className="absolute inset-0 h-full w-full object-contain"
      initial={reduce ? false : { x: `${from}%`, rotate: from / 3, scale: 0.6, opacity: 0, filter: "blur(10px)" }}
      animate={{ x: "0%", rotate: 0, scale: 1, opacity: 1, filter: "blur(0px)" }}
      transition={{ type: "spring", stiffness: 70, damping: 14, mass: 1.1, delay: 0.35 }}
    />
  );

  return (
    <div ref={ref} className={`pointer-events-none aspect-square [perspective:1000px] ${className || "relative"}`} aria-hidden="true">
      {/* pulsing glow */}
      <div className="logo-glow absolute inset-[18%] rounded-full" />
      {/* rotating dashed ring with diamond markers */}
      <svg className="spin-slow absolute inset-[4%] h-[92%] w-[92%]" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(157,178,255,.35)" strokeWidth=".35" strokeDasharray="1.2 2.4" />
        {[0, 90, 180, 270].map((a) => <rect key={a} x="49" y="0.6" width="2" height="2" fill={a % 180 ? "#1E4BFF" : "#E11E2D"} transform={`rotate(${a + 45} 50 50) rotate(45 50 1.6)`} />)}
      </svg>
      {/* orbit ring + dots */}
      <div className="absolute inset-0 rounded-full border border-white/15" />
      <div className="orbit absolute inset-0"><span className="absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red shadow-[0_0_18px_4px_rgba(225,30,45,.7)]" /></div>
      <div className="orbit orbit-rev absolute inset-[8%]"><span className="absolute bottom-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-white shadow-[0_0_12px_2px_rgba(255,255,255,.6)]" /></div>
      <div className="orbit orbit-slow absolute -inset-[6%]"><span className="absolute left-0 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C4A062]" /></div>

      {/* the mark */}
      <motion.div className="absolute inset-[20%] [transform-style:preserve-3d]" style={reduce ? undefined : { rotateX: rx, rotateY: ry }}>
        <div className={`logo-mark absolute inset-0 ${reduce ? "" : "logo-float"}`}>
          {part("/brand/icon-part-a.png", -70)}
          {part("/brand/icon-part-b.png", 70)}
          {!reduce && <div className="logo-shine absolute inset-0" />}
        </div>
      </motion.div>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Abstract particle field: drifting points that link up when close. Canvas, capped DPR,
 * pauses off-screen, disabled for reduced motion.
 * ------------------------------------------------------------------------------------------- */
export function ParticleField({ className = "", density = 0.00006 }: { className?: string; density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cvs = ref.current;
    if (!cvs || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0, h = 0, raf = 0, visible = true;
    type P = { x: number; y: number; vx: number; vy: number; r: number; c: string };
    let ps: P[] = [];
    const colors = ["rgba(255,255,255,.75)", "rgba(157,178,255,.8)", "rgba(225,30,45,.85)"];
    const resize = () => {
      w = cvs.clientWidth; h = cvs.clientHeight;
      cvs.width = w * dpr; cvs.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.max(18, Math.min(70, Math.round(w * h * density)));
      ps = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25 - 0.08, r: Math.random() * 1.6 + 0.6, c: colors[Math.floor(Math.random() * colors.length)] }));
    };
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -10) p.x = w + 10; if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10; if (p.y > h + 10) p.y = -10;
      }
      for (let a = 0; a < ps.length; a++) for (let b = a + 1; b < ps.length; b++) {
        const dx = ps[a].x - ps[b].x, dy = ps[a].y - ps[b].y, d = dx * dx + dy * dy;
        if (d < 14000) { ctx.strokeStyle = `rgba(157,178,255,${0.16 * (1 - d / 14000)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ps[a].x, ps[a].y); ctx.lineTo(ps[b].x, ps[b].y); ctx.stroke(); }
      }
      for (const p of ps) { ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
      if (visible) raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; cancelAnimationFrame(raf); if (visible) raf = requestAnimationFrame(tick); });
    resize(); io.observe(cvs); window.addEventListener("resize", resize);
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener("resize", resize); };
  }, [density]);
  return <canvas ref={ref} className={`pointer-events-none ${className}`} aria-hidden="true" />;
}

/* ---------------------------------------------------------------------------------------------
 * Kinetic type band: two giant rows that slide in opposite directions as you scroll.
 * ------------------------------------------------------------------------------------------- */
export function KineticBand({ rows, tone = "cream" }: { rows: ReactNode[][]; tone?: "cream" | "navy" }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x1 = useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]);
  const x2 = useTransform(scrollYProgress, [0, 1], ["-30%", "0%"]);
  const dark = tone === "navy";
  return (
    <div ref={ref} aria-hidden="true" className={`overflow-hidden py-10 md:py-14 ${dark ? "bg-navy-900 text-white" : "bg-cream text-navy"}`}>
      {rows.map((items, r) => (
        <motion.div key={r} style={{ x: r % 2 ? x2 : x1 }} className="flex w-max items-center gap-8 whitespace-nowrap font-display text-[clamp(3rem,9vw,8.5rem)] font-medium leading-[1.05] tracking-[-0.02em] md:gap-12">
          {[...items, ...items, ...items].map((it, k) => <span key={k} className="flex items-center gap-8 md:gap-12">{it}<span className="text-[0.45em] text-red">&#9670;</span></span>)}
        </motion.div>
      ))}
    </div>
  );
}
