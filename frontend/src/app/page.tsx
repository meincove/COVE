
// "use client"

// import { useState, useEffect, useRef, useCallback } from "react"
// import { useRouter } from "next/navigation"
// import { motion } from "framer-motion"
// import {
//   ShoppingCartIcon,
//   TShirtIcon,
//   HangerIcon,
// } from "@/src/components/icons/ShoppingIcons"
// import {
//   LaptopIcon,
//   DollarIcon,
//   RobotIcon,
// } from "@/src/components/icons/PlatformIcons"
// import FPSMonitor from "@/src/components/FPSMonitor"
// import PlatformParticles from "../components/PlatformParticles"

// interface RGBColor {
//   r: number
//   g: number
//   b: number
// }

// type IconComponentProps = {
//   color: string
//   size: number
//   strokeWidth: number
// }

// type IconPatternItem = {
//   Icon: React.ComponentType<IconComponentProps>
//   x: number
//   y: number
//   rotation: number
//   id: string
// }

// type IconPatterns = {
//   shopping: IconPatternItem[]
//   platform: IconPatternItem[]
// }

// export default function WelcomePage() {
//   const router = useRouter()
//   const containerRef = useRef<HTMLDivElement>(null)

//   const [activeSide, setActiveSide] = useState<"left" | "right" | null>(null)
//   const [mounted, setMounted] = useState(false)
//   const [isMobile, setIsMobile] = useState(false)
//   const [iconPatterns, setIconPatterns] = useState<IconPatterns>({
//     shopping: [],
//     platform: [],
//   })
//   const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({
//     x: 0,
//     y: 0,
//   })

//   // global colors for each side
//   const [shoppingColor, setShoppingColor] = useState<RGBColor>({
//     r: 219,
//     g: 39,
//     b: 119,
//   })
//   const [platformColor, setPlatformColor] = useState<RGBColor>({
//     r: 16,
//     g: 185,
//     b: 129,
//   })

//   const lastMoveTimeRef = useRef(0) // for mouse throttling
//   const firstEntryPointRef = useRef<{
//     x: number
//     y: number
//     section: "left" | "right"
//   } | null>(null)

//   useEffect(() => {
//     setMounted(true)
//   }, [])

//   // 💡 Color cycle: light-weight, no RAF – just change every 12s and let CSS transitions smooth it
//   useEffect(() => {
//     if (!mounted) return

//     const generateRandomColor = (): RGBColor => ({
//       r: Math.floor(Math.random() * 256),
//       g: Math.floor(Math.random() * 256),
//       b: Math.floor(Math.random() * 256),
//     })

//     const interval = setInterval(() => {
//       setShoppingColor(generateRandomColor())
//       setPlatformColor(generateRandomColor())
//     }, 12000) // every 12s

//     return () => clearInterval(interval)
//   }, [mounted])

//   // 📐 Icon pattern generation + resize handling
//   useEffect(() => {
//     if (!mounted || !containerRef.current) return

//     const generatePatterns = () => {
//       const el = containerRef.current
//       if (!el) return

//       const rect = el.getBoundingClientRect()

//       // slightly larger spacing → fewer icons → cheaper renders
//       const spacing = 110
//       const rows = Math.ceil(rect.height / spacing) + 2
//       const cols = Math.ceil((rect.width * 0.5) / spacing) + 2

//       const shoppingIcons = [ShoppingCartIcon, TShirtIcon, HangerIcon]
//       const platformIcons = [LaptopIcon, DollarIcon, RobotIcon]

//       const shoppingPattern: IconPatternItem[] = []
//       const platformPattern: IconPatternItem[] = []

//       for (let row = 0; row < rows; row++) {
//         for (let col = 0; col < cols; col++) {
//           const xOffset = row % 2 === 0 ? 0 : spacing / 2
//           const rotationIndex = (row + col) % 4
//           const rotation =
//             rotationIndex === 0
//               ? 12
//               : rotationIndex === 1
//                 ? -12
//                 : rotationIndex === 2
//                   ? 18
//                   : -18

