'use client'

interface DimensionBlockProps {
  label: string           // e.g. "Type"
  values: string[]        // e.g. ["hoodie", "tshirt", ...]
  activeValue: string | null
  onSelect: (value: string | null) => void
}

export default function DimensionBlock({
  label,
  values,
  activeValue,
  onSelect,
}: DimensionBlockProps) {
  return (
    <div className="rounded-2xl bg-slate-900/80 border border-white/5 px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">
        {label}
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        {/* "All" chip */}
        <button
          className={`
            px-3 py-1 text-[11px] rounded-full border transition
            ${
              activeValue === null
                ? 'bg-slate-50 text-slate-900 border-slate-50'
                : 'border-slate-500 text-slate-100 hover:border-slate-200'
            }
          `}
          onClick={() => onSelect(null)}
        >
          All
        </button>

        {values.map((value) => (
          <button
            key={value}
            className={`
              px-3 py-1 text-[11px] rounded-full border transition
              ${
                activeValue === value
                  ? 'bg-slate-50 text-slate-900 border-slate-50'
                  : 'border-slate-500 text-slate-100 hover:border-slate-200'
              }
            `}
            onClick={() => onSelect(value)}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  )
}
