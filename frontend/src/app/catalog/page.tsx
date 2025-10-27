
'use client'

import CatalogCarousel from '@/src/components/Catalog/CatalogCarousel'
import rawCatalogData from '@/data/catalogData.json'

import { useRouter } from 'next/navigation'




type CatalogCardType = {
  id: string
  name: string
  tier: string
  type: string
  material: string
  price: number
  description: string
  colors: {
    colorName: string
    hex: string
    variantId: string
    images: string[]
  }[]
  sizes: Record<string, number>
}


type CatalogDataType = {
  originals?: CatalogCardType[]
  casual?: CatalogCardType[]
  designer?: CatalogCardType[]
}

const catalogData: CatalogDataType = rawCatalogData

const sections = [
  {
    title: 'Cove – Casual',
    description: 'Everyday essentials made premium – your perfect go-to.',
    tier: 'casual',
  },
  {
    title: 'Cove – Originals',
    description: 'Bold classics reimagined with quality and comfort.',
    tier: 'originals',
  },
  {
    title: 'Cove – Designer',
    description: 'Streetwear elevated – premium materials, timeless finish.',
    tier: 'designer',
  },
]

export default function CatalogPage() {
  const router = useRouter()
  return (
    <main className="w-full min-h-screen bg-white flex flex-col gap-16 py-16 px-4">

      <button
        onClick={() => router.back()}
        className="mb-4 text-sm text-gray-700 hover:underline"
      >
        ← Back
      </button>

      {sections.map((section, sectionIndex) => (
  <section
    key={sectionIndex}
    className="relative my-[160px] overflow-visible flex flex-col gap-6"
  >

          {/* Section Title */}
          <div className="w-full bg-gray-400 rounded-xl px-6 py-6">
            <h2 className="text-3xl font-bold text-black">{section.title}</h2>
            <p className="text-md text-gray-800 mt-1">{section.description}</p>
          </div>

          {/* Spiral Carousel (dynamic cards) */}
          <div className="w-full bg-[#d3efff] rounded-xl px-2 py-6">
            <CatalogCarousel
             
              cards={(catalogData[section.tier as keyof CatalogDataType] || []).map(
  (card: CatalogCardType, cardIndex: number) => ({
    ...card,
    layoutKey: `${sectionIndex}-${cardIndex}`,
  })
)}


              sectionKey={`carousel-${sectionIndex}`}
            />
          </div>
        </section>
      ))}
    </main>
  )
}





