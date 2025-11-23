
'use client'

import { useEffect, useState } from 'react'
import CatalogCardBase from './CatalogCardBase'
import { useModal } from '@/src/context/ModalContext'
import { colorThemes, colorNameToThemeKey } from '@/utils/colorThemes'
import type { CatalogCard as CatalogCardModel } from '@/types/product'
import { getVariantMeta } from '@/data/variantMetaIndex'

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

  // ---------- SIZE + QTY STATE (for pre-selection in modal) ----------
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(0)

  // ---------- THEME ----------
  const themeKeyKey = selectedColor.colorName ?? 'default'
  const themeKey = colorNameToThemeKey[themeKeyKey] || 'cosmic'
  const theme = colorThemes[themeKey]

  // ---------- GSM / META LINE (from productVariantsFlat) ----------
  const variantMeta = getVariantMeta(selectedColor.variantId)
  const gsm = variantMeta?.gsm

  const metaLine = [
    type,
    gsm ? `${gsm} GSM` : null,
    fit,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <CatalogCardBase
      layoutKey={layoutKey}
      name={name}
      images={selectedColor.images}
      tier={tier}
      type={type}
      metaLine={metaLine}
      price={price}
      // sizes + qty
      sizes={sizes}
      selectedSize={selectedSize}
      onSizeChange={(size) => setSelectedSize(size)}
      quantity={quantity}
      onQuantityChange={(next) => setQuantity(Math.max(0, next))}
      // colours
      colorSwatches={colors.map((c, i) => ({
        hex: c.hex ?? '#000000',
        isSelected: i === selectedColorIndex,
        colorName: c.colorName ?? undefined,
        onClick: () => {
          setSelectedColorIndex(i)
          if (onVariantChange) onVariantChange(c.variantId)
        },
      }))}
      theme={theme}
      selectedVariantId={selectedColor.variantId}
      isActive={isActive}
      mode={mode}
      onSwipeBarClick={() => {
        if (!isActive) return

        if (onToggleExpand) {
          onToggleExpand()
          return
        }

        // Fallback: open detail modal with pre-selected size + qty
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
          selectedSize: selectedSize ?? null,
          initialQuantity: quantity,
        })
      }}
    />
  )
}

