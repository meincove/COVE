// // src/components/tester/SectionThree.tsx
// "use client";

// import Image from "next/image";
// import { useRef } from "react";
// import { useLocalScrollProgress } from "@/src/hooks/useLocalScrollProgress";
// import SectionHUD from "@/src/components/dev/SectionHUD";

// // helpers
// const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
// const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// /**
//  * Map global local progress (0–1) into a sub-segment [start, end].
//  * Returns 0 before start, 1 after end, smooth 0→1 in between.
//  */
// function segment(local: number, start: number, end: number) {
//   if (local <= start) return 0;
//   if (local >= end) return 1;
//   return (local - start) / (end - start);
// }

// type Props = { containerSel?: string };

// export default function SectionThree({ containerSel = ".tester-frame" }: Props) {
//   const ref = useRef<HTMLDivElement | null>(null);
//   const local = useLocalScrollProgress(ref, containerSel); // 0–1

//   // Make the section tall enough so the sticky panel has room
//   // to “play” three chapters.
//   // 1 chapter ≈ 120vh → 3 chapters ≈ 360vh
//   const SECTION_HEIGHT = "360vh";

//   // --- chapter timings (in local progress 0–1) ---
//   const tIntro = segment(local, 0.0, 0.25); // text enters & pins
//   const tPair  = segment(local, 0.25, 0.6); // side cards slide in & hold
//   const tHero  = segment(local, 0.6, 1.0);  // hero zoom + copy

//   // INTRO title motion (bottom → center, then hold, then fade)
//   const introEnter = clamp01(tIntro / 0.6);       // fast in
//   const introHoldFade = clamp01(1 - (local - 0.55) / 0.2); // fade out near hero
//   const introOpacity = Math.min(introEnter, introHoldFade);
//   const introY = lerp(80, 0, introEnter);        // move from below to center

//   // PAIR images motion (enter after title, then hold)
//   const pairEnter = clamp01((tPair - 0.2) / 0.6);
//   const pairOpacity = pairEnter;
//   const pairY = lerp(80, 0, pairEnter);
//   const pairScale = lerp(0.92, 1.02, pairEnter);

//   // HERO motion (appears later, zooms a bit)
//   const heroEnter = clamp01((tHero - 0.1) / 0.6);
//   const heroOpacity = heroEnter;
//   const heroScale = lerp(1.0, 1.2, heroEnter);
//   const heroY = lerp(40, -30, heroEnter);
//   const heroTextOpacity = clamp01((heroEnter - 0.4) / 0.6);

//   return (
//     <section
//       ref={ref}
//       className="relative w-full text-black"
//       style={{
//         minHeight: SECTION_HEIGHT,
//         background:
//           "radial-gradient(circle at center, #ff8b61 0%, #ff5a36 55%, #ff4a26 100%)",
//       }}
//     >
//       {/* debug label */}
//       <div className="pointer-events-none absolute left-6 top-6 text-[11px] uppercase tracking-[0.2em] text-black/60">
//         Section 3 · Local {local.toFixed(2)}
//       </div>

//       {/* sticky viewport storyteller */}
//       <div className="sticky top-0 flex h-screen items-center justify-center px-6 sm:px-12">
//         <div className="relative flex w-full max-w-6xl flex-col items-center justify-center">
//           {/* INTRO TITLE (pinned at center for a while) */}
//           <div
//             style={{
//               opacity: introOpacity,
//               transform: `translateY(${introY}px)`,
//             }}
//             className="pointer-events-none absolute inset-x-0 mx-auto flex max-w-3xl flex-col items-center text-center"
//           >
//             <p className="text-xs uppercase tracking-[0.3em] text-black/70">
//               FOR MEN
//             </p>
//             <h2 className="mt-4 text-4xl sm:text-5xl md:text-6xl font-semibold tracking-[0.14em]">
//               XOBO 3L XPORE JKT
//             </h2>
//             <p className="mt-4 max-w-xl text-sm sm:text-base text-black/75">
//               The base silhouette. Clean lines, sharp proportions — the starting
//               point of every Cove drop.
//             </p>
//           </div>