//           shoppingPattern.push({
//             Icon: shoppingIcons[(row * cols + col) % shoppingIcons.length],
//             x: col * spacing + xOffset,
//             y: row * spacing + 10,
//             rotation,
//             id: `shopping-${row}-${col}`,
//           })

//           platformPattern.push({
//             Icon: platformIcons[(row * cols + col) % platformIcons.length],
//             x: rect.width * 0.55 + col * spacing + xOffset,
//             y: row * spacing + 10,
//             rotation,
//             id: `platform-${row}-${col}`,
//           })
//         }
//       }

//       setIconPatterns({ shopping: shoppingPattern, platform: platformPattern })
//     }

//     const handleResize = () => {
//       setIsMobile(window.innerWidth < 720)
//       generatePatterns()
//     }

//     handleResize()
//     window.addEventListener("resize", handleResize)

//     return () => {
//       window.removeEventListener("resize", handleResize)
//     }
//   }, [mounted])

//   // 🖱 Mouse move (bound to container, not window) – throttled to ~30fps
//   const handleMouseMove = useCallback(
//     (e: React.MouseEvent<HTMLDivElement>) => {
//       const now = performance.now()
//       if (now - lastMoveTimeRef.current < 32) return // ~30fps
//       lastMoveTimeRef.current = now

//       const container = containerRef.current
//       if (!container) return
//       const rect = container.getBoundingClientRect()

//       const x = e.clientX - rect.left
//       const y = e.clientY - rect.top
//       setMousePosition({ x, y })

//       let newActiveSide: "left" | "right"
//       if (isMobile) {
//         const midpoint = rect.height / 2
//         newActiveSide = y < midpoint ? "left" : "right"
//       } else {
//         const topX = 45
//         const bottomX = 55
//         const lineXAtY = topX + ((bottomX - topX) * y) / rect.height
//         const mouseXPercent = (x / rect.width) * 100
//         newActiveSide = mouseXPercent < lineXAtY ? "left" : "right"
//       }

//       if (newActiveSide !== activeSide) {
//         firstEntryPointRef.current = { x, y, section: newActiveSide }
//         setActiveSide(newActiveSide)
//       }
//     },
//     [isMobile, activeSide]
//   )

//   const partnerBrands = [
//     "GUCCI",
//     "PRADA",
//     "VERSACE",
//     "DIOR",
//     "CHANEL",
//     "BALENCIAGA",
//     "FENDI",
//     "GIVENCHY",
//     "VALENTINO",
//     "BURBERRY",
//     "SAINT LAURENT",
//     "BOTTEGA VENETA",
//   ]

//   const getIconGlowIntensity = (
//     iconX: number,
//     iconY: number,
//     section: "left" | "right"
//   ) => {
//     if (activeSide !== section) return 0

//     const dx = mousePosition.x - iconX
//     const dy = mousePosition.y - iconY
//     const distance = Math.sqrt(dx * dx + dy * dy)
//     const maxDistance = 210 // slightly smaller radius

//     if (distance > maxDistance) return 0

//     return 1 - distance / maxDistance
//   }

//   // fixed 20° tilt, deterministic per index
//   const getIconTilt = (idx: number) => {
//     const seed = idx * 137.508
//     const direction = Math.cos(seed) > 0 ? 1 : -1
//     return 20 * direction
//   }

//   const handleCardClick = (path: string) => {
//     router.push(`/sign-in?redirect_url=${encodeURIComponent(path)}`)
//   }

//   const handleSectionClick = (section: "left" | "right") => {
//     // we keep this super light now – just focus the section
//     setActiveSide(section)
//   }

//   if (!mounted) return null

