




'use client'

import { useModal } from '@/src/context/ModalContext'
import CatalogCardModal from './Catalog/CatalogCardModal'

export default function ModalHost() {
  const {
    isModalOpen,
    activeCard,
    closeModal,
    quantity,
    setQuantity,
  } = useModal()

  if (!isModalOpen || !activeCard) return null

  return (
    <CatalogCardModal
      layoutKey={activeCard.layoutKey}
      name={activeCard.name}
      description={activeCard.description}
      price={activeCard.price}
      colors={activeCard.colors}
      sizes={activeCard.sizes}
      quantity={quantity}
      setQuantity={setQuantity}
      onClose={closeModal}
      selectedVariantId={activeCard.selectedVariantId} // NEW
    />
  )
}
