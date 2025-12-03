'use client'

import { Flame, Hourglass, Sparkles } from 'lucide-react'

export type SuggestionVariant =
  | 'few-left'
  | 'hot-pick'
  | 'recommendation'

interface CoveSuggestionPillProps {
  label: string
  variant: SuggestionVariant
}

export default function CoveSuggestionPill({
  label,
  variant,
}: CoveSuggestionPillProps) {
  let Icon = Sparkles

  if (variant === 'few-left') Icon = Hourglass
  if (variant === 'hot-pick') Icon = Flame

  return (
    <div
      className="
        inline-flex items-center gap-1.5
        rounded-full bg-white
        px-3 py-1
        text-[10px] font-semibold uppercase
        tracking-[0.16em] text-black
        shadow-sm
      "
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </div>
  )
}
