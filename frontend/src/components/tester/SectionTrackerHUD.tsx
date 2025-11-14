"use client";

import { useActiveSectionProgress } from "@/src/hooks/useActiveSectionProgress";

const LABELS = ["Section 1", "Section 2", "Section 3"];

export default function SectionTrackerHUD() {
  const { index, progress } = useActiveSectionProgress(".tester-frame");
  const pct = Math.round(progress * 100);
  const label = LABELS[index] ?? `Section ${index + 1}`;

  return (
    <div className="pointer-events-none fixed bottom-20 left-1/2 z-[140] -translate-x-1/2">
      <div className="pointer-events-auto rounded-full bg-stone-900/90 px-4 py-2 text-[11px] text-stone-100 shadow-lg shadow-black/40 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-stone-800 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-stone-400">
            {label}
          </span>
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-stone-800">
            <div
              className="h-full bg-emerald-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="tabular-nums text-[10px] text-stone-400">
            {pct}%
          </span>
        </div>
      </div>
    </div>
  );
}
