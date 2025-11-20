'use client'

import { motion } from 'framer-motion'
import type { CatalogCardDTO } from '@/types/catalog'

interface CatalogDetailPanelProps {
  card: CatalogCardDTO
  selectedVariantId?: string
  onClose: () => void
}

export default function CatalogDetailPanel({
  card,
  selectedVariantId,
  onClose,
}: CatalogDetailPanelProps) {
  const activeColor =
    card.colors.find((c) => c.variantId === selectedVariantId) ??
    card.colors[0]

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="
        absolute right-6 top-1/2 -translate-y-1/2
        z-40
        w-[46%] max-w-xl
        h-[74%]
        rounded-3xl
        bg-slate-950/90
        border border-white/12
        shadow-[0_18px_45px_rgba(0,0,0,0.6)]
        px-6 py-5
        flex flex-col
        overflow-hidden
      "
    >
      {/* Header row: breadcrumb + close */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.26em] text-slate-400">
            {card.tier.toUpperCase()} · {card.type.toUpperCase()}
          </span>
          <h3 className="text-lg font-semibold text-slate-50 leading-snug">
            {card.name}
          </h3>
          <span className="text-[11px] text-slate-400">
            {card.material} · {card.gender} · {card.fit}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="
            h-8 w-8 rounded-full
            bg-slate-900/70
            text-slate-100
            flex items-center justify-center
            text-sm
            hover:bg-slate-800 transition
          "
        >
          ✕
        </button>
      </div>

      {/* Price + color chip */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-base font-semibold text-slate-50">
            €{card.price.toFixed(2)}
          </span>
          <span className="text-[11px] text-slate-400">incl. VAT</span>
        </div>

        {activeColor && (
          <div className="flex items-center gap-2 text-[11px] text-slate-300">
            <div
              className="h-5 w-5 rounded-full border border-white/30"
              style={{ backgroundColor: activeColor.hex ?? '#000000' }}
            />
            <span>{activeColor.colorName ?? 'Selected color'}</span>
          </div>
        )}
      </div>

      {/* Placeholder body – we’ll replace with real controls later */}
      <div className="flex-1 overflow-y-auto pr-1 text-[12px] leading-relaxed text-slate-300 space-y-3">
        <p>
          (Placeholder layout) – this panel will show size selector, color
          options, quantity, main actions, and a compact description. For now
          it&apos;s only here so we can perfect the layout and motion.
        </p>
        <p className="text-slate-400">
          Product group: <span className="font-medium text-slate-200">{card.groupId}</span>
        </p>
      </div>
    </motion.div>
  )
}