//   const leftClipDesktop = "polygon(0 0, 45% 0, 55% 100%, 0 100%)"
//   const rightClipDesktop = "polygon(45% 0, 100% 0, 100% 100%, 55% 100%)"
//   const leftClipMobile = "polygon(0 0, 100% 0, 100% 50%, 0 50%)"
//   const rightClipMobile = "polygon(0 50%, 100% 50%, 100% 100%, 0 100%)"

//   return (
//     <div
//       ref={containerRef}
//       className="fixed inset-0 overflow-hidden bg-neutral-950 flex flex-col"
//       onMouseMove={handleMouseMove}
//     >
//       <FPSMonitor />
//       <div className="flex-1 relative">
//         {/* LEFT SECTION */}
//         <div
//           className="absolute inset-0 transition-all duration-300 ease-out cursor-pointer"
//           style={{
//             clipPath: isMobile ? leftClipMobile : leftClipDesktop,
//             transform: activeSide === "left" ? "scale(1.02)" : "scale(1)",
//             boxShadow:
//               activeSide === "left"
//                 ? "0 20px 60px rgba(0, 0, 0, 0.15)"
//                 : "none",
//           }}
//           onClick={() => handleSectionClick("left")}
//         >
//           {/* Backgrounds */}
//           <div className="absolute inset-0">
//             <div
//               className="absolute inset-0"
//               style={{
//                 background:
//                   "linear-gradient(to right, #a8c5c5 0%, #c8d4d0 25%, #d8d4cc 50%, #e4d0c4 75%, #f0d4c8 100%)",
//               }}
//             />
//             <div
//               className="absolute inset-0 opacity-[0.03]"
//               style={{
//                 backgroundImage:
//                   "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23paper)' /%3E%3C/svg%3E\")",
//               }}
//             />
//             <div
//               className="absolute inset-0 opacity-20"
//               style={{
//                 background:
//                   "radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.08) 100%)",
//               }}
//             />
//           </div>

//           {/* Icons */}
//           <div className="absolute inset-0 overflow-hidden pointer-events-none">
//             {iconPatterns.shopping.map((item, idx) => {
//               const glowIntensity = getIconGlowIntensity(item.x, item.y, "left")
//               const hasEffect = glowIntensity > 0
//               const tilt = hasEffect ? getIconTilt(idx) : 0

//               return (
//                 <div
//                   key={item.id}
//                   className="absolute"
//                   style={{
//                     left: item.x,
//                     top: item.y,
//                     transform: `rotate(${item.rotation + tilt}deg)`,
//                     opacity: hasEffect ? 0.12 + glowIntensity * 0.9 : 0.12,
//                     filter: hasEffect
//                       ? `drop-shadow(0 0 ${4 + glowIntensity * 10}px rgba(${shoppingColor.r}, ${shoppingColor.g}, ${shoppingColor.b}, ${glowIntensity}))`
//                       : "none",
//                     transition:
//                       "opacity 180ms ease-out, filter 220ms ease-out, transform 220ms ease-out",
//                   }}
//                 >
//                   <item.Icon
//                     color={
//                       hasEffect
//                         ? `rgba(${shoppingColor.r}, ${shoppingColor.g}, ${shoppingColor.b}, ${0.5 + glowIntensity * 0.5
//                         })`
//                         : "#78716c"
//                     }
//                     size={40} // smaller icons
//                     strokeWidth={hasEffect ? 1.6 + glowIntensity * 0.7 : 1.5}
//                   />
//                 </div>
//               )
//             })}
//           </div>

//           {/* Active border */}
//           {activeSide === "left" && (
//             <motion.div
//               className="absolute inset-0 pointer-events-none"
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               transition={{ duration: 0.3 }}
//               style={{
//                 border: "3px solid #d4af37",
//                 clipPath: isMobile ? leftClipMobile : leftClipDesktop,
//                 boxShadow: "inset 0 0 80px rgba(212, 175, 55, 0.15)",
//               }}
//             />
//           )}
//         </div>

