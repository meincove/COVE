// src/components/tester/SectionThree.tsx
"use client";

import Image from "next/image";
import { useRef } from "react";
import { useLocalScrollProgress } from "@/src/hooks/useLocalScrollProgress";
import SectionHUD from "@/src/components/dev/SectionHUD";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

type Props = { containerSel?: string };

export default function SectionThree({ containerSel = ".tester-frame" }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const local = useLocalScrollProgress(ref, containerSel); // 0–1

  const xContent = lerp(120, 0, local); // slide from right -> center
  const bgGlow = lerp(0.2, 0.8, local);
  const copyOpacity = clamp01((local - 0.1) / 0.3);

  return (
    <section
      ref={ref}
      className="relative min-h-[180vh] w-full overflow-hidden bg-[#050714] text-white"
    >
      <div
        style={{ opacity: bgGlow }}
        className="pointer-events-none absolute inset-0"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(80% 80% at 0% 50%, rgba(134,239,172,0.12) 0%, rgba(15,23,42,0) 60%), radial-gradient(80% 80% at 100% 50%, rgba(59,130,246,0.18) 0%, rgba(15,23,42,0) 60%)",
          }}
        />
      </div>

      <div className="sticky top-0 flex h-screen items-center px-12">
        <div
          style={{
            transform: `translateX(${xContent}px)`,
            opacity: copyOpacity,
          }}
          className="relative z-10 grid w-full max-w-6xl grid-cols-1 gap-12 md:grid-cols-2"
        >
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">
              Section 3 · Local progress {local.toFixed(2)}
            </p>
            <h2 className="text-4xl font-semibold">
              When the story shifts sideways.
            </h2>
            <p className="max-w-md text-sm text-slate-200/80">
              The next chapter of the scroll doesn&apos;t just fade in, it moves in.
              As you drift past the second scene, Cove&apos;s silhouettes slide into
              view from the side, like walking into a new room in the same world.
            </p>
          </div>

          <div className="flex items-center justify-center">
            <div className="overflow-hidden rounded-3xl bg-slate-900/60 shadow-[0_40px_80px_rgba(0,0,0,0.6)] ring-1 ring-white/10">
              <Image
                src="/clothing-images/casual/DUJK004-front.png"
                alt="DUJK004-front"
                width={420}
                height={540}
              />
            </div>
          </div>
        </div>
      </div>

      <SectionHUD label="Section 3" value={local} />
    </section>
  );
}
