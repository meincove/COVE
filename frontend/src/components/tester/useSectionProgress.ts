// src/components/tester/useSectionProgress.ts
"use client";

import { useEffect, useState } from "react";
import { MotionValue, useMotionValueEvent, useScroll } from "framer-motion";

type Result = { mv: MotionValue<number>; num: number };

/**
 * Local scroll for ONE section inside `.tester-frame`
 *
 * - 0   when the section's TOP hits the TOP of the frame
 * - 1   when the section's BOTTOM hits the TOP of the frame
 *
 * This gives you a clean [0,1] range per section.
 */
export function useSectionProgress(
  sectionRef: React.RefObject<HTMLElement | null>,
  containerSelector = ".tester-frame"
): Result {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [num, setNum] = useState(0);

  // find the scroll container once on mount
  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.querySelector(containerSelector) as HTMLElement | null;
    setContainer(el);
  }, [containerSelector]);

  // framer-motion scroll progress for this section
  const { scrollYProgress } = useScroll({
    container,
    target: sectionRef,
    offset: ["start start", "end start"], // 0 at section top, 1 after it scrolls past
  } as any);

  // numeric mirror (for HUD + debugging)
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setNum(v);
  });

  return { mv: scrollYProgress, num };
}
