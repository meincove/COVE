// src/components/Catalog/CatalogCard.tsx
'use client'

import { useEffect, useState } from 'react'
import CatalogCardBase from './CatalogCardBase'
import { useModal } from '@/src/context/ModalContext'
import { colorThemes, colorNameToThemeKey } from '@/utils/colorThemes'
import type { CatalogCard as CatalogCardModel } from '@/types/product'

type CardMode = 'normal' | 'hero'

interface CatalogCardProps extends CatalogCardModel {
  layoutKey: string | number
  isActive?: boolean
  selectedVariantId?: string
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
  isActive = true,
  mode = 'normal',
  onToggleExpand,
  onVariantChange,
}: CatalogCardProps) {
  const { openModal } = useModal()

  // initial index from selectedVariantId, fallback 0
  const initialIndex = selectedVariantId
    ? Math.max(
        0,
        colors.findIndex((c) => c.variantId === selectedVariantId)
      )
    : 0

  const [selectedColorIndex, setSelectedColorIndex] =
    useState(initialIndex)

  // keep card in sync when parent changes variant
  useEffect(() => {
    if (!selectedVariantId) return
    const idx = colors.findIndex(
      (c) => c.variantId === selectedVariantId
    )
    if (idx >= 0 && idx !== selectedColorIndex) {
      setSelectedColorIndex(idx)
    }
  }, [selectedVariantId, colors, selectedColorIndex])

  const selectedColor = colors[selectedColorIndex] ?? colors[0]

  const themeKeyKey = selectedColor.colorName ?? 'default'
  const themeKey = colorNameToThemeKey[themeKeyKey] || 'cosmic'
  const theme = colorThemes[themeKey]

  return (
    <CatalogCardBase
      layoutKey={layoutKey}
      name={name}
      tier={tier}
      images={selectedColor.images}
      isActive={isActive}
      price={price}
      colorSwatches={colors.map((c, i) => ({
        hex: c.hex ?? '#000000',
        isSelected: i === selectedColorIndex,
        colorName: c.colorName ?? undefined,
        onClick: () => {
          setSelectedColorIndex(i)
          if (onVariantChange) {
            onVariantChange(c.variantId)
          }
        },
      }))}
      theme={theme}
      selectedVariantId={selectedColor.variantId}
      mode={mode}
      onSwipeBarClick={() => {
        if (!isActive) return

        if (onToggleExpand) {
          onToggleExpand()
          return
        }

        // Fallback: old modal behaviour
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
        })
      }}
    />
  )
}



// // src/components/Catalog/CatalogCard.tsx
// 'use client'

// import { useState } from 'react'
// import CatalogCardBase from './CatalogCardBase'
// import { useModal } from '@/src/context/ModalContext'
// import { colorThemes, colorNameToThemeKey } from '@/utils/colorThemes'
// import type { CatalogCard as CatalogCardModel } from '@/types/product'

// type CardMode = 'normal' | 'hero'

// interface CatalogCardProps extends CatalogCardModel {
//   layoutKey: string | number
//   isActive?: boolean
//   selectedVariantId?: string
//   mode?: CardMode
//   onToggleExpand?: () => void

//   /** Notify parent when a colour / variant is chosen */
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

//   // Local state used only when the card is "uncontrolled"
//   const [internalColorIndex, setInternalColorIndex] = useState(0)

//   // If parent passes selectedVariantId, that is the source of truth
//   const indexFromProp = selectedVariantId
//     ? colors.findIndex((c) => c.variantId === selectedVariantId)
//     : -1

//   const effectiveIndex =
//     indexFromProp >= 0 ? indexFromProp : internalColorIndex

//   const selectedColor = colors[effectiveIndex] ?? colors[0]

//   const themeKeyKey = selectedColor.colorName ?? 'default'
//   const themeKey = colorNameToThemeKey[themeKeyKey] || 'cosmic'
//   const theme = colorThemes[themeKey]

//   const handleColorClick = (variantId: string, index: number) => {
//     // Inform parent (carousel) so it can update variantMap
//     onVariantChange?.(variantId)

//     // If there is no external control, keep local UI responsive
//     if (!selectedVariantId) {
//       setInternalColorIndex(index)
//     }
//   }

//   return (
//     <CatalogCardBase
//       layoutKey={layoutKey}
//       name={name}
//       tier={tier}
//       images={selectedColor.images}
//       isActive={isActive}
//       price={price}
//       colorSwatches={colors.map((c, i) => ({
//         hex: c.hex ?? '#000000',
//         isSelected: i === effectiveIndex,
//         onClick: () => handleColorClick(c.variantId, i),
//         colorName: c.colorName ?? undefined,
//       }))}
//       theme={theme}
//       // expose the currently active variant back to base
//       selectedVariantId={selectedVariantId ?? selectedColor.variantId}
//       mode={mode}
//       onSwipeBarClick={() => {
//         if (!isActive) return

//         if (onToggleExpand) {
//           onToggleExpand()
//           return
//         }

//         // Fallback: old modal behaviour
//         openModal({
//           layoutKey: layoutKey.toString(),
//           id,
//           name,
//           description,
//           tier,
//           material,
//           type,
//           price,
//           colors,
//           sizes,
//           selectedVariantId: selectedColor.variantId,
//           gender,
//           fit,
//         })
//       }}
//     />
//   )
// }

