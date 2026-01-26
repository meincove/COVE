// src/components/CatalogDummyComponents/CatalogTierSection.tsx
'use client'

import { useEffect, useState, useMemo } from 'react'
import { useInView } from 'react-intersection-observer'
import { motion } from 'framer-motion'
import localFont from 'next/font/local'

import {
  applyTierFilters,
  getAvailableValuesForDimension,
} from '@/lib/catalogFilterBrain'
import type { CatalogCard } from '@/types/product'
import type { TierFilterState, TierKey } from '@/types/filters'
import CarouselStage from './CarouselStage'

interface CatalogTierSectionProps {
  tierKey: TierKey
  index: number
  title: string
  description: string
  cards: CatalogCard[]
  filtersForTier: TierFilterState
  updateFilters: (updater: (prev: TierFilterState) => TierFilterState) => void
  onInView?: (tierKey: TierKey) => void
  sectionRef?: (el: HTMLDivElement | null) => void
  hideFilters?: boolean
}

type TierTheme = {
  mainBg: string
  edgeBg: string
  textBg: string
  textColor: string
}

// ✅ Bubbly font (put Atop-R99O3.ttf in /public/fonts/)
const bubblyFont = localFont({
  src: '../../fonts/Atop-R99O3.ttf',
  variable: '--font-bubbly',
  display: 'swap',
})


// 🎨 Theme map – center + edge colors per tier
export const DUMMY_TIER_THEME: Record<string, TierTheme> = {
  casual: {
    mainBg: '#430078',
    edgeBg: '#2f0055',
    textBg: 'rgba(114, 0, 204, 0.92)',
    textColor: '#ffffff',
  },
  originals: {
    mainBg: '#c23217',
    edgeBg: '#7f2210',
    textBg: 'rgba(204, 90, 63, 0.92)',
    textColor: '#ffffff',
  },
  designer: {
    mainBg: '#3b7a66',
    edgeBg: '#285347',
    textBg: 'rgba(56, 199, 144, 0.92)',
    textColor: '#ffffff',
  },
  limited: {
    mainBg: '#81837c',
    edgeBg: '#565853',
    textBg: 'rgba(70, 71, 67, 0.92)',
    textColor: '#ffffff',
  },
}

export const DEFAULT_TIER_THEME: TierTheme = {
  mainBg: '#111827',
  edgeBg: '#020617',
  textBg: 'rgba(31,41,55,0.9)',
  textColor: '#ffffff',
}

// Tier display names + short taglines
const TIER_TITLES: Record<string, string> = {
  casual: 'Casual',
  originals: 'Originals',
  designer: 'Designer',
  limited: 'Limited',
}

const TIER_TAGLINES: Record<string, string> = {
  casual: 'Everyday premium basics',
  originals: 'Bold reimagined classics',
  designer: 'Street-tailored luxury',
  limited: 'Drops that disappear',
}

const formatTierLabel = (tierKey: string) =>
  tierKey.charAt(0).toUpperCase() + tierKey.slice(1)

type Phase = 'idle' | 'scatter' | 'assemble'

interface ExplodingMorphTextProps {
  text: string
  triggerKey: string
  className?: string
}

/**
 * Exploding / re-assembling text.
 * - Every character gets its own random radius, angle, delay, and scale.
 * - Scatter stays visually inside the container (overflow-hidden on parent).
 */
