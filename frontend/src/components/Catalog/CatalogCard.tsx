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

interface CatalogCardProps {
  layoutKey: string | number
  id: string
  name: string
  tier: string
  type: string
  material: string
  description: string
  price: number
  colors: {
    colorName: string
    hex: string
    variantId: string
    images: string[]
  }[]
  sizes: Record<string, number>
  selectedVariantId: string
  isActive?: boolean
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
  selectedVariantId,
  isActive = true,
}: CatalogCardProps) {
  const { openModal } = useModal()
  const [selectedColorIndex, setSelectedColorIndex] = useState(0)

  const selectedColor = colors[selectedColorIndex]

  const themeKey = colorNameToThemeKey[selectedColor.colorName] || 'cosmic'
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
        hex: c.hex,
        isSelected: i === selectedColorIndex,
        onClick: () => setSelectedColorIndex(i),
        colorName: c.colorName,
      }))}
      theme={theme}
      selectedVariantId={selectedColor.variantId}
      onSwipeBarClick={() =>
        isActive &&
        openModal({
          layoutKey: layoutKey.toString(),
          id,
          name,
          tier,
          type,
          material,
          description,
          price,
          colors,
          sizes,
          selectedVariantId: selectedColor.variantId,
        })
      }
    />
  )
}

