"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ShoppingCartIcon, TShirtIcon, HangerIcon } from '@/src/components/icons/ShoppingIcons'
import { LaptopIcon, DollarIcon, RobotIcon } from '@/src/components/icons/PlatformIcons'

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
      const spacing = 80
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
                    size={32}
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
                    size={32}
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
