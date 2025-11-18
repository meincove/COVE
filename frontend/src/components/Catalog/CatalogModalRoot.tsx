'use client'

import { AnimatePresence } from 'framer-motion'
import { useModal } from '@/src/context/ModalContext'
import CatalogCardModal from './CatalogCardModal'

export default function CatalogModalRoot() {
  const { isModalOpen, activeCard, closeModal, quantity, setQuantity } = useModal()

  return (
    <AnimatePresence>
      {isModalOpen && activeCard && (
        <CatalogCardModal
          layoutKey={activeCard.layoutKey}
          name={activeCard.name}
          description={activeCard.description}
          price={activeCard.price}
          colors={activeCard.colors as any} // types align with CatalogCardModalProps
          sizes={activeCard.sizes}
          selectedVariantId={activeCard.selectedVariantId}
          quantity={quantity}
          setQuantity={setQuantity}
          onClose={closeModal}
          tier={activeCard.tier}
    type={activeCard.type}
    material={activeCard.material}
    gender={activeCard.gender}
    fit={activeCard.fit}
        />
      )}
    </AnimatePresence>
  )
}
