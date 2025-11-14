// src/components/tester/SectionShell.tsx
"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { useLocalScrollProgress } from "@/src/hooks/useLocalScrollProgress";

type Props = {
  /** selector for the scroll container (your frame) */
  containerSel?: string;                    // default ".tester-frame"
  globalProgress: number;                   // optional cross-section use
  className?: string;
  children: (p: {
    local: number;
    global: number;
    sectionRef: React.RefObject<HTMLDivElement | null>; // <-- nullable
  }) => React.ReactNode;
};

export default function SectionShell({
  containerSel = ".tester-frame",
  globalProgress,
  className,
  children,
}: Props) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  // useLocalScrollProgress(ref, containerSelector)  <-- string, not ref
  const local = useLocalScrollProgress(sectionRef, containerSel); // 0→1 while in view

  return (
    <motion.section
      ref={sectionRef}
      className={["relative h-screen w-full", className].filter(Boolean).join(" ")}
    >
      {children({ local, global: globalProgress, sectionRef })}
    </motion.section>
  );
}
