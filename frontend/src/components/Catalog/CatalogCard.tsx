// src/components/Catalog/CatalogCard.tsx
'use client'

import { useState } from 'react'
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
}: CatalogCardProps) {
  const { openModal } = useModal()

  const [selectedColorIndex, setSelectedColorIndex] = useState(0)

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
        onClick: () => setSelectedColorIndex(i),
        colorName: c.colorName ?? undefined,
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

