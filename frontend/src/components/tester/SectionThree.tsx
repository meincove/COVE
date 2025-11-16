// src/components/tester/SectionThree.tsx
"use client";

import Image from "next/image";
import { useRef } from "react";
import { useLocalScrollProgress } from "@/src/hooks/useLocalScrollProgress";
import SectionHUD from "@/src/components/dev/SectionHUD";

// helpers
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Map global local progress (0–1) into a sub-segment [start, end].
 * Returns 0 before start, 1 after end, smooth 0→1 in between.
 */
function segment(local: number, start: number, end: number) {
  if (local <= start) return 0;
  if (local >= end) return 1;
  return (local - start) / (end - start);
}

type Props = { containerSel?: string };

export default function SectionThree({ containerSel = ".tester-frame" }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const local = useLocalScrollProgress(ref, containerSel); // 0–1

  // Make the section tall enough so the sticky panel has room
  // to “play” three chapters.
  // 1 chapter ≈ 120vh → 3 chapters ≈ 360vh
  const SECTION_HEIGHT = "360vh";

  // --- chapter timings (in local progress 0–1) ---
  const tIntro = segment(local, 0.0, 0.25); // text enters & pins
  const tPair  = segment(local, 0.25, 0.6); // side cards slide in & hold
  const tHero  = segment(local, 0.6, 1.0);  // hero zoom + copy

  // INTRO title motion (bottom → center, then hold, then fade)
  const introEnter = clamp01(tIntro / 0.6);       // fast in
  const introHoldFade = clamp01(1 - (local - 0.55) / 0.2); // fade out near hero
  const introOpacity = Math.min(introEnter, introHoldFade);
  const introY = lerp(80, 0, introEnter);        // move from below to center

  // PAIR images motion (enter after title, then hold)
  const pairEnter = clamp01((tPair - 0.2) / 0.6);
  const pairOpacity = pairEnter;
  const pairY = lerp(80, 0, pairEnter);
  const pairScale = lerp(0.92, 1.02, pairEnter);

  // HERO motion (appears later, zooms a bit)
  const heroEnter = clamp01((tHero - 0.1) / 0.6);
  const heroOpacity = heroEnter;
  const heroScale = lerp(1.0, 1.2, heroEnter);
  const heroY = lerp(40, -30, heroEnter);
  const heroTextOpacity = clamp01((heroEnter - 0.4) / 0.6);

  return (
    <section
      ref={ref}
      className="relative w-full text-black"
      style={{
        minHeight: SECTION_HEIGHT,
        background:
          "radial-gradient(circle at center, #ff8b61 0%, #ff5a36 55%, #ff4a26 100%)",
      }}
    >
      {/* debug label */}
      <div className="pointer-events-none absolute left-6 top-6 text-[11px] uppercase tracking-[0.2em] text-black/60">
        Section 3 · Local {local.toFixed(2)}
      </div>

      {/* sticky viewport storyteller */}
      <div className="sticky top-0 flex h-screen items-center justify-center px-6 sm:px-12">
        <div className="relative flex w-full max-w-6xl flex-col items-center justify-center">
          {/* INTRO TITLE (pinned at center for a while) */}
          <div
            style={{
              opacity: introOpacity,
              transform: `translateY(${introY}px)`,
            }}
            className="pointer-events-none absolute inset-x-0 mx-auto flex max-w-3xl flex-col items-center text-center"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-black/70">
              FOR MEN
            </p>
            <h2 className="mt-4 text-4xl sm:text-5xl md:text-6xl font-semibold tracking-[0.14em]">
              XOBO 3L XPORE JKT
            </h2>
            <p className="mt-4 max-w-xl text-sm sm:text-base text-black/75">
              The base silhouette. Clean lines, sharp proportions — the starting
              point of every Cove drop.
            </p>
          </div>

          {/* PAIR IMAGES (slide up and hold around the text) */}
          <div
            style={{
              opacity: pairOpacity,
              transform: `translateY(${pairY}px) scale(${pairScale})`,
            }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div className="flex w-full max-w-5xl flex-col gap-10 md:flex-row md:items-center md:justify-between">
              <div className="mx-auto rounded-[32px] bg-[#f8f0e4]/95 p-4 shadow-[0_32px_80px_rgba(0,0,0,0.35)]">
                <Image
                  src="/clothing-images/CUHD001-front.png"
                  alt="Left fit"
                  width={360}
                  height={480}
                />
              </div>
              <div className="mx-auto rounded-[32px] bg-[#f8f0e4]/80 p-4 shadow-[0_32px_80px_rgba(0,0,0,0.35)]">
                <Image
                  src="/clothing-images/OBMR003-front.png"
                  alt="Right fit"
                  width={360}
                  height={480}
                />
              </div>
            </div>
          </div>

          {/* HERO ZOOM SCENE */}
          <div
            style={{
              opacity: heroOpacity,
              transform: `translateY(${heroY}px) scale(${heroScale})`,
            }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div className="flex w-full max-w-5xl flex-col gap-8 md:flex-row md:items-center">
              <div className="mx-auto rounded-[32px] bg-gray-100/95 p-4 shadow-[0_40px_100px_rgba(0,0,0,0.5)]">
                <Image
                  src="/clothing-images/CUHD003-front.png"
                  alt="Hero hoodie"
                  width={420}
                  height={540}
                />
              </div>

              <div
                style={{ opacity: heroTextOpacity }}
                className="mt-6 flex-1 text-left md:mt-0"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-black/70">
                  Chapter three
                </p>
                <h3 className="mt-3 text-2xl sm:text-3xl font-semibold">
                  From single look to full story.
                </h3>
                <p className="mt-3 max-w-md text-sm sm:text-base text-black/80">
                  As you scroll, the base layer, contrast and texture lock into
                  place. This is the exact moment we want every Cove drop to
                  feel like — sharp, intentional, and fully formed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* section-level HUD (your dev overlay) */}
      <SectionHUD label="Section 3" value={local} />
    </section>
  );
}
