// Fully Working COde 

// 'use client'

// import { useState } from 'react'
// import CatalogCardBase from './CatalogCardBase'
// import { useModal } from '@/context/ModalContext'

// interface CatalogCardProps {
//   layoutKey: string | number
//   id: string
//   name: string
//   tier: string
//   type: string
//   material: string
//   description: string
//   price: number
//   colors: {
//     colorName: string
//     hex: string
//     variantId: string
//     images: string[]
//   }[]
//   sizes: Record<string, number>
//   isActive?: boolean
// }

// export default function CatalogCard({
//   layoutKey,
//   name,
//   tier,
//   description,
//   price,
//   colors,
//   sizes,
//   isActive = true,
// }: CatalogCardProps) {
//   const { openModal } = useModal()

//   const [selectedColorIndex, setSelectedColorIndex] = useState(0)
//   const selectedColor = colors[selectedColorIndex]
//   const frontImage =
//     selectedColor.images.find((img) => img.includes('front')) ??
//     selectedColor.images[0]

//   return (
//     <CatalogCardBase
//       layoutKey={layoutKey}
//       name={name}
//       tier={tier}
//       image={frontImage}
//       isActive={isActive}
//       price={price}
//       colorSwatches={colors.map((c, i) => ({
//         hex: c.hex,
//         isSelected: i === selectedColorIndex,
//         onClick: () => setSelectedColorIndex(i),
//       }))}
//       onSwipeBarClick={() =>
//         isActive &&
//         openModal({
//           layoutKey: layoutKey.toString(),
//           name,
//           description,
//           price,
//           colors,
//           sizes,
//         })
//       }
//     />
//   )
// }




'use client'

import { useState } from 'react'
import CatalogCardBase from './CatalogCardBase'
import { useModal } from '@/src/context/ModalContext'
import { colorThemes, colorNameToThemeKey } from '@/utils/colorThemes'
import type { CatalogCard as CatalogCardModel } from '@/types/product'

// 👇 Props = canonical CatalogCard + our local extras
interface CatalogCardProps extends CatalogCardModel {
  layoutKey: string | number
  isActive?: boolean
  selectedVariantId?: string
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
}: CatalogCardProps) {
  const { openModal } = useModal()

  const [selectedColorIndex, setSelectedColorIndex] = useState(0)

  const selectedColor = colors[selectedColorIndex] ?? colors[0]

  // 🔹 colorName can be null in ProductColor → use a safe key
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
        // 🔹 hex can be null → fallback to a default color
        hex: c.hex ?? '#000000',
        isSelected: i === selectedColorIndex,
        onClick: () => setSelectedColorIndex(i),
        // 🔹 colorName can be null, but the prop is string | undefined
        colorName: c.colorName ?? undefined,
      }))}
      theme={theme}
      selectedVariantId={selectedColor.variantId}
      onSwipeBarClick={() =>
        isActive &&
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
      }
    />
  )
}