//         {/* RIGHT SECTION */}
//         <div
//           className="absolute inset-0 transition-all duration-300 ease-out cursor-pointer"
//           style={{
//             clipPath: isMobile ? rightClipMobile : rightClipDesktop,
//             transform: activeSide === "right" ? "scale(1.02)" : "scale(1)",
//             boxShadow:
//               activeSide === "right"
//                 ? "0 20px 60px rgba(0, 0, 0, 0.3)"
//                 : "none",
//           }}
//           onClick={() => handleSectionClick("right")}
//         >
//           <div className="absolute inset-0">
//             {/* Base dark gradient */}
//             <div
//               className="absolute inset-0"
//               style={{
//                 background:
//                   "linear-gradient(to left, #1a1a1a 0%, #252525 25%, #303030 50%, #3a3a3a 75%, #4a4a4a 100%)",
//               }}
//             />

//             {/* Particles background – blended with the dark gradient */}
//             <PlatformParticles className="mix-blend-screen opacity-45" />

//             {/* Subtle carbon texture */}
//             <div
//               className="absolute inset-0 opacity-[0.04]"
//               style={{
//                 backgroundImage:
//                   "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='carbon'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23carbon)' /%3E%3C/svg%3E\")",
//               }}
//             />

//             {/* Vignette */}
//             <div
//               className="absolute inset-0 opacity-30"
//               style={{
//                 background:
//                   "radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.4) 100%)",
//               }}
//             />
//           </div>


//           <div className="absolute inset-0 overflow-hidden pointer-events-none">
//             {iconPatterns.platform.map((item, idx) => {
//               const glowIntensity = getIconGlowIntensity(item.x, item.y, "right")
//               const hasEffect = glowIntensity > 0
//               const tilt = hasEffect ? getIconTilt(idx) : 0

//               return (
//                 <div
//                   key={item.id}
//                   className="absolute"
//                   style={{
//                     left: item.x,
//                     top: item.y,
//                     transform: `rotate(${item.rotation + tilt}deg)`,
//                     opacity: hasEffect ? 0.16 + glowIntensity * 1.0 : 0.16,
//                     filter: hasEffect
//                       ? `drop-shadow(0 0 ${4 + glowIntensity * 10}px rgba(${platformColor.r}, ${platformColor.g}, ${platformColor.b}, ${glowIntensity}))`
//                       : "none",
//                     transition:
//                       "opacity 180ms ease-out, filter 220ms ease-out, transform 220ms ease-out",
//                   }}
//                 >
//                   <item.Icon
//                     color={
//                       hasEffect
//                         ? `rgba(${platformColor.r}, ${platformColor.g}, ${platformColor.b}, ${0.6 + glowIntensity * 0.4
//                         })`
//                         : "#a3a3a3"
//                     }
//                     size={40}
//                     strokeWidth={hasEffect ? 1.6 + glowIntensity * 0.7 : 1.5}
//                   />
//                 </div>
//               )
//             })}
//           </div>

//           {activeSide === "right" && (
//             <motion.div
//               className="absolute inset-0 pointer-events-none"
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               transition={{ duration: 0.3 }}
//               style={{
//                 border: "3px solid #c0c0c0",
//                 clipPath: isMobile ? rightClipMobile : rightClipDesktop,
//                 boxShadow: "inset 0 0 80px rgba(192, 192, 192, 0.12)",
//               }}
//             />
//           )}
//         </div>

