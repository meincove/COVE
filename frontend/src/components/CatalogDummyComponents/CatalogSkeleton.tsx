// src/components/catalog/CatalogSkeleton.tsx
'use client'

export default function CatalogSkeleton() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div
        className="
          w-[min(1100px,100%)]
          h-[min(520px,70vh)]
          rounded-[32px]
          bg-slate-900/3
          border border-slate-200/60
          shadow-[0_24px_50px_rgba(15,23,42,0.28)]
          flex gap-6
          px-6 py-6
          animate-pulse
        "
      >
        {/* Left – fake card */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-[70%] h-[80%] rounded-[28px] bg-slate-200/60" />
        </div>

        {/* Right – fake modal / info */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="h-3 w-24 rounded-full bg-slate-200/80" />
          <div className="h-5 w-48 rounded-full bg-slate-200/80" />
          <div className="h-3 w-40 rounded-full bg-slate-200/70" />

          <div className="mt-3 h-[1px] w-full bg-slate-200/70" />

          <div className="flex flex-wrap gap-2 mt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-8 w-16 rounded-full bg-slate-200/70"
              />
            ))}
          </div>

          <div className="flex gap-3 mt-4">
            <div className="h-9 flex-1 rounded-full bg-slate-200/80" />
            <div className="h-9 flex-1 rounded-full bg-slate-200/60" />
          </div>
        </div>
      </div>
    </div>
  )
}
