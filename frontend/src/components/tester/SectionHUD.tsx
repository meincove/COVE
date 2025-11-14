"use client";

import { useSectionProgressState } from "./SectionProgressContext";

export default function SectionHUD() {
  const progress = useSectionProgressState();

  const fmt = (v: number | undefined) =>
    v === undefined ? "--" : `${Math.round(v * 100)}%`;

  return (
    <div className="pointer-events-none fixed top-6 left-1/2 z-[61] -translate-x-1/2">
      <div className="inline-flex items-center gap-4 rounded-full bg-zinc-900/85 px-4 py-2 text-[11px] text-zinc-100 shadow-lg backdrop-blur">
        <span className="uppercase tracking-[0.25em] text-zinc-400">
          Sections
        </span>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-zinc-800 px-2 py-1">
            S1: {fmt(progress.section1)}
          </span>
          <span className="rounded-full bg-zinc-800 px-2 py-1">
            S2: {fmt(progress.section2)}
          </span>
          <span className="rounded-full bg-zinc-800 px-2 py-1">
            S3: {fmt(progress.section3)}
          </span>
        </div>
      </div>
    </div>
  );
}
