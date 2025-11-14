// src/components/tester/SectionTwo.tsx
"use client";

import Image from "next/image";
import { useRef } from "react";
import { useLocalScrollProgress } from "@/src/hooks/useLocalScrollProgress";
import SectionHUD from "@/src/components/dev/SectionHUD";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

type Props = { containerSel?: string };

export default function SectionTwo({ containerSel = ".tester-frame" }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const local = useLocalScrollProgress(ref, containerSel); // 0–1

  // Title: fade in early, stay, then fade out slightly
  const titleOpacityIn = clamp01(local / 0.2);
  const titleOpacityOut = clamp01(1 - (local - 0.7) / 0.3);
  const titleOpacity = Math.min(titleOpacityIn, titleOpacityOut);
  const titleY = lerp(40, -40, local);

  // Images: appear after title, rise & scale a bit
  const imagesOpacity = clamp01((local - 0.2) / 0.2);
  const imagesY = lerp(120, -40, local);
  const imagesScale = lerp(0.9, 1.04, clamp01((local - 0.15) / 0.85));

  return (
    <section
      ref={ref}
      className="relative min-h-[220vh] w-full overflow-hidden bg-[#f4ecdf] text-zinc-900"
    >
      {/* debug label */}
      <div className="pointer-events-none absolute left-6 top-6 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
        Section 2 · Local progress {local.toFixed(2)}
      </div>

      {/* sticky storytelling panel */}
      <div className="sticky top-0 flex h-screen items-center justify-center px-12">
        <div className="max-w-5xl flex-1">
          {/* big title in the middle */}
          <div
            style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }}
            className="flex flex-col items-center text-center"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
              For Cove
            </p>
            <h2 className="mt-4 text-4xl sm:text-5xl md:text-6xl font-medium tracking-[0.12em]">
              LIMITED ORIGINALS DROP
            </h2>
          </div>

          {/* product images that rise into view */}
          <div
            style={{
              opacity: imagesOpacity,
              transform: `translateY(${imagesY}px) scale(${imagesScale})`,
            }}
            className="mt-16 flex items-end justify-center gap-12"
          >
            <div className="overflow-hidden rounded-3xl bg-[#f8f0e4] shadow-[0_40px_80px_rgba(0,0,0,0.18)] ring-1 ring-black/5">
              <Image
                src="/clothing-images/originals/CUHD002-front.png"
                alt="CUHD002-front"
                width={420}
                height={540}
              />
            </div>
            <div className="overflow-hidden rounded-3xl bg-[#f8f0e4] shadow-[0_40px_80px_rgba(0,0,0,0.18)] ring-1 ring-black/5">
              <Image
                src="/clothing-images/originals/OBMR004-front.png"
                alt="OBMR004-front"
                width={420}
                height={540}
              />
            </div>
          </div>
        </div>
      </div>

      <SectionHUD label="Section 2" value={local} />
    </section>
  );
}