function ExplodingMorphText({
  text,
  triggerKey,
  className,
}: ExplodingMorphTextProps) {
  const [phase, setPhase] = useState<Phase>('idle')

  const chars = useMemo(() => text.split(''), [text])

  type LetterMeta = {
    x: number
    y: number
    rotate: number
    delay: number
    scale: number
  }

  const meta: LetterMeta[] = useMemo(
    () =>
      chars.map(() => {
        // random radius & angle for more organic scatter
        const radius = 60 + Math.random() * 260 // some close, some far
        const angle = Math.random() * Math.PI * 2
        const x = Math.cos(angle) * radius
        const y = Math.sin(angle) * radius * 0.6 // slightly flatter vertically

        return {
          x,
          y,
          rotate: (Math.random() - 0.5) * 80,
          delay: Math.random() * 0.18, // each char starts at a different time
          scale: 0.9 + Math.random() * 0.5,
        }
      }),
    [chars.length, triggerKey]
  )

  // Trigger scatter → assemble on change
  useEffect(() => {
    setPhase('scatter')

    const toAssemble = setTimeout(() => setPhase('assemble'), 380)
    const toIdle = setTimeout(() => setPhase('idle'), 1150)

    return () => {
      clearTimeout(toAssemble)
      clearTimeout(toIdle)
    }
  }, [triggerKey, text])

  const palette = ['#ff7ac4', '#6be3ff', '#ffd35a', '#c38bff', '#4be090']

  return (
    <span className={`relative inline-flex flex-wrap ${className ?? ''}`}>
      {chars.map((ch, index) => {
        const isSpace = ch === ' '
        const m = meta[index] ?? {
          x: 0,
          y: 0,
          rotate: 0,
          delay: 0,
          scale: 1,
        }

        const animate =
          phase === 'scatter'
            ? {
              x: m.x,
              y: m.y,
              scale: m.scale,
              rotate: m.rotate,
            }
            : {
              x: 0,
              y: 0,
              scale: 1,
              rotate: 0,
            }

        return (
          <motion.span
            key={`${triggerKey}-${index}-${ch}`}
            initial={{ x: 0, y: 0, scale: 1, rotate: 0 }}
            animate={animate}
            transition={{
              duration: phase === 'scatter' ? 0.55 : 0.8,
              ease: 'easeOut',
              delay: m.delay,
            }}
            className="inline-block"
            style={{
              whiteSpace: isSpace ? 'pre' : 'normal',
              color: isSpace ? undefined : palette[index % palette.length],
              textShadow: isSpace
                ? undefined
                : '0 8px 0 rgba(0,0,0,0.25), 0 16px 14px rgba(0,0,0,0.22)',
              WebkitTextStroke: isSpace ? undefined : '1px rgba(0,0,0,0.15)',
            }}
          >
            {isSpace ? '\u00A0' : ch}
          </motion.span>
        )
      })}
    </span>
  )
}

