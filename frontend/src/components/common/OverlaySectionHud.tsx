'use client'

type SectionItem = {
  id: string
  label: string
}

interface OverlaySectionHudProps {
  sections: SectionItem[]
  activeId: string | null
  onSelect: (id: string) => void
}

export default function OverlaySectionHud({
  sections,
  activeId,
  onSelect,
}: OverlaySectionHudProps) {
  if (!sections.length) return null

  return (
    <div
      className="
        fixed left-1/2 bottom-6 -translate-x-1/2
        z-50
        flex items-center gap-2
        px-3 py-2
        rounded-full
        bg-black/70
        border border-white/15
        backdrop-blur-xl
      "
    >
      {sections.map((section) => {
        const isActive = section.id === activeId
        return (
          <button
            key={section.id}
            onClick={() => onSelect(section.id)}
            className={`
              text-xs md:text-sm font-medium px-3 py-1 rounded-full transition
              ${
                isActive
                  ? 'bg-white text-black shadow-sm'
                  : 'bg-transparent text-gray-200 hover:bg-white/10'
              }
            `}
          >
            {section.label}
          </button>
        )
      })}
    </div>
  )
}