//         {/* CENTRAL CARDS */}
//         <div className="absolute inset-0 pointer-events-none flex items-center justify-center gap-16 px-16">
//           {/* Shopping Card */}
//           <div
//             onClick={() => handleCardClick("/shop")}
//             className="pointer-events-auto group relative w-[400px] bg-gradient-to-br from-[#f5f0ed]/95 to-[#e8e4e0]/95 backdrop-blur-sm rounded-3xl shadow-2xl hover:shadow-pink-500/20 transition-all duration-500 hover:scale-[1.02] cursor-pointer p-10"
//           >
//             <div className="mb-6">
//               <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-pink-500/50 transition-all duration-300 group-hover:rotate-3">
//                 <svg
//                   className="w-10 h-10 text-white"
//                   fill="none"
//                   stroke="currentColor"
//                   viewBox="0 0 24 24"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={1.5}
//                     d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
//                   />
//                 </svg>
//               </div>
//             </div>
//             <h2 className="text-3xl font-semibold text-gray-900 mb-2">
//               Shop on COVE
//             </h2>
//             <p className="text-gray-600 text-sm leading-relaxed mb-8">
//               Discover curated luxury collections powered by AI recommendations
//               tailored to your style.
//             </p>
//             <div className="flex items-center gap-2 text-pink-600 font-medium group-hover:gap-3 transition-all">
//               <span>Explore Now</span>
//               <span className="transition-transform group-hover:translate-x-1">
//                 →
//               </span>
//             </div>
//           </div>

//           {/* Platform Card */}
//           <div
//             onClick={() => handleCardClick("/partner-onboarding")}
//             className="pointer-events-auto group relative w-[400px] bg-gradient-to-br from-[#2a2a2a]/95 to-[#1a1a1a]/95 backdrop-blur-sm rounded-3xl shadow-2xl hover:shadow-green-500/20 transition-all duration-500 hover:scale-[1.02] cursor-pointer p-10"
//           >
//             <div className="mb-6">
//               <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-green-500/50 transition-all duration-300 group-hover:rotate-3">
//                 <svg
//                   className="w-10 h-10 text-white"
//                   fill="none"
//                   stroke="currentColor"
//                   viewBox="0 0 24 24"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={1.5}
//                     d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
//                   />
//                 </svg>
//               </div>
//             </div>
//             <h2 className="text-3xl font-semibold text-white mb-2">
//               Sell on COVE
//             </h2>
//             <p className="text-gray-400 text-sm leading-relaxed mb-8">
//               Grow your brand with AI-powered analytics and access to premium
//               luxury shoppers.
//             </p>
//             <div className="flex items-center gap-2 text-green-400 font-medium group-hover:gap-3 transition-all">
//               <span>Join Platform</span>
//               <span className="transition-transform group-hover:translate-x-1">
//                 →
//               </span>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Ticker */}
//       <div className="h-[5vh] bg-neutral-100 relative overflow-hidden flex-shrink-0">
//         <div className="h-full flex items-center justify-center">
//           <div className="relative w-full overflow-hidden">
//             <motion.div
//               className="flex gap-12 items-center"
//               animate={{ x: [0, -1920] }}
//               transition={{
//                 x: {
//                   repeat: Infinity,
//                   repeatType: "loop",
//                   duration: 30,
//                   ease: "linear",
//                 },
//               }}
//             >
//               {[...partnerBrands, ...partnerBrands, ...partnerBrands].map(
//                 (brand, idx) => (
//                   <div
//                     key={idx}
//                     className="text-xl font-bold text-neutral-400 whitespace-nowrap tracking-wider"
//                   >
//                     {brand}
//                   </div>
//                 )
//               )}
//             </motion.div>
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }


"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  ShoppingCartIcon,
  TShirtIcon,
  HangerIcon,
} from "@/src/components/icons/ShoppingIcons"
import FPSMonitor from "@/src/components/FPSMonitor"
import PlatformParticles from "../components/PlatformParticles"

interface RGBColor {
  r: number
  g: number
  b: number
}

type IconComponentProps = {
  color: string
  size: number
  strokeWidth: number
}

type IconPatternItem = {
  Icon: React.ComponentType<IconComponentProps>
  x: number
  y: number
  rotation: number
  id: string
}

type IconPatterns = {
  shopping: IconPatternItem[]
}

