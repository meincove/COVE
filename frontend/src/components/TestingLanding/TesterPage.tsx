

"use client";

import AuroraShader from "@/components/ui/AuroraShader";

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

          <div className="relative z-10 max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 text-center flex flex-col items-center gap-2 sm:gap-3 md:gap-4">
            {/* Top label */}
            <p className="text-xs sm:text-sm md:text-base font-semibold text-neutral-500 tracking-[0.12em] sm:tracking-[0.15em] md:tracking-[0.18em] uppercase">
              Our infra, your structure
            </p>

            {/* Main title */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl 2xl:text-9xl font-bold tracking-tight">
              Cove AI
            </h1>

            {/* Soft subheading */}
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-neutral-700 mt-1">
              Want to take a sneak peek?
            </p>

            {/* CTA button */}
            <button
              type="button"
              className="
      mt-4 sm:mt-5 md:mt-6 inline-flex items-center justify-center
      rounded-full
      bg-black px-6 sm:px-8 md:px-10 lg:px-12 py-2.5 sm:py-3 md:py-3.5 lg:py-4
      text-sm sm:text-base md:text-lg font-normal
      text-white
      cursor-pointer
      transition-colors duration-300 ease-out
      hover:bg-gray-200 hover:text-neutral-900 hover:font-semibold
      active:scale-95
      min-h-[44px]
    "
            >
              TRY ME
            </button>

            {/* Playful bottom lines */}
            <p className="mt-3 sm:mt-4 text-xs sm:text-sm md:text-base text-neutral-400">
              Me? An assistant? A bot?
            </p>
            <p className="text-xs sm:text-sm md:text-base font-semibold text-neutral-600">
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
      <div className="grid grid-cols-12 gap-3 sm:gap-4 md:gap-6 p-4 sm:p-5 md:p-6 bg-gradient-to-b from-neutral-50/90 via-white to-neutral-50/90">
        {/* left column - hidden on mobile, visible on tablet+ */}
        <div className="col-span-12 sm:col-span-4 md:col-span-3 flex flex-col gap-3">
          <div className="h-12 sm:h-14 md:h-16 rounded-xl bg-neutral-100" />
          <div className="h-12 sm:h-14 md:h-16 rounded-xl bg-neutral-100" />
          <div className="h-12 sm:h-14 md:h-16 rounded-xl bg-neutral-100 hidden sm:block" />
          <div className="h-12 sm:h-14 md:h-16 rounded-xl bg-neutral-100 hidden md:block" />
        </div>

        {/* center column */}
        <div className="col-span-12 sm:col-span-8 md:col-span-6 flex flex-col gap-3 sm:gap-4">
          <div className="h-40 sm:h-44 md:h-48 lg:h-56 rounded-2xl bg-neutral-100" />
          <div className="h-2.5 sm:h-3 w-32 sm:w-36 md:w-40 rounded-full bg-neutral-200" />
          <div className="h-2.5 sm:h-3 w-52 sm:w-60 md:w-64 rounded-full bg-neutral-200" />
          <div className="h-2.5 sm:h-3 w-44 sm:w-48 md:w-52 rounded-full bg-neutral-200" />
          <div className="mt-3 sm:mt-4 flex flex-wrap gap-2 sm:gap-3">
            <div className="h-7 sm:h-8 w-24 sm:w-28 rounded-full bg-neutral-100" />
            <div className="h-7 sm:h-8 w-16 sm:w-20 rounded-full bg-neutral-100" />
            <div className="h-7 sm:h-8 w-20 sm:w-24 rounded-full bg-neutral-100" />
          </div>
        </div>

        {/* right chat column */}
        <div className="col-span-12 md:col-span-3 flex flex-col gap-2 sm:gap-3">
          <div className="self-end max-w-[90%] rounded-2xl bg-black text-white text-xs sm:text-sm px-3 py-2 shadow-md">
            Looking for a carry-on suitcase
          </div>
          <div className="max-w-[90%] rounded-2xl bg-neutral-100 text-[11px] sm:text-xs px-3 py-2 shadow-sm">
            Do you prefer a soft shell or hard shell?
          </div>
          <div className="self-end max-w-[85%] rounded-2xl bg-black text-white text-[11px] sm:text-xs px-3 py-2 shadow-md">
            Soft shell, cabin size, under 3kg.
          </div>
        </div>
      </div>
    </div>
  );
}

