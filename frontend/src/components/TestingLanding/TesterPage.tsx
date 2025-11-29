

"use client";

import AuroraShader from "@/src/components/ui/AuroraShader";

export default function TesterPage() {
  return (
    <div className="relative bg-white text-neutral-900">
      <main>
        {/* ============== HERO ============== */}
        <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden">
        {/* Animated background – fills the section but sits behind content */}
        <div className="absolute inset-0 h-[100vh] z-0 pointer-events-none">
          <AuroraShader
            colorStops={["#22c55e", "#a855f7", "#eab308"]}
            amplitude={1.2}
            blend={0.9}
            speed={1.0}
            centerY={0.8}
            scale={1.65}
          />
        </div>

          

          {/* Center text */}
          
<div className="relative z-10 max-w-3xl mx-auto px-6 text-center flex flex-col items-center gap-2 sm:gap-3">
  {/* Top label */}
  <p className="text-xl sm:text-sm font-semibold text-neutral-500 tracking-[0.18em] uppercase">
    Our infra, your structure
  </p>

  {/* Main title */}
  <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight">
    Cove AI
  </h1>

  {/* Soft subheading */}
  <p className="text-base sm:text-lg text-neutral-700 mt-1">
    Want to take a sneak peek?
  </p>

  {/* CTA button */}
  <button
    type="button"
    className="
      mt-4 inline-flex items-center justify-center
      rounded-full
      bg-black px-8 py-3
      text-sm sm:text-base font-normal
      text-white
      cursor-pointer
      transition-colors duration-300 ease-out
      hover:bg-gray-200 hover:text-neutral-900 hover:font-semibold
    "
  >
    TRY ME
  </button>

  {/* Playful bottom lines */}
  <p className="mt-3 text-xs sm:text-sm text-neutral-400">
    Me? An assistant? A bot?
  </p>
  <p className="text-xs sm:text-sm font-semibold text-neutral-600">
    Batman?
  </p>
</div>

        </section>

        {/* ============== SKELETON SECTION (continues down) ============== */}
        <section className="relative min-h-[120dvh] bg-white">
          {/* One skeleton panel that overlaps hero slightly (no hard break) */}
          <div className="relative w-full max-w-5xl mx-auto px-6 mt-[-18vh]">
            <LandingSkeleton />
          </div>

          <div className="max-w-3xl mx-auto px-6 mt-16 pb-24 text-sm text-neutral-600 space-y-3">
            <p>
              Placeholder content below the hero. We can swap this for real
              sections later.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ============== SKELETON BROWSER PANEL ============== */

function LandingSkeleton() {
  return (
    <div
      className="
        relative w-full rounded-[26px] bg-white/96
        shadow-[0_22px_60px_rgba(15,23,42,0.25)]
        ring-1 ring-white/70
        overflow-hidden
      "
    >
      {/* top chrome */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200/70 bg-neutral-50/90">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </div>
        <div className="h-6 w-56 rounded-full bg-neutral-200" />
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-5 rounded-md bg-neutral-200" />
          <span className="h-3 w-5 rounded-md bg-neutral-200" />
          <span className="h-3 w-5 rounded-md bg-neutral-200" />
        </div>
      </div>

      {/* main skeleton body */}
      <div className="grid grid-cols-12 gap-6 p-6 bg-gradient-to-b from-neutral-50/90 via-white to-neutral-50/90">
        {/* left column */}
        <div className="col-span-3 hidden md:flex flex-col gap-3">
          <div className="h-16 rounded-xl bg-neutral-100" />
          <div className="h-16 rounded-xl bg-neutral-100" />
          <div className="h-16 rounded-xl bg-neutral-100" />
          <div className="h-16 rounded-xl bg-neutral-100" />
        </div>

        {/* center column */}
        <div className="col-span-12 md:col-span-6 flex flex-col gap-4">
          <div className="h-48 rounded-2xl bg-neutral-100" />
          <div className="h-3 w-40 rounded-full bg-neutral-200" />
          <div className="h-3 w-64 rounded-full bg-neutral-200" />
          <div className="h-3 w-52 rounded-full bg-neutral-200" />
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="h-8 w-28 rounded-full bg-neutral-100" />
            <div className="h-8 w-20 rounded-full bg-neutral-100" />
            <div className="h-8 w-24 rounded-full bg-neutral-100" />
          </div>
        </div>

        {/* right chat column */}
        <div className="col-span-12 md:col-span-3 flex flex-col gap-3">
          <div className="self-end max-w-[90%] rounded-2xl bg-black text-white text-xs px-3 py-2 shadow-md">
            Looking for a carry-on suitcase
          </div>
          <div className="max-w-[90%] rounded-2xl bg-neutral-100 text-[11px] px-3 py-2 shadow-sm">
            Do you prefer a soft shell or hard shell?
          </div>
          <div className="self-end max-w-[85%] rounded-2xl bg-black text-white text-[11px] px-3 py-2 shadow-md">
            Soft shell, cabin size, under 3kg.
          </div>
        </div>
      </div>
    </div>
  );
}

