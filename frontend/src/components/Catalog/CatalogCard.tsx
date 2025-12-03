
// // src/components/Catalog/CatalogCard.tsx
// 'use client'

// import { useEffect, useState } from 'react'
// import CatalogCardBase from './CatalogCardBase'
// import { useModal } from '@/src/context/ModalContext'
// import { colorThemes, colorNameToThemeKey } from '@/utils/colorThemes'
// import type { CatalogCard as CatalogCardModel } from '@/types/product'
// import { getVariantMeta } from '@/data/variantMetaIndex'

// type CardMode = 'normal' | 'hero'

// interface CatalogCardProps extends CatalogCardModel {
//   layoutKey: string | number
//   isActive?: boolean
//   selectedVariantId?: string
//   mode?: CardMode
//   onToggleExpand?: () => void
//   onVariantChange?: (variantId: string) => void
// }

// export default function CatalogCard({
//   layoutKey,
//   id,
//   name,
//   tier,
//   type,
//   material,
//   description,
//   price,
//   colors,
//   sizes,
//   gender,
//   fit,
//   selectedVariantId,
//   isActive = true,
//   mode = 'normal',
//   onToggleExpand,
//   onVariantChange,
// }: CatalogCardProps) {
//   const { openModal } = useModal()

//   // ---------- COLOR STATE ----------
//   const initialIndex = selectedVariantId
//     ? Math.max(0, colors.findIndex((c) => c.variantId === selectedVariantId))
//     : 0

//   const [selectedColorIndex, setSelectedColorIndex] = useState(initialIndex)

//   useEffect(() => {
//     if (!selectedVariantId) return
//     const idx = colors.findIndex((c) => c.variantId === selectedVariantId)
//     if (idx >= 0 && idx !== selectedColorIndex) {
//       setSelectedColorIndex(idx)
//     }
//   }, [selectedVariantId, colors, selectedColorIndex])

//   const selectedColor = colors[selectedColorIndex] ?? colors[0]

//   // ---------- ACTIVE IMAGE (thumbnails) ----------
//   const [activeImageIndex, setActiveImageIndex] = useState(0)

//   // reset image index when colour changes
//   useEffect(() => {
//     setActiveImageIndex(0)
//   }, [selectedColor.variantId])

//   const heroImage =
//     selectedColor.images[activeImageIndex] ?? selectedColor.images[0]

//   // ---------- THEME ----------
//   const themeKeyKey = selectedColor.colorName ?? 'default'
//   const themeKey = colorNameToThemeKey[themeKeyKey] || 'cosmic'
//   const theme = colorThemes[themeKey]

//   // Base colour for gradient – fall back if hex missing
//   const primaryHex = selectedColor.hex ?? '#dbe3f1'

//   // ---------- GSM / META LINE ----------
//   const variantMeta = getVariantMeta(selectedColor.variantId)
//   const gsm = variantMeta?.gsm

//   const metaLine = [
//     type,
//     gsm ? `${gsm} GSM` : null,
//     fit,
//   ]
//     .filter(Boolean)
//     .join(' · ')

//   // ---------- MODAL OPEN (old animation) ----------
//   const handleBrowse = () => {
//     if (!isActive) return

//     if (onToggleExpand) {
//       onToggleExpand()
//       return
//     }

//     // Fallback: open detail modal with pre-selected size + qty
//     openModal({
//       layoutKey: layoutKey.toString(),
//       id,
//       name,
//       description,
//       tier,
//       material,
//       type,
//       price,
//       colors,
//       sizes,
//       selectedVariantId: selectedColor.variantId,
//       gender,
//       fit,
//       selectedSize: null,
//       initialQuantity: 1,
//     })
//   }

//   return (
//     <CatalogCardBase
//       layoutKey={layoutKey}
//       name={name}
//       images={selectedColor.images}
//       heroImage={heroImage}
//       tier={tier}
//       type={type}
//       metaLine={metaLine}
//       price={price}
//       primaryHex={primaryHex}
//       theme={theme}
//       selectedVariantId={selectedColor.variantId}
//       isActive={isActive}
//       mode={mode}
//       activeImageIndex={activeImageIndex}
//       onActiveImageChange={setActiveImageIndex}
//       onBrowseClick={handleBrowse}
//     />
//   )
// }


// src/components/Catalog/CatalogCard.tsx
'use client'

