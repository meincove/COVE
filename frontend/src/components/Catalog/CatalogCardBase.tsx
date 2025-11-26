// 'use client'

// import Image from 'next/image'
// import ThumbnailDock from '@/src/components/common/ThumbnailDock'
// import type { ColorTheme } from '@/utils/colorThemes'

// type CardMode = 'normal' | 'hero'

// interface CatalogCardBaseProps {
//   layoutKey: string | number
//   name: string
//   tier: string
//   type: string
//   metaLine: string
//   price: number
//   images: string[]
//   heroImage: string
//   primaryHex: string
//   theme: ColorTheme
//   selectedVariantId: string
//   isActive: boolean
//   mode?: CardMode
//   activeImageIndex: number
//   onActiveImageChange: (index: number) => void
//   onBrowseClick: () => void
// }

// export default function CatalogCardBase({
//   name,
//   tier,
//   type,
//   metaLine,
//   price,
//   images,
//   heroImage,
//   isActive,
//   activeImageIndex,
//   onActiveImageChange,
//   onBrowseClick,
// }: CatalogCardBaseProps) {
//   const hasImages = images.length > 0

//   return (
//     <article
//       className="
//         flex h-[420px] w-[280px] flex-col overflow-hidden
//         rounded-[32px] bg-transparent
//       "
//     >
//       <div className="flex h-full flex-col">
//         {/* IMAGE AREA (with dock overlay) – ~70% */}
//         <div className="relative flex-[7] flex items-center justify-center bg-[#e2efff]">
//           {hasImages ? (
//             <div className="relative h-[88%] w-[88%]">
//               <Image
//                 src={`/clothing-images/${heroImage}`}
//                 alt={name}
//                 fill
//                 sizes="(min-width: 1024px) 280px, 70vw"
//                 className="object-contain"
//                 priority={isActive}
//               />
//             </div>
//           ) : (
//             <p className="text-sm text-slate-500">No images available</p>
//           )}

//           {hasImages && (
//             <div className="pointer-events-none absolute inset-x-0 bottom-[2px] flex justify-center">
//               {/* pointer events re-enabled inside dock only */}
//               <div className="pointer-events-auto">
//                 <ThumbnailDock
//                   thumbnails={images}
//                   activeIndex={activeImageIndex}
//                   onChange={onActiveImageChange}
//                 />
//               </div>
//             </div>
//           )}
//         </div>

//         {/* TEXT + BUTTON – ~30% */}
//         <div className="flex flex-[3] flex-col justify-between bg-[#a7f3d0] px-5 pb-4 pt-3">
//           <div className="flex items-start justify-between gap-2">
//             <div className="flex flex-col gap-0.5">
//               <span className="text-[11px] tracking-[0.22em] text-slate-500">
//                 {tier.toUpperCase()} · {type.toUpperCase()}
//               </span>
//               <span className="text-[13px] font-semibold text-slate-900">
//                 {name}
//               </span>
//               <span className="text-[11px] text-slate-600">{metaLine}</span>
//             </div>

//             <span className="text-[14px] font-semibold text-slate-900">
//               €{price.toFixed(2)}
//             </span>
//           </div>

//           <button
//             type="button"
//             onClick={onBrowseClick}
//             className="
//               mt-3 w-full rounded-full bg-slate-900
//               py-2 text-sm font-semibold text-white
//               transition-transform
//               hover:translate-y-[1px]
//               active:translate-y-[2px]
//             "
//           >
//             Browse {type.charAt(0).toUpperCase() + type.slice(1)}
//           </button>
//         </div>
//       </div>
//     </article>
//   )
// }



'use client'

import Image from 'next/image'
import ThumbnailDock from '@/src/components/common/ThumbnailDock'
import type { ColorTheme } from '@/utils/colorThemes'

type CardMode = 'normal' | 'hero'

interface CatalogCardBaseProps {
  layoutKey: string | number
  name: string
  tier: string
  type: string
  metaLine: string
  price: number
  images: string[]
  heroImage: string
  primaryHex: string
  theme: ColorTheme
  selectedVariantId: string
  isActive: boolean
  mode?: CardMode
  activeImageIndex: number
  onActiveImageChange: (index: number) => void
  onBrowseClick: () => void
}

export default function CatalogCardBase({
  name,
  tier,
  type,
  metaLine,
  price,
  images,
  heroImage,
  isActive,
  activeImageIndex,
  onActiveImageChange,
  onBrowseClick,
}: CatalogCardBaseProps) {
  const hasImages = images.length > 0

  return (
    <article
      className="
        flex h-[420px] w-[280px] flex-col overflow-hidden rounded-[22px]
        bg-[#A1BC98]
      "
    >
      <div className="flex h-full flex-col">
        {/* IMAGE AREA – 60% */}
        <div className="flex-[6] flex items-center justify-center bg-[#A1BC98]">
          {hasImages ? (
            <div className="relative h-[90%] w-[90%]">
              <Image
                src={`/clothing-images/${heroImage}`}
                alt={name}
                fill
                sizes="(min-width: 1024px) 280px, 70vw"
                className="object-contain"
                priority={isActive}
              />
            </div>
          ) : (
            <p className="text-sm text-black font-semibold">No images available</p>
          )}
        </div>

        {/* THUMBNAIL STRIP – 10% */}
        <div className="flex-[1] flex items-center justify-center bg-[#A1BC98]">
          {hasImages && (
            <ThumbnailDock
              thumbnails={images}
              activeIndex={activeImageIndex}
              onChange={onActiveImageChange}
            />
          )}
        </div>

        {/* TEXT + BUTTON – 30% */}
        <div className="flex-[3] flex flex-col justify-between bg-[#778873] px-5 pb-4 pt-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] tracking-[0.22em] text-white/70 uppercase">
                {tier.toUpperCase()} · {type.toUpperCase()}
              </span>
              <span className="text-[13px] font-semibold text-white">
                {name}
              </span>
              <span className="text-[11px] text-white/80">{metaLine}</span>
            </div>

            <span className="text-[14px] font-semibold text-white">
              €{price.toFixed(2)}
            </span>
          </div>

          <button
            type="button"
            onClick={onBrowseClick}
            className="
              mt-3 w-full rounded-full bg-black
              py-2 text-sm font-semibold text-white
              transition-transform
              hover:translate-y-[1px]
              active:translate-y-[2px]
            "
          >
            Browse {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        </div>
      </div>
    </article>
  )
}
