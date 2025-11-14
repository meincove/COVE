// src/components/parallax/ParallaxLayer.tsx
"use client";

import { motion, useTransform, useMotionValue } from "framer-motion";

type Props = {
  /** progress in [0,1] coming from SectionShell (local) or page (global) */
  progress: number;
  speed?: number;          // smaller = slower background; larger = faster foreground
  from?: number;           // px translate start
  to?: number;             // px translate end
  className?: string;
  children?: React.ReactNode;
};

export default function ParallaxLayer({ progress, speed = 0.5, from = 0, to = -200, className, children }: Props) {
  // map 0→1 with a speed factor
  const p = useMotionValue(progress);
  const y = useTransform(p, [0, 1], [from, to * speed]);

  // keep p in sync each render
  p.set(progress);

  return (
    <motion.div style={{ y }} className={["pointer-events-none absolute inset-0", className].join(" ")}>
      {children}
    </motion.div>
  );
}