//           {/* PAIR IMAGES (slide up and hold around the text) */}
//           <div
//             style={{
//               opacity: pairOpacity,
//               transform: `translateY(${pairY}px) scale(${pairScale})`,
//             }}
//             className="pointer-events-none absolute inset-0 flex items-center justify-center"
//           >
//             <div className="flex w-full max-w-5xl flex-col gap-10 md:flex-row md:items-center md:justify-between">
//               <div className="mx-auto rounded-[32px] bg-[#f8f0e4]/95 p-4 shadow-[0_32px_80px_rgba(0,0,0,0.35)]">
//                 <Image
//                   src="/clothing-images/CUHD001-front.png"
//                   alt="Left fit"
//                   width={360}
//                   height={480}
//                 />
//               </div>
//               <div className="mx-auto rounded-[32px] bg-[#f8f0e4]/80 p-4 shadow-[0_32px_80px_rgba(0,0,0,0.35)]">
//                 <Image
//                   src="/clothing-images/OBMR003-front.png"
//                   alt="Right fit"
//                   width={360}
//                   height={480}
//                 />
//               </div>
//             </div>
//           </div>

//           {/* HERO ZOOM SCENE */}
//           <div
//             style={{
//               opacity: heroOpacity,
//               transform: `translateY(${heroY}px) scale(${heroScale})`,
//             }}
//             className="pointer-events-none absolute inset-0 flex items-center justify-center"
//           >
//             <div className="flex w-full max-w-5xl flex-col gap-8 md:flex-row md:items-center">
//               <div className="mx-auto rounded-[32px] bg-gray-100/95 p-4 shadow-[0_40px_100px_rgba(0,0,0,0.5)]">
//                 <Image
//                   src="/clothing-images/CUHD003-front.png"
//                   alt="Hero hoodie"
//                   width={420}
//                   height={540}
//                 />
//               </div>

//               <div
//                 style={{ opacity: heroTextOpacity }}
//                 className="mt-6 flex-1 text-left md:mt-0"
//               >
//                 <p className="text-xs uppercase tracking-[0.3em] text-black/70">
//                   Chapter three
//                 </p>
//                 <h3 className="mt-3 text-2xl sm:text-3xl font-semibold">
//                   From single look to full story.
//                 </h3>
//                 <p className="mt-3 max-w-md text-sm sm:text-base text-black/80">
//                   As you scroll, the base layer, contrast and texture lock into
//                   place. This is the exact moment we want every Cove drop to
//                   feel like — sharp, intentional, and fully formed.
//                 </p>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* section-level HUD (your dev overlay) */}
//       <SectionHUD label="Section 3" value={local} />
//     </section>
//   );
// }



"use client";

import { useRef } from "react";
import { useLocalScrollProgress } from "@/src/hooks/useLocalScrollProgress";

