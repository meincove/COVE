"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

type SectionKey = "section1" | "section2" | "section3";

type ProgressMap = Partial<Record<SectionKey, number>>;

type Ctx = {
  progress: ProgressMap;
  report: (key: SectionKey, value: number) => void;
};

const SectionProgressContext = createContext<Ctx | null>(null);

export function SectionProgressProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<ProgressMap>({});

  const report = useCallback((key: SectionKey, value: number) => {
    setProgress((prev) => {
      const clamped = Math.max(0, Math.min(1, value));
      if (prev[key] === clamped) return prev;
      return { ...prev, [key]: clamped };
    });
  }, []);

  return (
    <SectionProgressContext.Provider value={{ progress, report }}>
      {children}
    </SectionProgressContext.Provider>
  );
}

export function useSectionProgressReport() {
  const ctx = useContext(SectionProgressContext);
  if (!ctx) {
    throw new Error("useSectionProgressReport must be used inside SectionProgressProvider");
  }
  return ctx.report;
}

export function useSectionProgressState() {
  const ctx = useContext(SectionProgressContext);
  if (!ctx) {
    throw new Error("useSectionProgressState must be used inside SectionProgressProvider");
  }
  return ctx.progress;
}

export type { SectionKey };
