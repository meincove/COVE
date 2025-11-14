// src/components/tester/SectionOne.tsx
"use client";

import Image from "next/image";
import { useRef } from "react";
import { useLocalScrollProgress } from "@/src/hooks/useLocalScrollProgress";
import SectionHUD from "@/src/components/dev/SectionHUD";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Props = { containerSel?: string };

export default function SectionOne({ containerSel = ".tester-frame" }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const local = useLocalScrollProgress(ref, containerSel); // 0–1

  const yFast = lerp(140, -120, local);
  const ySlow = lerp(80, -60, local);
  const glow = lerp(0.35, 1, local);

  return (
    <section
      ref={ref}
      className="relative h-screen w-full overflow-hidden bg-black text-white"
    >
      {/* subtle background glow */}
      <div
        style={{ opacity: glow }}
        className="pointer-events-none absolute inset-0"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(50% 50% at 50% 50%, rgba(255,255,255,.12) 0%, rgba(0,0,0,0) 70%)",
          }}
        />
      </div>

      <div className="relative z-10 flex h-full w-full items-center justify-between gap-8 px-12">
        <div className="max-w-xl">
          <h2 className="text-4xl font-semibold">Section 1</h2>
          <p className="mt-2 text-sm opacity-70">
            Local progress: {local.toFixed(2)}
          </p>
          <p className="mt-6 text-lg opacity-90">
            Two layers rise at different speeds (parallax).
          </p>
        </div>

        <div className="flex items-end gap-6">
          <div
            style={{ transform: `translateY(${yFast}px)` }}
            className="overflow-hidden rounded-2xl ring-1 ring-white/10"
          >
            <Image
              src="/clothing-images/originals/OBMR003-front.png"
              alt="OBMR003-front"
              width={440}
              height={560}
              priority
            />
          </div>
          <div
            style={{ transform: `translateY(${ySlow}px)` }}
            className="overflow-hidden rounded-2xl ring-1 ring-white/10"
          >
            <Image
              src="/clothing-images/originals/CUHD001-front.png"
              alt="CUHD001-front"
              width={420}
              height={540}
              priority
            />
          </div>
        </div>
      </div>

      <SectionHUD label="Section 1" value={local} />
    </section>
  );
}
