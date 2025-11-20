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

  const sizeEntries = card.sizes
    ? Object.entries(card.sizes) as [string, number][]
    : []

  return (

    <motion.div
    initial={{ opacity: 0, x: -100 }}
    animate={{ opacity: 1, x: -50 }}
    exit={{ opacity: 0, x: -120 }}
    transition={{
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
    }}
    className="
      absolute
      top-1/2 -translate-y-1/2
      right-[0%]              /* how far from right edge of yellow area */
      z-20

      w-[52.5%]   
      h-[86%]               

      rounded-[24px]
      bg-white
      border border-slate-100
      shadow-[0_28px_60px_rgba(15,23,42,0.38)]
      px-6 md:px-8 lg:px-10
      py-4 md:py-6 lg:py-8
      flex flex-col
      gap-6
      text-slate-900
    "
  >
      {/* SECTION 1 — Info header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.26em] text-slate-500">
            {card.tier.toUpperCase()} · {card.type.toUpperCase()}
          </span>
          <h3 className="text-lg font-semibold leading-snug">
            {card.name}
          </h3>
          <span className="text-[11px] text-slate-500">
            {card.material} · {card.gender} · {card.fit}
          </span>
        </div>

        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="
            h-8 w-8 rounded-full
            bg-slate-900 text-white
            flex items-center justify-center
            text-sm
            hover:bg-black transition
          "
        >
          ✕
        </button>
      </div>

      {/* Price + color pill */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-semibold">
            €{card.price.toFixed(2)}
          </span>
          <span className="text-[11px] text-slate-500">incl. VAT</span>
        </div>

        {activeColor && (
          <div className="flex items-center gap-2 text-[11px] text-slate-700">
            <div
              className="h-5 w-5 rounded-full border border-slate-300"
              style={{ backgroundColor: activeColor.hex ?? '#000000' }}
            />
            <span>{activeColor.colorName ?? 'Selected colour'}</span>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 pt-4 flex-1 flex flex-col gap-5 overflow-y-auto pr-1">
        {/* SECTION 2 — Sizes + Colours */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Sizes & Colours
          </h4>

          {/* Sizes */}
          {sizeEntries.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {sizeEntries.map(([size, stock]) => (
                <div
                  key={size}
                  className={`
                    px-3 py-1.5 rounded-full border text-[11px]
                    ${stock > 0
                      ? 'border-slate-300 text-slate-800 bg-slate-50'
                      : 'border-slate-200 text-slate-400 bg-slate-100/70 line-through'
                    }
                  `}
                >
                  {size}
                  {stock > 0 && (
                    <span className="ml-1 text-[10px] text-slate-400">
                      ({stock})
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Colours */}
          {card.colors.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              {card.colors.map((color) => {
                const isActive = color.variantId === selectedVariantId
                return (
                  <button
                    key={color.variantId}
                    type="button"
                    className={`
                      flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-[11px]
                      ${isActive
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-300 bg-white text-slate-800 hover:border-slate-500'
                      }
                    `}
                  >
                    <span
                      className="h-4 w-4 rounded-full border border-slate-200"
                      style={{ backgroundColor: color.hex ?? '#000000' }}
                    />
                    <span>{color.colorName ?? 'Colour'}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* SECTION 3 — Actions */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Actions
          </h4>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-medium hover:bg-black transition"
            >
              Go to store
            </button>

            <button
              type="button"
              className="px-4 py-2 rounded-full border border-slate-900 text-xs font-medium hover:bg-slate-900 hover:text-white transition"
            >
              Add to cart
            </button>

            <button
              type="button"
              className="px-4 py-2 rounded-full border border-slate-400 text-xs text-slate-800 hover:border-slate-900 transition"
            >
              Buy on
            </button>

            <button
              type="button"
              className="px-4 py-2 rounded-full border border-slate-300 text-xs text-slate-800 hover:border-slate-900 transition"
            >
              Add to wishlist
            </button>

            <button
              type="button"
              className="px-4 py-2 rounded-full border border-slate-300 text-xs text-slate-800 hover:border-slate-900 transition"
            >
              Ask Cove
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