export default function CatalogTierSection({
  tierKey,
  index,
  title,
  description,
  cards,
  filtersForTier,
  updateFilters,
  onInView,
  sectionRef,
  hideFilters = false,
}: CatalogTierSectionProps) {
  const activeType = filtersForTier.type ?? null
  const activeFit = filtersForTier.fit ?? null
  const activeMaterial = filtersForTier.material ?? null

  const [isFilterOpen, setIsFilterOpen] = useState(!hideFilters)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)

  const { ref: inViewRef, inView } = useInView({
    threshold: 0.55,
    triggerOnce: false,
  })

  useEffect(() => {
    if (inView && onInView) onInView(tierKey)
  }, [inView, onInView, tierKey])

  const combinedRef = (node: HTMLDivElement | null) => {
    inViewRef(node)
    if (sectionRef) sectionRef(node)
  }

  const theme = DUMMY_TIER_THEME[tierKey as string] ?? DEFAULT_TIER_THEME
  const tierLabel = formatTierLabel(tierKey)

  // these are what actually show in the card
  const displayTitle =
    TIER_TITLES[tierKey as string] ?? tierLabel

  const displayTagline =
    TIER_TAGLINES[tierKey as string] ?? 'Explore the collection'


  /* ---------------- FILTER DATA ---------------- */

  const availableTypes = getAvailableValuesForDimension(
    cards,
    filtersForTier,
    'type'
  )
  const availableFits = getAvailableValuesForDimension(
    cards,
    filtersForTier,
    'fit'
  )
  const availableMaterials = getAvailableValuesForDimension(
    cards,
    filtersForTier,
    'material'
  )

  const handleAdvancedTypeClick = (value: string | null) => {
    updateFilters((prev) => ({
      ...prev,
      type: value,
    }))
  }

  const handleAdvancedFitClick = (value: string | null) => {
    updateFilters((prev) => ({
      ...prev,
      fit: value,
    }))
  }

  const handleAdvancedMaterialClick = (value: string | null) => {
    updateFilters((prev) => ({
      ...prev,
      material: value,
    }))
  }

  const filteredCards = applyTierFilters(cards, filtersForTier)

  return (
    <section
      ref={combinedRef}
      className="
        relative w-full min-h-screen
        flex flex-col
      "
    >
      {/* TITLE + TAGLINE in centered, squarish container */}
      <div className="w-full px-6 pt-10 pb-6 min-h-[24vh] flex items-center justify-center">
        <div
          className={`
            max-w-xl w-full mx-auto
            rounded-[32px]
            px-6 py-6 md:px-8 md:py-8
            shadow-lg shadow-black/25
            border border-white/10
            overflow-hidden
            flex flex-col items-center justify-center text-center
            ${bubblyFont.className}
          `}
          style={{
            backgroundColor: theme.textBg,
            color: theme.textColor,
          }}
        >
          <div className="space-y-3">
            {/* Row 1: Tier name */}
            <h2 className="text-4xl md:text-5xl font-semibold leading-tight">
              <ExplodingMorphText
                text={displayTitle}
                triggerKey={`${tierKey}-title-${displayTitle}`}
              />
            </h2>

            {/* Row 2: Short tagline */}
            <p className="text-lg md:text-xl font-medium leading-snug">
              <ExplodingMorphText
                text={displayTagline}
                triggerKey={`${tierKey}-tagline-${displayTagline}`}
              />
            </p>
          </div>
        </div>
      </div>

      {/* CAROUSEL AREA – unchanged */}
      <div className="flex-1 w-full flex items-center justify-center">
        <div className="w-full max-w-6xl mx-auto h-full">
          <CarouselStage
            cards={filteredCards}
            sectionKey={`carousel-${index}-${tierKey}-${activeType ?? 'ALL'}-${activeFit ?? 'ALL'
              }-${activeMaterial ?? 'ALL'}`}
            tierLabel={tierLabel}
            filtersForTier={filtersForTier}
            availableTypes={availableTypes}
            availableFits={availableFits}
            availableMaterials={availableMaterials}
            onTypeChange={handleAdvancedTypeClick}
            onFitChange={handleAdvancedFitClick}
            onMaterialChange={handleAdvancedMaterialClick}
            isFilterOpen={isFilterOpen}
          />
        </div>
      </div>

      {/* FILTER CONTROLS / ADVANCED – same as before */}
      {!hideFilters && (
        <div className="w-full sticky bottom-6 z-20 flex justify-center pointer-events-none">
          <div
            className="
              flex gap-3
              rounded-full
              bg-slate-900/5
              backdrop-blur-sm
              px-3 py-1.5
              pointer-events-auto
            "
          >
            <button
              type="button"
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className="
                text-xs px-4 py-1.5 rounded-full
                border border-slate-500/60
                bg-slate-900 text-slate-50
                hover:border-slate-200 transition
              "
            >
              {isFilterOpen ? 'Hide filters' : 'Show filters'}
            </button>

            <button
              type="button"
              onClick={() => setIsAdvancedOpen((prev) => !prev)}
              className="
                text-xs px-4 py-1.5 rounded-full
                border border-slate-500/60
                bg-white/80 text-slate-900
                hover:border-slate-900 transition
              "
            >
              {isAdvancedOpen ? 'Close advanced' : 'Open advanced'}
            </button>
          </div>
        </div>
      )}

      {!hideFilters && isAdvancedOpen && (
        <div className="w-full max-w-5xl mx-auto mb-10 mt-4 rounded-2xl border border-slate-500/30 bg-slate-900/80 px-6 py-4 space-y-4 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-100/80">
            Refine {formatTierLabel(tierKey)} filters
          </p>

          {/* TYPE row */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
              Type
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                className={`px-3 py-1 text-xs rounded-full border ${activeType == null
                    ? 'bg-white text-slate-900 border-white'
                    : 'border-slate-500 text-slate-100 hover:border-white'
                  }`}
                onClick={() => handleAdvancedTypeClick(null)}
              >
                All types
              </button>
              {availableTypes.map((type) => (
                <button
                  key={type}
                  className={`px-3 py-1 text-xs rounded-full border ${activeType === type
                      ? 'bg-white text-slate-900 border-white'
                      : 'border-slate-500 text-slate-100 hover:border-white'
                    }`}
                  onClick={() => handleAdvancedTypeClick(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* FIT row */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
              Fit
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                className={`px-3 py-1 text-xs rounded-full border ${activeFit == null
                    ? 'bg-white text-slate-900 border-white'
                    : 'border-slate-500 text-slate-100 hover:border-white'
                  }`}
                onClick={() => handleAdvancedFitClick(null)}
              >
                All fits
              </button>
              {availableFits.map((fit) => (
                <button
                  key={fit}
                  className={`px-3 py-1 text-xs rounded-full border ${activeFit === fit
                      ? 'bg-white text-slate-900 border-white'
                      : 'border-slate-500 text-slate-100 hover:border-white'
                    }`}
                  onClick={() => handleAdvancedFitClick(fit)}
                >
                  {fit}
                </button>
              ))}
            </div>
          </div>

          {/* MATERIAL row */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
              Material
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                className={`px-3 py-1 text-xs rounded-full border ${activeMaterial == null
                    ? 'bg-white text-slate-900 border-white'
                    : 'border-slate-500 text-slate-100 hover:border-white'
                  }`}
                onClick={() => handleAdvancedMaterialClick(null)}
              >
                All materials
              </button>
              {availableMaterials.map((mat) => (
                <button
                  key={mat}
                  className={`px-3 py-1 text-xs rounded-full border ${activeMaterial === mat
                      ? 'bg-white text-slate-900 border-white'
                      : 'border-slate-500 text-slate-100 hover:border-white'
                    }`}
                  onClick={() => handleAdvancedMaterialClick(mat)}
                >
                  {mat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
