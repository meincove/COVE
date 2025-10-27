

// 'use client'

// import dynamic from 'next/dynamic'
// import { useState } from 'react'
// import HeroText from '@/src/components/HeroText'
// import HeroButtons from '@/src/components/HeroButtons'
// import MembershipModal from '@/src/components/MembershipModal'
// import VoiceAssistantModal from '@/src/components/VoiceAssistantModal'
// import HeroVideoBackground from '@/src/components/HeroVideoBackground'

// const CoveParticleSphere = dynamic(() => import('@/src/components/ui/particleSphere/CoveParticleSphere'), { ssr: false });


// // Lazy load 3D components
// const CoveLogo3D = dynamic(() => import('@/src/components/CoveLogo3D'), { ssr: false })
// const ModelAvatar = dynamic(() => import('@/src/components/ModelAvatar'), { ssr: false })

// export default function Hero() {
//   const [isModalOpen, setIsModalOpen] = useState(false)
//   const [isVoiceOpen, setIsVoiceOpen] = useState(false)
//   const [showParticles, setShowParticles] = useState(false);


//   return (
//     <section className="relative w-full min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#34495e] overflow-hidden">

      

    


//       {/* Main Grid Content (Text & Buttons above video) */}
//       <div className="grid grid-cols-1 md:grid-cols-2 w-full max-w-[1600px] px-3 gap-5 z-[10]">
        
        

//         {/* RIGHT: Text and Buttons above the mesh video */}
//         <div className="relative flex flex-col justify-between p-6 rounded-xl shadow-md h-[600px] overflow-hidden bg-[00FFFFFF] z-[10]">
//           <div className="flex flex-col justify-between h-full">
//             <div className="min-h-[150px]">
//               <HeroText />
//             </div>
//             <div className="mt-6">
//               <HeroButtons
//                 onJoinClick={() => setIsModalOpen(true)}
//                 onAskClick={() => setIsVoiceOpen(true)}
//                 // onAskClick={() => setShowParticles(true)}
//               />
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Modals */}
//       <MembershipModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
//       <VoiceAssistantModal isOpen={isVoiceOpen} onClose={() => setIsVoiceOpen(false)} />

//         {showParticles && (
//   <div className="fixed inset-0 z-[999] bg-black flex items-center justify-center">
//     <CoveParticleSphere />
//     <button
//       onClick={() => setShowParticles(false)}
//       className="absolute top-6 right-6 text-white text-xl bg-black/70 px-3 py-1 rounded"
//     >
//       ✕
//     </button>
//   </div>
// )}

//     </section>
//   )
// }





'use client'

import HeroSection from '@/src/sections/HeroSection'
// REMOVE this line: import FeaturesSection from '@/src/sections/FeaturesSection'
import CatalogSection from '@/src/sections/CatalogSection'
import AboutSection from '@/src/sections/AboutSection'

import { WardrobeSection, type WardrobeItem } from '@/src/sections/WardrobeSection'

// ⬇️ Adjust the path if your JSON lives somewhere else
import catalogData from '@/data/catalogData.json'
import TubelightScene from './TubelightScene'

export default function LandingPage() {
  // --- Build Wardrobe items from your JSON (robust to missing fields) ---
  const allProducts = [
    ...(catalogData?.originals ?? []),
    ...(catalogData?.casual ?? []),
    ...(catalogData?.designer ?? []),
  ]

  const wardrobeItems: WardrobeItem[] = allProducts
    .flatMap((p: any) => {
      const color = p?.colors?.[0]
      if (!color) return []
      const firstImg = color?.images?.[0]
      const image = firstImg ? `/clothing-images/${firstImg}` : '/clothing-images/placeholder.jpg'
      const slug = color?.slug || p?.slug || p?.id || 'product'
      return [{
        slug,
        name: p?.name ?? 'Cove Item',
        image,
        price: p?.basePrice ?? color?.price ?? undefined,
        tier: p?.tier ?? p?.groupKey ?? undefined,
      }]
    })
    .slice(0, 16) // take first 16 for the belt (tweak as you like)

  return (
    <main className="w-full bg-black text-white overflow-y-auto scroll-smooth">
      {/* 1) Hero */}
      <HeroSection />

      {/* 2) Wardrobe (replaces FeaturesSection) */}
      <WardrobeSection
        items={wardrobeItems}
        title="Live Wardrobe"
        speed={42}   // px/sec conveyor speed (tweak)
        minLoop={18} // how many cards to duplicate for seamless loop
      />

      

      {/* 3) Catalog */}
      <CatalogSection />

      <TubelightScene />

      {/* 4) About */}
      <AboutSection />
    </main>
  )
}
