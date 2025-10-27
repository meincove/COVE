

'use client'

import { createContext, useContext, useState } from 'react'

export interface CatalogCardData {
  layoutKey: string
  id: string
  name: string
  description: string
  tier: string
  material: string
  type: string
  price: number
  colors: {
    colorName: string
    hex: string
    variantId: string
    images: string[]
  }[]
  sizes: Record<string, number>
  selectedVariantId: string
}

interface ModalContextType {
  isModalOpen: boolean
  activeCard: CatalogCardData | null
  openModal: (card: CatalogCardData) => void
  closeModal: () => void
  quantity: number
  setQuantity: (n: number) => void
}

const ModalContext = createContext<ModalContextType | null>(null)

export const ModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeCard, setActiveCard] = useState<CatalogCardData | null>(null)
  const [quantity, setQuantity] = useState(1)

  const openModal = (card: CatalogCardData) => {
    setActiveCard(card)
    setQuantity(1)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setActiveCard(null)
  }

  return (
    <ModalContext.Provider
      value={{
        isModalOpen,
        activeCard,
        openModal,
        closeModal,
        quantity,
        setQuantity,
      }}
    >
      {children}
    </ModalContext.Provider>
  )
}

export const useModal = () => {
  const context = useContext(ModalContext)
  if (!context) throw new Error('useModal must be used within ModalProvider')
  return context
}
