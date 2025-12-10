"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ShoppingCartIcon, TShirtIcon, HangerIcon } from '@/src/components/icons/ShoppingIcons'
import { LaptopIcon, DollarIcon, RobotIcon } from '@/src/components/icons/PlatformIcons'
import FPSMonitor from '@/src/components/FPSMonitor'

export default function WelcomePage() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const firstEntryPointRef = useRef<{ x: number, y: number, section: 'left' | 'right' } | null>(null)

  const [activeSide, setActiveSide] = useState<'left' | 'right' | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [iconPatterns, setIconPatterns] = useState<{ shopping: any[], platform: any[] }>({ shopping: [], platform: [] })
  const [mousePosition, setMousePosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 })
  const [waveOrigin, setWaveOrigin] = useState<{ x: number, y: number, timestamp: number, section: 'left' | 'right' } | null>(null)
  const [, forceUpdate] = useState(0)
  const lastMoveTimeRef = useRef(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Animation loop for smooth wave
  useEffect(() => {
    if (!waveOrigin) return

    let animationFrameId: number
    const animate = () => {
      forceUpdate(n => n + 1)
      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [waveOrigin])

  // Auto-trigger wave when section becomes active (from mouse entry point)
  useEffect(() => {
    if (!mounted || !containerRef.current || !activeSide) return

    const entryPoint = firstEntryPointRef.current
    const x = entryPoint?.section === activeSide ? entryPoint.x : (activeSide === 'left' ? window.innerWidth * 0.25 : window.innerWidth * 0.75)
    const y = entryPoint?.section === activeSide ? entryPoint.y : window.innerHeight * 0.5

    setWaveOrigin({ x, y, timestamp: Date.now(), section: activeSide })

    const timer = setTimeout(() => setWaveOrigin(null), 2000)
    return () => clearTimeout(timer)
  }, [activeSide, mounted])

  useEffect(() => {
    if (!mounted || !containerRef.current) return

    const generatePatterns = () => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const spacing = 120 // Increased from 80 to reduce icon count by ~50%
      const rows = Math.ceil(rect.height / spacing) + 2
      const cols = Math.ceil((rect.width * 0.5) / spacing) + 2

      const shoppingIcons = [ShoppingCartIcon, TShirtIcon, HangerIcon]
      const platformIcons = [LaptopIcon, DollarIcon, RobotIcon]

      const shoppingPattern = []
      const platformPattern = []

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const xOffset = row % 2 === 0 ? 0 : spacing / 2
          const rotation = (row + col) % 4 === 0 ? 15 : (row + col) % 4 === 1 ? -15 : (row + col) % 4 === 2 ? 25 : -20

          shoppingPattern.push({
            Icon: shoppingIcons[(row * cols + col) % shoppingIcons.length],
            x: (col * spacing) + xOffset,
            y: row * spacing,
            rotation,
            id: `shopping-${row}-${col}`,
          })

          platformPattern.push({
            Icon: platformIcons[(row * cols + col) % platformIcons.length],
            x: rect.width * 0.55 + (col * spacing) + xOffset,
            y: row * spacing,
            rotation,
            id: `platform-${row}-${col}`,
          })
        }
      }

      setIconPatterns({ shopping: shoppingPattern, platform: platformPattern })
    }

    const handleResize = () => {
      setIsMobile(window.innerWidth < 720)
      generatePatterns()
    }

    const handleMouseMove = (e: MouseEvent) => {
      // Throttle to 60fps (16.67ms) for performance
      const now = Date.now()
      if (now - lastMoveTimeRef.current < 16) return
      lastMoveTimeRef.current = now

      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      setMousePosition({ x, y })

      let newActiveSide: 'left' | 'right'
      if (isMobile) {
        const midpoint = rect.height / 2
        newActiveSide = y < midpoint ? 'left' : 'right'
      } else {
        const topX = 45
        const bottomX = 55
        const lineXAtY = topX + ((bottomX - topX) * (y / rect.height))
        const mouseXPercent = (x / rect.width) * 100
        newActiveSide = mouseXPercent < lineXAtY ? 'left' : 'right'
      }

      // Track first entry point when switching sections (using ref to avoid re-renders)
      if (newActiveSide !== activeSide) {
        firstEntryPointRef.current = { x, y, section: newActiveSide }
      }

      setActiveSide(newActiveSide)
    }

    generatePatterns()
    handleResize()

    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
    }
  }, [mounted, isMobile, activeSide])

  const partnerBrands = [
    'GUCCI', 'PRADA', 'VERSACE', 'DIOR', 'CHANEL', 'BALENCIAGA', 'FENDI', 'GIVENCHY',
    'VALENTINO', 'BURBERRY', 'SAINT LAURENT', 'BOTTEGA VENETA'
  ]

  const getIconGlowIntensity = (iconX: number, iconY: number, section: 'left' | 'right') => {
    if (activeSide !== section) return 0

    const distance = Math.sqrt(
      Math.pow(mousePosition.x - iconX, 2) + Math.pow(mousePosition.y - iconY, 2)
    )
    const maxDistance = 225

    if (distance > maxDistance) return 0

    return 1 - (distance / maxDistance)
  }

  const getWaveIntensity = (iconX: number, iconY: number, section: 'left' | 'right') => {
    if (!waveOrigin || waveOrigin.section !== section) return 0

    const distanceFromOrigin = Math.sqrt(
      Math.pow(iconX - waveOrigin.x, 2) +
      Math.pow(iconY - waveOrigin.y, 2)
    )

    const elapsed = Date.now() - waveOrigin.timestamp
    const waveSpeed = 900
    const waveFront = (elapsed / 1000) * waveSpeed

    if (distanceFromOrigin <= waveFront) {
      const timeSinceHit = waveFront - distanceFromOrigin
      const fadeOutDuration = 300

      if (timeSinceHit < fadeOutDuration) {
        const fadeIntensity = 1 - (timeSinceHit / fadeOutDuration)

        // Distance-based falloff: icons farther from cursor glow less
        const distanceFromCursor = Math.sqrt(
          Math.pow(iconX - mousePosition.x, 2) +
          Math.pow(iconY - mousePosition.y, 2)
        )
        const maxDistance = 800
        const distanceFalloff = Math.max(0, 1 - (distanceFromCursor / maxDistance))

        // Reduce intensity to 0.7x
        return Math.pow(fadeIntensity, 0.4) * (0.3 + distanceFalloff * 0.7) * 0.7
      }
    }

    return 0
  }

  // Get fixed 20 degree tilt for each icon (consistent per icon)
  const getIconTilt = (idx: number) => {
    const seed = idx * 137.508
    const degrees = 20 // Fixed 20 degrees
    const direction = Math.cos(seed) > 0 ? 1 : -1
    return degrees * direction
  }

  const handleCardClick = (path: string) => {
    router.push(`/sign-in?redirect_url=${encodeURIComponent(path)}`)
  }

  const handleSectionClick = (e: React.MouseEvent, section: 'left' | 'right') => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setWaveOrigin({ x, y, timestamp: Date.now(), section })
    setTimeout(() => setWaveOrigin(null), 2000)
  }

  if (!mounted) return null

  const leftClipDesktop = 'polygon(0 0, 45% 0, 55% 100%, 0 100%)'
  const rightClipDesktop = 'polygon(45% 0, 100% 0, 100% 100%, 55% 100%)'
  const leftClipMobile = 'polygon(0 0, 100% 0, 100% 50%, 0 50%)'
  const rightClipMobile = 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)'

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden bg-neutral-950 flex flex-col">
      <FPSMonitor />
      <div className="flex-1 relative">
        <div
          className="absolute inset-0 transition-all duration-300 ease-out cursor-pointer"
          style={{
            clipPath: isMobile ? leftClipMobile : leftClipDesktop,
            transform: activeSide === 'left' ? 'scale(1.02)' : 'scale(1)',
            boxShadow: activeSide === 'left' ? '0 20px 60px rgba(0, 0, 0, 0.15)' : 'none',
          }}
          onClick={(e) => handleSectionClick(e, 'left')}
        >
          <div className="absolute inset-0">
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to right, #a8c5c5 0%, #c8d4d0 25%, #d8d4cc 50%, #e4d0c4 75%, #f0d4c8 100%)',
              }}
            />

            <div
              className="absolute inset-0 opacity-[0.025]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23paper)' /%3E%3C/svg%3E")`,
              }}
            />

            <div
              className="absolute inset-0 opacity-20"
              style={{
                background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.08) 100%)',
              }}
            />
          </div>

          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {iconPatterns.shopping.map((item, idx) => {
              const glowIntensity = getIconGlowIntensity(item.x, item.y, 'left')
              const waveIntensity = getWaveIntensity(item.x, item.y, 'left')
              const totalIntensity = Math.max(glowIntensity, waveIntensity)
              const hasEffect = totalIntensity > 0
              const tilt = glowIntensity > 0 ? getIconTilt(idx) : 0

              return (
                <div
                  key={idx}
                  className="absolute transition-all duration-200"
                  style={{
                    left: `${item.x}px`,
                    top: `${item.y}px`,
                    transform: `rotate(${item.rotation + tilt}deg)`,
                    opacity: hasEffect ? 0.08 + (totalIntensity * 0.7) : 0.08,
                    filter: hasEffect ? `drop-shadow(0 0 ${6 + totalIntensity * 14}px rgba(219, 39, 119, ${totalIntensity}))` : 'none',
                  }}
                >
                  <item.Icon
                    color={hasEffect ? `rgba(219, 39, 119, ${0.5 + totalIntensity * 0.5})` : "#78716c"}
                    size={58}
                    strokeWidth={hasEffect ? 1.5 + (totalIntensity * 0.8) : 1.5}
                  />
                </div>
              )
            })}
          </div>

          {activeSide === 'left' && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              style={{
                border: '3px solid #d4af37',
                clipPath: isMobile ? leftClipMobile : leftClipDesktop,
                boxShadow: 'inset 0 0 80px rgba(212, 175, 55, 0.15)',
              }}
            />
          )}
        </div>

        <div
          className="absolute inset-0 transition-all duration-300 ease-out cursor-pointer"
          style={{
            clipPath: isMobile ? rightClipMobile : rightClipDesktop,
            transform: activeSide === 'right' ? 'scale(1.02)' : 'scale(1)',
            boxShadow: activeSide === 'right' ? '0 20px 60px rgba(0, 0, 0, 0.3)' : 'none',
          }}
          onClick={(e) => handleSectionClick(e, 'right')}
        >
          <div className="absolute inset-0">
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to left, #1a1a1a 0%, #252525 25%, #303030 50%, #3a3a3a 75%, #4a4a4a 100%)',
              }}
            />

            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='carbon'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23carbon)' /%3E%3C/svg%3E")`,
              }}
            />

            <div
              className="absolute inset-0 opacity-30"
              style={{
                background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.4) 100%)',
              }}
            />
          </div>

          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {iconPatterns.platform.map((item, idx) => {
              const glowIntensity = getIconGlowIntensity(item.x, item.y, 'right')
              const waveIntensity = getWaveIntensity(item.x, item.y, 'right')
              const totalIntensity = Math.max(glowIntensity, waveIntensity)
              const hasEffect = totalIntensity > 0
              const tilt = glowIntensity > 0 ? getIconTilt(idx) : 0

              return (
                <div
                  key={idx}
                  className="absolute transition-all duration-200"
                  style={{
                    left: `${item.x}px`,
                    top: `${item.y}px`,
                    transform: `rotate(${item.rotation + tilt}deg)`,
                    opacity: hasEffect ? 0.12 + (totalIntensity * 0.8) : 0.12,
                    filter: hasEffect ? `drop-shadow(0 0 ${6 + totalIntensity * 14}px rgba(16, 185, 129, ${totalIntensity}))` : 'none',
                  }}
                >
                  <item.Icon
                    color={hasEffect ? `rgba(16, 185, 129, ${0.6 + totalIntensity * 0.4})` : "#a3a3a3"}
                    size={58}
                    strokeWidth={hasEffect ? 1.5 + (totalIntensity * 0.8) : 1.5}
                  />
                </div>
              )
            })}
          </div>

          {activeSide === 'right' && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              style={{
                border: '3px solid #c0c0c0',
                clipPath: isMobile ? rightClipMobile : rightClipDesktop,
                boxShadow: 'inset 0 0 80px rgba(192, 192, 192, 0.12)',
              }}
            />
          )}
        </div>

        {/* Elegant Cards - Floating over diagonal sections */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center gap-16 px-16">
          {/* Shopping Card */}
          <div
            onClick={() => handleCardClick('/shop')}
            className="pointer-events-auto group relative w-[400px] bg-gradient-to-br from-[#f5f0ed]/95 to-[#e8e4e0]/95 backdrop-blur-sm rounded-3xl shadow-2xl hover:shadow-pink-500/20 transition-all duration-500 hover:scale-[1.02] cursor-pointer p-10"
          >
            {/* Icon */}
            <div className="mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-pink-500/50 transition-all duration-300 group-hover:rotate-3">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-3xl font-semibold text-gray-900 mb-2">
              Shop on COVE
            </h2>

            {/* Description */}
            <p className="text-gray-600 text-sm leading-relaxed mb-8">
              Discover curated luxury collections powered by AI recommendations tailored to your style.
            </p>

            {/* CTA */}
            <div className="flex items-center gap-2 text-pink-600 font-medium group-hover:gap-3 transition-all">
              <span>Explore Now</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </div>
          </div>

          {/* Platform Card */}
          <div
            onClick={() => handleCardClick('/partner-onboarding')}
            className="pointer-events-auto group relative w-[400px] bg-gradient-to-br from-[#2a2a2a]/95 to-[#1a1a1a]/95 backdrop-blur-sm rounded-3xl shadow-2xl hover:shadow-green-500/20 transition-all duration-500 hover:scale-[1.02] cursor-pointer p-10"
          >
            {/* Icon */}
            <div className="mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-green-500/50 transition-all duration-300 group-hover:rotate-3">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-3xl font-semibold text-white mb-2">
              Sell on COVE
            </h2>

            {/* Description */}
            <p className="text-gray-400 text-sm leading-relaxed mb-8">
              Grow your brand with AI-powered analytics and access to premium luxury shoppers.
            </p>

            {/* CTA */}
            <div className="flex items-center gap-2 text-green-400 font-medium group-hover:gap-3 transition-all">
              <span>Join Platform</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </div>
          </div>
        </div>
      </div>

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
              {[...partnerBrands, ...partnerBrands, ...partnerBrands].map((brand, idx) => (
                <div
                  key={idx}
                  className="text-xl font-bold text-neutral-400 whitespace-nowrap tracking-wider"
                >
                  {brand}
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