export default function WelcomePage() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)

  const [activeSide, setActiveSide] = useState<"left" | "right" | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [iconPatterns, setIconPatterns] = useState<IconPatterns>({
    shopping: [],
  })
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  })

  const [shoppingColor, setShoppingColor] = useState<RGBColor>({
    r: 219,
    g: 39,
    b: 119,
  })

  const lastMoveTimeRef = useRef(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  // lightweight colour cycling for left
  useEffect(() => {
    if (!mounted) return

    const generateRandomColor = (): RGBColor => ({
      r: Math.floor(Math.random() * 256),
      g: Math.floor(Math.random() * 256),
      b: Math.floor(Math.random() * 256),
    })

    const interval = setInterval(() => {
      setShoppingColor(generateRandomColor())
    }, 12000)

    return () => clearInterval(interval)
  }, [mounted])

  // icon pattern generation (left only)
  useEffect(() => {
    if (!mounted || !containerRef.current) return

    const generatePatterns = () => {
      const el = containerRef.current
      if (!el) return

      const rect = el.getBoundingClientRect()

      const spacing = 110
      const rows = Math.ceil(rect.height / spacing) + 2
      const cols = Math.ceil((rect.width * 0.5) / spacing) + 2

      const shoppingIcons = [ShoppingCartIcon, TShirtIcon, HangerIcon]
      const shoppingPattern: IconPatternItem[] = []

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const xOffset = row % 2 === 0 ? 0 : spacing / 2
          const rotationIndex = (row + col) % 4
          const rotation =
            rotationIndex === 0
              ? 12
              : rotationIndex === 1
                ? -12
                : rotationIndex === 2
                  ? 18
                  : -18

          shoppingPattern.push({
            Icon: shoppingIcons[(row * cols + col) % shoppingIcons.length],
            x: col * spacing + xOffset,
            y: row * spacing + 10,
            rotation,
            id: `shopping-${row}-${col}`,
          })
        }
      }

      setIconPatterns({ shopping: shoppingPattern })
    }

    const handleResize = () => {
      setIsMobile(window.innerWidth < 720)
      generatePatterns()
    }

    handleResize()
    window.addEventListener("resize", handleResize)

    return () => window.removeEventListener("resize", handleResize)
  }, [mounted])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const now = performance.now()
      if (now - lastMoveTimeRef.current < 32) return
      lastMoveTimeRef.current = now

      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()

      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      setMousePosition({ x, y })

      let newActiveSide: "left" | "right"
      if (isMobile) {
        const midpoint = rect.height / 2
        newActiveSide = y < midpoint ? "left" : "right"
      } else {
        const topX = 45
        const bottomX = 55
        const lineXAtY = topX + ((bottomX - topX) * y) / rect.height
        const mouseXPercent = (x / rect.width) * 100
        newActiveSide = mouseXPercent < lineXAtY ? "left" : "right"
      }

      if (newActiveSide !== activeSide) {
        setActiveSide(newActiveSide)
      }
    },
    [isMobile, activeSide]
  )

  const partnerBrands = [
    "GUCCI",
    "PRADA",
    "VERSACE",
    "DIOR",
    "CHANEL",
    "BALENCIAGA",
    "FENDI",
    "GIVENCHY",
    "VALENTINO",
    "BURBERRY",
    "SAINT LAURENT",
    "BOTTEGA VENETA",
  ]

  const getIconGlowIntensity = (
    iconX: number,
    iconY: number,
    section: "left" | "right"
  ) => {
    if (activeSide !== section) return 0
    const dx = mousePosition.x - iconX
    const dy = mousePosition.y - iconY
    const distance = Math.sqrt(dx * dx + dy * dy)
    const maxDistance = 210
    if (distance > maxDistance) return 0
    return 1 - distance / maxDistance
  }

  const getIconTilt = (idx: number) => {
    const seed = idx * 137.508
    const direction = Math.cos(seed) > 0 ? 1 : -1
    return 20 * direction
  }

  const handleCardClick = (path: string) => {
    router.push(`/sign-in?redirect_url=${encodeURIComponent(path)}`)
  }

  const handleSectionClick = (section: "left" | "right") => {
    setActiveSide(section)
  }

  if (!mounted) return null

  const leftClipDesktop = "polygon(0 0, 45% 0, 55% 100%, 0 100%)"
  const rightClipDesktop = "polygon(45% 0, 100% 0, 100% 100%, 55% 100%)"
  const leftClipMobile = "polygon(0 0, 100% 0, 100% 50%, 0 50%)"
  const rightClipMobile = "polygon(0 50%, 100% 50%, 100% 100%, 0 100%)"

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden bg-neutral-950 flex flex-col"
      onMouseMove={handleMouseMove}
    >
      <FPSMonitor />
      <div className="flex-1 relative">
        {/* LEFT SECTION */}
        <div
          className="absolute inset-0 transition-all duration-300 ease-out cursor-pointer"
          style={{
            clipPath: isMobile ? leftClipMobile : leftClipDesktop,
            transform: activeSide === "left" ? "scale(1.02)" : "scale(1)",
            boxShadow:
              activeSide === "left"
                ? "0 20px 60px rgba(0, 0, 0, 0.15)"
                : "none",
          }}
          onClick={() => handleSectionClick("left")}
        >
          <div className="absolute inset-0">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to right, #a8c5c5 0%, #c8d4d0 25%, #d8d4cc 50%, #e4d0c4 75%, #f0d4c8 100%)",
              }}
            />
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23paper)' /%3E%3C/svg%3E\")",
              }}
            />
            <div
              className="absolute inset-0 opacity-20"
              style={{
                background:
                  "radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.08) 100%)",
              }}
            />
          </div>

          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {iconPatterns.shopping.map((item, idx) => {
              const glowIntensity = getIconGlowIntensity(item.x, item.y, "left")
              const hasEffect = glowIntensity > 0
              const tilt = hasEffect ? getIconTilt(idx) : 0

              return (
                <div
                  key={item.id}
                  className="absolute"
                  style={{
                    left: item.x,
                    top: item.y,
                    transform: `rotate(${item.rotation + tilt}deg)`,
                    opacity: hasEffect ? 0.12 + glowIntensity * 0.9 : 0.12,
                    filter: hasEffect
                      ? `drop-shadow(0 0 ${4 + glowIntensity * 10}px rgba(${shoppingColor.r}, ${shoppingColor.g}, ${shoppingColor.b}, ${glowIntensity}))`
                      : "none",
                    transition:
                      "opacity 180ms ease-out, filter 220ms ease-out, transform 220ms ease-out",
                  }}
                >
                  <item.Icon
                    color={
                      hasEffect
                        ? `rgba(${shoppingColor.r}, ${shoppingColor.g}, ${shoppingColor.b}, ${0.5 + glowIntensity * 0.5
                        })`
                        : "#78716c"
                    }
                    size={40}
                    strokeWidth={hasEffect ? 1.6 + glowIntensity * 0.7 : 1.5}
                  />
                </div>
              )
            })}
          </div>

          {activeSide === "left" && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              style={{
                border: "3px solid #d4af37",
                clipPath: isMobile ? leftClipMobile : leftClipDesktop,
                boxShadow: "inset 0 0 80px rgba(212, 175, 55, 0.15)",
              }}
            />
          )}
        </div>

        {/* RIGHT SECTION */}
        <div
          className="absolute inset-0 transition-all duration-300 ease-out cursor-pointer"
          style={{
            clipPath: isMobile ? rightClipMobile : rightClipDesktop,
            transform: activeSide === "right" ? "scale(1.02)" : "scale(1)",
            boxShadow:
              activeSide === "right"
                ? "0 20px 60px rgba(0, 0, 0, 0.3)"
                : "none",
          }}
          onClick={() => handleSectionClick("right")}
        >
          {/* Make this container relative so z-indices inside work properly */}
          <div className="absolute inset-0 relative">
            {/* base gradient at the back */}
            <div
              className="absolute inset-0 z-0"
              style={{
                background:
                  "linear-gradient(to left, #1a1a1a 0%, #252525 25%, #303030 50%, #3a3a3a 75%, #4a4a4a 100%)",
              }}
            />

            {/* carbon texture - subtle, below particles */}
            <div
              className="absolute inset-0 z-5 opacity-[0.04]"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='carbon'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23carbon)' /%3E%3C/svg%3E\")",
              }}
            />

            {/* vignette - below particles */}
            <div
              className="absolute inset-0 z-8 opacity-30 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.4) 100%)",
              }}
            />
          </div>

          {activeSide === "right" && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              style={{
                border: "3px solid #c0c0c0",
                clipPath: isMobile ? rightClipMobile : rightClipDesktop,
                boxShadow: "inset 0 0 80px rgba(192, 192, 192, 0.12)",
              }}
            />
          )}
        </div>

        {/* Particles - outside clipped container with its own clipPath */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            clipPath: isMobile ? rightClipMobile : rightClipDesktop,
          }}
        >
          <PlatformParticles className="z-50 mix-blend-screen opacity-60" />
        </div>

        {/* CENTRAL CARDS */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center gap-16 px-16">
          {/* Shopping card */}
          <div
            onClick={() => handleCardClick("/shop")}
            className="pointer-events-auto group relative w-[400px] bg-gradient-to-br from-[#f5f0ed]/95 to-[#e8e4e0]/95 backdrop-blur-sm rounded-3xl shadow-2xl hover:shadow-pink-500/20 transition-all duration-500 hover:scale-[1.02] cursor-pointer p-10"
          >
            <div className="mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-pink-500/50 transition-all duration-300 group-hover:rotate-3">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-3xl font-semibold text-gray-900 mb-2">
              Shop on COVE
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed mb-8">
              Discover curated luxury collections powered by AI recommendations
              tailored to your style.
            </p>
            <div className="flex items-center gap-2 text-pink-600 font-medium group-hover:gap-3 transition-all">
              <span>Explore Now</span>
              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </div>
          </div>

          {/* Platform card */}
          <div
            onClick={() => handleCardClick("/partner-onboarding")}
            className="pointer-events-auto group relative w-[400px] bg-gradient-to-br from-[#2a2a2a]/95 to-[#1a1a1a]/95 backdrop-blur-sm rounded-3xl shadow-2xl hover:shadow-green-500/20 transition-all duration-500 hover:scale-[1.02] cursor-pointer p-10"
          >
            <div className="mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-green-500/50 transition-all duration-300 group-hover:rotate-3">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-3xl font-semibold text-white mb-2">
              Sell on COVE
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-8">
              Grow your brand with AI-powered analytics and access to premium
              luxury shoppers.
            </p>
            <div className="flex items-center gap-2 text-green-400 font-medium group-hover:gap-3 transition-all">
              <span>Join Platform</span>
              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BRAND TICKER */}
      <div className="h-[5vh] bg-neutral-100 relative overflow-hidden flex-shrink-0">
        <div className="h-full flex items-center justify-center">
          <div className="relative w-full overflow-hidden">
            <motion.div
              className="flex gap-12 items-center"
              animate={{ x: [0, -1920] }}
              transition={{
                x: {
                  repeat: Infinity,
                  repeatType: "loop",
                  duration: 30,
                  ease: "linear",
                },
              }}
            >
              {[...partnerBrands, ...partnerBrands, ...partnerBrands].map(
                (brand, idx) => (
                  <div
                    key={idx}
                    className="text-xl font-bold text-neutral-400 whitespace-nowrap tracking-wider"
                  >
                    {brand}
                  </div>
                )
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
