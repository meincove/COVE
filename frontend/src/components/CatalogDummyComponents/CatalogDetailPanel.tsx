// src/components/Catalog/CatalogDetailPanel.tsx
'use client'

import { motion } from 'framer-motion'
import type { CatalogCardDTO } from '@/types/catalog'
import { getVariantMeta } from '@/data/variantMetaIndex'

interface CatalogDetailPanelProps {
  card: CatalogCardDTO
  selectedVariantId?: string
  selectedSize?: string | null
  quantity: number
  onVariantChange: (variantId: string) => void
  onSizeChange: (size: string) => void
  onQuantityChange: (qty: number) => void
  onGoToStore: () => void
  onClose: () => void
}

export default function CatalogDetailPanel({
  card,
  selectedVariantId,
  selectedSize,
  quantity,
  onVariantChange,
  onSizeChange,
  onQuantityChange,
  onGoToStore,
  onClose,
}: CatalogDetailPanelProps) {
  // --- active colour from catalogData.json (for hex + name fallback) ---
  const activeColor =
    card.colors.find((c) => c.variantId === selectedVariantId) ??
    card.colors[0]

  // --- rich variant data from productVariantsFlat.json ---
  const variantMeta = getVariantMeta(
    selectedVariantId ?? activeColor?.variantId
  )

  const displayPrice = variantMeta?.price ?? card.price
  const displayMaterial = variantMeta?.material ?? card.material
  const displayGsm = variantMeta?.gsm
  const fabricDetails = variantMeta?.fabricDetails
  const careInstructions = variantMeta?.careInstructions
  const description = variantMeta?.description ?? card.description

  // sizes: prefer variant-specific stock, otherwise card-level sizes
  const sizeSource =
    variantMeta?.sizes && Object.keys(variantMeta.sizes).length > 0
      ? variantMeta.sizes
      : card.sizes

  const sizeEntries = sizeSource
    ? (Object.entries(sizeSource) as [string, number][])
    : []

  // stock for currently selected size
  const selectedStock =
    selectedSize && sizeEntries.length > 0
      ? sizeEntries.find(([size]) => size === selectedSize)?.[1] ?? 0
      : 0

  const canDecrement = quantity > 0
  const canIncrement =
    !!selectedSize && selectedStock > 0 && quantity < selectedStock

  const handleDec = () => {
    if (!canDecrement) return
    onQuantityChange(Math.max(0, quantity - 1))
  }

  const handleInc = () => {
    if (!selectedSize || selectedStock <= 0) return
    if (quantity >= selectedStock) return
    onQuantityChange(Math.min(selectedStock, quantity + 1))
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -100 }}
      animate={{ opacity: 1, x: -50 }}
      exit={{ opacity: 0, x: -120 }}
      transition={{
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="
        absolute
        top-1/2 -translate-y-1/2
        right-[6%]
        z-20

        w-[46%]
        h-[78%]

        rounded-[24px]
        bg-white
        border border-slate-100
        shadow-[0_28px_60px_rgba(15,23,42,0.38)]
        px-6 md:px-8 lg:px-10
        py-4 md:py-6 lg:py-8
        flex flex-col
        gap-5
        text-slate-900
      "
    >
      {/* SECTION 1 — Info header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.26em] text-slate-500">
            {card.tier.toUpperCase()} · {card.type.toUpperCase()}
          </span>
          <h3 className="text-lg font-semibold leading-snug">
            {card.name}
          </h3>
          <span className="text-[11px] text-slate-500">
            {displayMaterial}
            {displayGsm && <> · {displayGsm} GSM</>}
            {' · '}
            {card.gender} · {card.fit}
          </span>
        </div>

        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="
            h-8 w-8 rounded-full
            bg-slate-900 text-white
            flex items-center justify-center
            text-sm
            hover:bg-black transition
          "
        >
          ✕
        </button>
      </div>

      {/* Price + color pill */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-semibold">
            €{displayPrice.toFixed(2)}
          </span>
          <span className="text-[11px] text-slate-500">incl. VAT</span>
        </div>

        {activeColor && (
          <div className="flex items-center gap-2 text-[11px] text-slate-700">
            <div
              className="h-5 w-5 rounded-full border border-slate-300"
              style={{ backgroundColor: activeColor.hex ?? '#000000' }}
            />
            <span>{activeColor.colorName ?? 'Selected colour'}</span>
          </div>
        )}
      </div>

      {/* Short description + fabric info */}
      <div className="mb-2 space-y-1 text-[11px] text-slate-600">
        {description && (
          <p className="text-[12px] leading-relaxed text-slate-700">
            {description}
          </p>
        )}

        {displayGsm && (
          <p>
            <span className="font-semibold">Fabric weight:</span>{' '}
            {displayGsm} GSM
          </p>
        )}

        {fabricDetails && (
          <p>
            <span className="font-semibold">Fabric:</span>{' '}
            {fabricDetails}
          </p>
        )}

        {careInstructions && (
          <p>
            <span className="font-semibold">Care:</span>{' '}
            {careInstructions}
          </p>
        )}
      </div>

      <div className="border-t border-slate-200 pt-4 flex-1 flex flex-col gap-5 overflow-y-auto pr-1">
        {/* SECTION 2 — Sizes + Colours */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Sizes & Colours
          </h4>

          {/* Sizes (selectable, with stock) */}
          {sizeEntries.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {sizeEntries.map(([size, stock]) => {
                const isOut = stock <= 0
                const isSelected = size === selectedSize
                const isFewLeft = stock > 0 && stock < 10

                return (
                  <button
                    key={size}
                    type="button"
                    disabled={isOut}
                    onClick={() => {
                      if (isOut) return
                      onSizeChange(size)
                      // reset quantity if it exceeds new stock
                      if (quantity > stock) {
                        onQuantityChange(stock === 0 ? 0 : stock)
                      }
                    }}
                    className={`
                      px-3 py-1.5 rounded-full border text-[11px] relative
                      ${
                        isOut
                          ? 'border-slate-200 text-slate-400 bg-slate-100/70 line-through cursor-not-allowed'
                          : isSelected
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-300 text-slate-800 bg-slate-50 hover:border-slate-500'
                      }
                    `}
                  >
                    {size}
                    <span className="ml-1 text-[10px] text-slate-400">
                      ({stock})
                    </span>
                    {isFewLeft && !isOut && (
                      <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[9px] text-red-500">
                        few left
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Quantity selector */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Quantity
            </span>

            <div className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50">
              <button
                type="button"
                onClick={handleDec}
                disabled={!canDecrement}
                className={`
                  px-3 py-1 text-sm rounded-l-full
                  ${
                    canDecrement
                      ? 'text-slate-800 hover:bg-slate-200'
                      : 'text-slate-400 cursor-not-allowed'
                  }
                `}
              >
                –
              </button>
              <span className="px-4 py-1 text-sm font-medium text-slate-900 min-w-[2rem] text-center">
                {quantity}
              </span>
              <button
                type="button"
                onClick={handleInc}
                disabled={!canIncrement}
                className={`
                  px-3 py-1 text-sm rounded-r-full
                  ${
                    canIncrement
                      ? 'text-slate-800 hover:bg-slate-200'
                      : 'text-slate-400 cursor-not-allowed'
                  }
                `}
              >
                +
              </button>
            </div>

            {selectedSize && selectedStock === 0 && (
              <span className="text-[11px] text-red-500">
                Selected size out of stock
              </span>
            )}

            {selectedSize &&
              selectedStock > 0 &&
              quantity >= selectedStock && (
                <span className="inline-flex items-center rounded-full bg-red-500/10 text-red-600 px-3 py-1 text-[11px]">
                  Maximum pieces reached
                </span>
              )}
          </div>

          {/* Colours — change variant (and therefore card + modal data) */}
          {card.colors.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              {card.colors.map((color) => {
                const isActive = color.variantId === selectedVariantId
                return (
                  <button
                    key={color.variantId}
                    type="button"
                    onClick={() => onVariantChange(color.variantId)}
                    className={`
                      flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-[11px]
                      ${
                        isActive
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-300 bg-white text-slate-800 hover:border-slate-500'
                      }
                    `}
                  >
                    <span
                      className="h-4 w-4 rounded-full border border-slate-200"
                      style={{ backgroundColor: color.hex ?? '#000000' }}
                    />
                    <span>{color.colorName ?? 'Colour'}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* SECTION 3 — Actions */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Actions
          </h4>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onGoToStore}
              className="px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-medium hover:bg-black transition"
            >
              Go to store
            </button>

            <button
              type="button"
              className="px-4 py-2 rounded-full border border-slate-900 text-xs font-medium hover:bg-slate-900 hover:text-white transition"
            >
              Add to cart
            </button>

            <button
              type="button"
              className="px-4 py-2 rounded-full border border-slate-400 text-xs text-slate-800 hover:border-slate-900 transition"
            >
              Buy on
            </button>

            <button
              type="button"
              className="px-4 py-2 rounded-full border border-slate-300 text-xs text-slate-800 hover:border-slate-900 transition"
            >
              Add to wishlist
            </button>

            <button
              type="button"
              className="px-4 py-2 rounded-full border border-slate-300 text-xs text-slate-800 hover:border-slate-900 transition"
            >
              Ask Cove
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}




// 'use client'

// import { motion } from 'framer-motion'
// import type { CatalogCardDTO } from '@/types/catalog'
// import { getVariantMeta } from '@/data/variantMetaIndex'

// interface CatalogDetailPanelProps {
//   card: CatalogCardDTO
//   selectedVariantId?: string
//   onVariantChange: (variantId: string) => void
//   onClose: () => void
// }

// export default function CatalogDetailPanel({
//   card,
//   selectedVariantId,
//   onVariantChange,
//   onClose,
// }: CatalogDetailPanelProps) {
//   // --- active colour from catalogData.json (for hex + name fallback) ---
//   const activeColor =
//     card.colors.find((c) => c.variantId === selectedVariantId) ??
//     card.colors[0]

//   // --- rich variant data from productVariantsFlat.json ---
//   const variantMeta = getVariantMeta(selectedVariantId ?? activeColor?.variantId)

//   // values we actually show in UI
//   const displayPrice = variantMeta?.price ?? card.price
//   const displayMaterial = variantMeta?.material ?? card.material
//   const displayGsm = variantMeta?.gsm
//   const fabricDetails = variantMeta?.fabricDetails
//   const careInstructions = variantMeta?.careInstructions
//   const description = variantMeta?.description ?? card.description

//   // sizes: prefer variant-specific stock, otherwise card-level sizes
//   const sizeSource =
//     (variantMeta?.sizes && Object.keys(variantMeta.sizes).length > 0)
//       ? variantMeta.sizes
//       : card.sizes

//   const sizeEntries = sizeSource
//     ? (Object.entries(sizeSource) as [string, number][])
//     : []

//   return (
//     <motion.div
//       initial={{ opacity: 0, x: -100 }}
//       animate={{ opacity: 1, x: -50 }}
//       exit={{ opacity: 0, x: -120 }}
//       transition={{
//         duration: 0.5,
//         ease: [0.16, 1, 0.3, 1],
//       }}
//       className="
//         absolute
//         top-1/2 -translate-y-1/2
//         right-[0%]
//         z-20

//         w-[52.5%]
//         h-[86%]

//         rounded-[24px]
//         bg-white
//         border border-slate-100
//         shadow-[0_28px_60px_rgba(15,23,42,0.38)]
//         px-6 md:px-8 lg:px-10
//         py-4 md:py-6 lg:py-8
//         flex flex-col
//         gap-6
//         text-slate-900
//       "
//     >
//       {/* SECTION 1 — Info header */}
//       <div className="flex items-start justify-between gap-4 mb-4">
//         <div className="flex flex-col gap-1">
//           <span className="text-[10px] uppercase tracking-[0.26em] text-slate-500">
//             {card.tier.toUpperCase()} · {card.type.toUpperCase()}
//           </span>
//           <h3 className="text-lg font-semibold leading-snug">
//             {card.name}
//           </h3>
//           <span className="text-[11px] text-slate-500">
//   {displayMaterial}
//   {displayGsm && <> · {displayGsm} GSM</>}
//   {' · '}{card.gender} · {card.fit}
// </span>

//         </div>

//         {/* Close */}
//         <button
//           type="button"
//           onClick={onClose}
//           className="
//             h-8 w-8 rounded-full
//             bg-slate-900 text-white
//             flex items-center justify-center
//             text-sm
//             hover:bg-black transition
//           "
//         >
//           ✕
//         </button>
//       </div>

//       {/* Price + color pill */}
//       <div className="flex items-center justify-between mb-3">
//         <div className="flex items-baseline gap-2">
//           <span className="text-xl font-semibold">
//             €{displayPrice.toFixed(2)}
//           </span>
//           <span className="text-[11px] text-slate-500">incl. VAT</span>
//         </div>

//         {activeColor && (
//           <div className="flex items-center gap-2 text-[11px] text-slate-700">
//             <div
//               className="h-5 w-5 rounded-full border border-slate-300"
//               style={{ backgroundColor: activeColor.hex ?? '#000000' }}
//             />
//             <span>{activeColor.colorName ?? 'Selected colour'}</span>
//           </div>
//         )}
//       </div>

//       {/* Short description + fabric info */}
//       <div className="mb-2 space-y-1 text-[11px] text-slate-600">
//         {description && (
//           <p className="text-[12px] leading-relaxed text-slate-700">
//             {description}
//           </p>
//         )}

//         {displayGsm && (
//           <p>
//             <span className="font-semibold">Fabric weight:</span>{' '}
//             {displayGsm} GSM
//           </p>
//         )}

//         {fabricDetails && (
//           <p>
//             <span className="font-semibold">Fabric:</span>{' '}
//             {fabricDetails}
//           </p>
//         )}

//         {careInstructions && (
//           <p>
//             <span className="font-semibold">Care:</span>{' '}
//             {careInstructions}
//           </p>
//         )}
//       </div>

      

//       <div className="border-t border-slate-200 pt-4 flex-1 flex flex-col gap-5 overflow-y-auto pr-1">
//         {/* SECTION 2 — Sizes + Colours */}
//         <div className="space-y-3">
//           <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
//             Sizes & Colours
//           </h4>

//           {/* Sizes (selectable, with stock) */}
//           {sizeEntries.length > 0 && (
//             <div className="flex flex-wrap gap-2">
//               {sizeEntries.map(([size, stock]) => {
//                 const isOut = stock <= 0
//                 return (
//                   <button
//                     key={size}
//                     type="button"
//                     disabled={isOut}
//                     className={`
//                       px-3 py-1.5 rounded-full border text-[11px]
//                       ${
//                         isOut
//                           ? 'border-slate-200 text-slate-400 bg-slate-100/70 line-through cursor-not-allowed'
//                           : 'border-slate-300 text-slate-800 bg-slate-50 hover:border-slate-500'
//                       }
//                     `}
//                   >
//                     {size}
//                     <span className="ml-1 text-[10px] text-slate-400">
//                       ({stock})
//                     </span>
//                   </button>
//                 )
//               })}
//             </div>
//           )}

//           {/* Colours — change variant (and therefore card + modal data) */}
//           {card.colors.length > 0 && (
//             <div className="flex flex-wrap items-center gap-3">
//               {card.colors.map((color) => {
//                 const isActive = color.variantId === selectedVariantId
//                 return (
//                   <button
//                     key={color.variantId}
//                     type="button"
//                     onClick={() => onVariantChange(color.variantId)}
//                     className={`
//                       flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-[11px]
//                       ${
//                         isActive
//                           ? 'border-slate-900 bg-slate-900 text-white'
//                           : 'border-slate-300 bg-white text-slate-800 hover:border-slate-500'
//                       }
//                     `}
//                   >
//                     <span
//                       className="h-4 w-4 rounded-full border border-slate-200"
//                       style={{ backgroundColor: color.hex ?? '#000000' }}
//                     />
//                     <span>{color.colorName ?? 'Colour'}</span>
//                   </button>
//                 )
//               })}
//             </div>
//           )}
//         </div>

//         {/* SECTION 3 — Actions */}
//         <div className="space-y-3">
//           <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
//             Actions
//           </h4>

//           <div className="flex flex-wrap gap-3">
//             <button
//               type="button"
//               className="px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-medium hover:bg-black transition"
//             >
//               Go to store
//             </button>

//             <button
//               type="button"
//               className="px-4 py-2 rounded-full border border-slate-900 text-xs font-medium hover:bg-slate-900 hover:text-white transition"
//             >
//               Add to cart
//             </button>

//             <button
//               type="button"
//               className="px-4 py-2 rounded-full border border-slate-400 text-xs text-slate-800 hover:border-slate-900 transition"
//             >
//               Buy on
//             </button>

//             <button
//               type="button"
//               className="px-4 py-2 rounded-full border border-slate-300 text-xs text-slate-800 hover:border-slate-900 transition"
//             >
//               Add to wishlist
//             </button>

//             <button
//               type="button"
//               className="px-4 py-2 rounded-full border border-slate-300 text-xs text-slate-800 hover:border-slate-900 transition"
//             >
//               Ask Cove
//             </button>
//           </div>
//         </div>
//       </div>
//     </motion.div>
//   )
// }