import { useEffect, useState } from 'react'
import CatalogCardBase from './CatalogCardBase'
import { useModal } from '@/src/context/ModalContext'
import { colorThemes, colorNameToThemeKey } from '@/utils/colorThemes'
import type { CatalogCard as CatalogCardModel } from '@/types/product'
import { getVariantMeta } from '@/data/variantMetaIndex'
import type { SuggestionVariant } from '@/src/components/ui/CoveSuggestionPill'

type CardMode = 'normal' | 'hero'

interface CatalogCardProps extends CatalogCardModel {
  layoutKey: string | number
  isActive?: boolean
  selectedVariantId?: string
  selectedSize?: string | null
  mode?: CardMode
  onToggleExpand?: () => void
  onVariantChange?: (variantId: string) => void
}

export default function CatalogCard({
  layoutKey,
  id,
  name,
  tier,
  type,
  material,
  description,
  price,
  colors,
  sizes,
  gender,
  fit,
  selectedVariantId,
  selectedSize,
  isActive = true,
  mode = 'normal',
  onToggleExpand,
  onVariantChange,
}: CatalogCardProps) {
  const { openModal } = useModal()

  // ---------- COLOR STATE ----------
  const initialIndex = selectedVariantId
    ? Math.max(0, colors.findIndex((c) => c.variantId === selectedVariantId))
    : 0

  const [selectedColorIndex, setSelectedColorIndex] = useState(initialIndex)

  useEffect(() => {
    if (!selectedVariantId) return
    const idx = colors.findIndex((c) => c.variantId === selectedVariantId)
    if (idx >= 0 && idx !== selectedColorIndex) {
      setSelectedColorIndex(idx)
    }
  }, [selectedVariantId, colors, selectedColorIndex])

  const selectedColor = colors[selectedColorIndex] ?? colors[0]

  // ---------- ACTIVE IMAGE ----------
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  useEffect(() => {
    setActiveImageIndex(0)
  }, [selectedColor.variantId])

  const heroImage =
    selectedColor.images[activeImageIndex] ?? selectedColor.images[0]

  // ---------- THEME ----------
  const themeKeyKey = selectedColor.colorName ?? 'default'
  const themeKey = colorNameToThemeKey[themeKeyKey] || 'cosmic'
  const theme = colorThemes[themeKey]

  const primaryHex = selectedColor.hex ?? '#dbe3f1'

  // ---------- GSM / META LINE ----------
  const variantMeta = getVariantMeta(selectedColor.variantId)
  const gsm = variantMeta?.gsm

  const metaLine = [
    type,
    gsm ? `${gsm} GSM` : null,
    fit,
  ]
    .filter(Boolean)
    .join(' · ')

  // ---------- PILL (depends on selected size ONLY) ----------
  const { pillLabel, pillVariant } = (() => {
    if (!selectedSize || !sizes) {
      return {
        pillLabel: null,
        pillVariant: null as SuggestionVariant | null,
      }
    }

    const sizeStock = (sizes as Record<string, number>)[selectedSize]

    if (typeof sizeStock !== 'number' || Number.isNaN(sizeStock)) {
      return {
        pillLabel: null,
        pillVariant: null as SuggestionVariant | null,
      }
    }

    if (sizeStock > 0 && sizeStock < 5) {
      return {
        pillLabel: 'Few left',
        pillVariant: 'few-left' as SuggestionVariant,
      }
    }

    if (sizeStock >= 5 && sizeStock < 10) {
      return {
        pillLabel: 'Hot pick',
        pillVariant: 'hot-pick' as SuggestionVariant,
      }
    }

    return {
      pillLabel: null,
      pillVariant: null as SuggestionVariant | null,
    }
  })()

  // ---------- MODAL OPEN ----------
  const handleBrowse = () => {
    if (!isActive) return

    if (onToggleExpand) {
      onToggleExpand()
      return
    }

    openModal({
      layoutKey: layoutKey.toString(),
      id,
      name,
      description,
      tier,
      material,
      type,
      price,
      colors,
      sizes,
      selectedVariantId: selectedColor.variantId,
      gender,
      fit,
      selectedSize: null,
      initialQuantity: 1,
    })
  }

  return (
    <CatalogCardBase
      layoutKey={layoutKey}
      name={name}
      images={selectedColor.images}
      heroImage={heroImage}
      tier={tier}
      type={type}
      metaLine={metaLine}
      price={price}
      primaryHex={primaryHex}
      theme={theme}
      selectedVariantId={selectedColor.variantId}
      isActive={isActive}
      mode={mode}
      activeImageIndex={activeImageIndex}
      onActiveImageChange={setActiveImageIndex}
      onBrowseClick={handleBrowse}
      pillLabel={pillLabel}
      pillVariant={pillVariant}
    />
  )
}