// small helpers so the math is readable
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export default function SectionThree() {
  const sectionRef = useRef<HTMLDivElement | null>(null);

  // 0 → section just entered, 1 → section about to leave
  const t = useLocalScrollProgress(sectionRef);

  // --- PHASES for the single block (on this 0–1 range) ---
  // 0.00–0.10   : offscreen, preparing
  // 0.10–0.25   : ENTER (from below, fade in)
  // 0.25–0.65   : HOLD (pinned in the middle)
  // 0.65–0.85   : EXIT (move up, fade out)
  // 0.85–1.00   : gone
  const enterStart = 0.10;
  const enterEnd = 0.25;
  const holdStart = 0.25;
  const holdEnd = 0.65;
  const exitStart = 0.65;
  const exitEnd = 0.85;

  let opacity = 0;
  let translateY = 80; // px

  if (t <= enterStart || t >= exitEnd) {
    // completely hidden
    opacity = 0;
    translateY = t < enterStart ? 80 : -80;
  } else if (t > enterStart && t < enterEnd) {
    // ENTER: from 80px below → centre, 0 → 1 opacity
    const p = clamp((t - enterStart) / (enterEnd - enterStart), 0, 1);
    opacity = p;
    translateY = lerp(80, 0, p);
  } else if (t >= holdStart && t <= holdEnd) {
    // HOLD: perfectly pinned in centre
    opacity = 1;
    translateY = 0;
  } else if (t > exitStart && t < exitEnd) {
    // EXIT: 1 → 0 opacity, centre → 80px above
    const p = clamp((t - exitStart) / (exitEnd - exitStart), 0, 1);
    opacity = 1 - p;
    translateY = lerp(0, -80, p);
  }

  return (
    <section
      ref={sectionRef}
      className="relative h-[350vh] bg-[#ff6a3c] text-[#111827]"
    >
      {/* Sticky viewport – this stays fixed while content animates */}
      <div className="sticky top-0 h-screen flex items-center justify-center">
        {/* Story block – all motion is applied here */}
        <div
          style={{
            opacity,
            transform: `translate3d(0, ${translateY}px, 0)`,
            pointerEvents: opacity === 0 ? "none" : "auto",
          }}
          className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-12"
        >
          {/* Intro copy */}
          <div className="text-center mb-8">
            <p className="text-[10px] sm:text-xs tracking-[0.35em] uppercase text-black/70 mb-3">
              Chapter One · For Cove
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-[0.18em] font-semibold">
              XOBO&nbsp;3L&nbsp;XPORE&nbsp;JKT
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-sm sm:text-base text-black/80 leading-relaxed">
              The base silhouette. Clean lines, sharp proportions — the starting
              point of every Cove drop. As you scroll, the story builds from a
              single layer into a full look.
            </p>
          </div>

          {/* Image + story layout */}
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)] gap-8 lg:gap-10 items-center">
            {/* Left card / image */}
            <div className="flex justify-center">
              <div className="relative w-[260px] sm:w-[280px] md:w-[320px] h-[360px] sm:h-[380px] md:h-[420px] rounded-[32px] bg-[#ffe7d2] shadow-[0_28px_80px_rgba(0,0,0,0.35)] overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.65)_0,transparent_50%),radial-gradient(circle_at_80%_100%,rgba(255,190,160,0.8)_0,transparent_55%)]" />
                <div className="relative h-full flex flex-col items-center justify-end pb-10 px-8 text-center">
                  <p className="text-xs tracking-[0.25em] uppercase text-black/60 mb-2">
                    Base Layer
                  </p>
                  <p className="font-semibold text-lg sm:text-xl tracking-wide">
                    Cove Everyday Crew
                  </p>
                  <p className="text-xs mt-2 text-black/70 max-w-[14rem]">
                    Soft 360&nbsp;GSM fleece, cut to skim — not squeeze. The
                    silhouette that anchors the whole drop.
                  </p>
                </div>
              </div>
            </div>

            {/* Middle story text */}
            <div className="order-first lg:order-none text-center lg:text-left px-1">
              <p className="text-[10px] sm:text-xs tracking-[0.3em] uppercase text-black/60">
                Story
              </p>
              <h3 className="mt-3 text-lg sm:text-xl font-semibold tracking-wide">
                From single look to full story.
              </h3>
              <p className="mt-3 text-sm sm:text-base text-black/80 leading-relaxed">
                First you meet the form — shoulders, fall, the way fabric hangs
                on air. Then the contrast steps in: matte fleece against muted
                technical shell, front view against the memory of the back.
              </p>
              <p className="mt-3 text-sm sm:text-base text-black/75 leading-relaxed">
                By the time you reach the bottom of this chapter, the fit should
                feel inevitable — like it always belonged in your rotation.
              </p>
            </div>

            {/* Right card / image */}
            <div className="flex justify-center">
              <div className="relative w-[260px] sm:w-[280px] md:w-[320px] h-[360px] sm:h-[380px] md:h-[420px] rounded-[32px] bg-[#f8d2c1] shadow-[0_28px_80px_rgba(0,0,0,0.35)] overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.55)_0,transparent_50%),radial-gradient(circle_at_10%_100%,rgba(255,160,140,0.85)_0,transparent_55%)]" />
                <div className="relative h-full flex flex-col items-center justify-end pb-10 px-8 text-center">
                  <p className="text-xs tracking-[0.25em] uppercase text-black/60 mb-2">
                    Outer Shell
                  </p>
                  <p className="font-semibold text-lg sm:text-xl tracking-wide">
                    Xpore Bomber
                  </p>
                  <p className="text-xs mt-2 text-black/70 max-w-[14rem]">
                    Water-resistant cotton shell with subtle emboss. Built to
                    sit cleanly over hoodies, crews, and everything in between.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
