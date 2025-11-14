"use client";

import { useFrameScrollProgress } from "@/src/hooks/useFrameScrollProgress";

type Props = {
  label?: string;
  className?: string;
};

export default function ScrollHUD({ label = "PAGE", className = "" }: Props) {
  const p = useFrameScrollProgress(".tester-frame");
  const pct = Math.round(p * 100);

  return (
    <div
      className={
        "pointer-events-auto fixed bottom-6 left-1/2 z-[150] -translate-x-1/2 rounded-full " +
        "bg-zinc-900/90 px-4 py-2 text-[11px] text-zinc-100 shadow-lg shadow-black/40 backdrop-blur " +
        className
      }
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-zinc-400">
          {label}
        </span>
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full bg-zinc-200" style={{ width: `${pct}%` }} />
        </div>
        <span className="tabular-nums text-[10px] text-zinc-400">{pct}%</span>
      </div>
    </div>
  );
}
