// src/components/dev/GlobalScrollHUD.tsx
"use client";

import { useFrameScrollProgress } from "@/src/hooks/useFrameScrollProgress";

type Props = {
  containerSel?: string;
};

export default function GlobalScrollHUD({ containerSel = ".tester-frame" }: Props) {
  const progress = useFrameScrollProgress(containerSel); // 0–1
  const pct = Math.round(progress * 100);

  return (
    <div className="pointer-events-none fixed bottom-8 left-[25%] z-[80] -translate-x-1/2">

      <div className="flex items-center gap-4 rounded-full bg-neutral-900/90 px-5 py-2 text-xs text-neutral-100 shadow-[0_16px_40px_rgba(0,0,0,0.65)]">
        <span className="rounded-full bg-neutral-800 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-neutral-400">
          Page
        </span>

        <div className="relative h-1.5 w-40 overflow-hidden rounded-full bg-neutral-800">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-emerald-400"
            style={{ width: `${pct}%` }}
          />
        </div>

        <span className="tabular-nums text-[10px] text-neutral-300">
          {pct}%
        </span>
      </div>
    </div>
  );
}
