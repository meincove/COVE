// src/components/dev/SectionHUD.tsx
"use client";

type Props = {
  label: string;
  value: number; // 0–1
};

export default function SectionHUD({ label, value }: Props) {
  const pct = Math.round(value * 100);
  const visible = value > 0.02 && value < 0.98;

  return (
    <div
  className="pointer-events-none fixed bottom-8 left-[75%] z-[76] -translate-x-1/2 transition-opacity duration-200"
  style={{ opacity: visible ? 1 : 0 }}
>

      <div className="flex items-center gap-4 rounded-full bg-neutral-900/90 px-4 py-1.5 text-xs text-neutral-100 shadow-[0_16px_40px_rgba(0,0,0,0.65)]">
        <span className="rounded-full bg-neutral-800 px-3 py-0.5 text-[10px] uppercase tracking-[0.2em] text-neutral-400">
          {label}
        </span>

        <div className="relative h-1.5 w-32 overflow-hidden rounded-full bg-neutral-800">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-sky-400"
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
