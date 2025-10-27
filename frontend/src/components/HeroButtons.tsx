


'use client'

import { Button } from '@/src/components/ui/button'
import { useRouter } from 'next/navigation'
import AnimatedButton from './AnimatedButton'


interface HeroButtonsProps {
  onJoinClick: () => void
  onAskClick: () => void
}


export default function HeroButtons({ onJoinClick,onAskClick }: HeroButtonsProps) {
  const router = useRouter()

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Top Row: Ask Cove + Join Membership */}
      <div className="flex justify-between gap-4">
        <Button
        onClick={onAskClick}
          className="w-[40%] bg-black text-[#FFFAFA] hover:bg-[#60889e] hover:text-black border border-black cursor-pointer ml-30"
          variant="destructive"
        >
          Ask Cove
        </Button>

        <Button
          onClick={onJoinClick}
          className="w-[30%] bg-black text-white hover:bg-white hover:text-black border border-black cursor-pointer mr-30"
          variant="outline"
        >
          Join Membership
        </Button>
      </div>

      {/* Bottom Full-Width Catalog Button */}
      <Button
        onClick={() => router.push('/catalog')}
        className="w-[80%] bg-black text-white hover:bg-white hover:text-black border border-black cursor-pointer ml-20"
        variant="outline"
      >
        Browse Catalog
      </Button>

      <AnimatedButton />
    </div>

  )
}


// 'use client'

// import FluidHeroButtons from './FluidHeroButtons'

// export default function HeroButtons() {
//   return (
//     <div className="w-full flex justify-center mt-10">
//       <FluidHeroButtons />
//     </div>
//   )
// }
