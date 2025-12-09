"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ShoppingCartIcon, TShirtIcon, HangerIcon } from '@/src/components/icons/ShoppingIcons'
import { LaptopIcon, DollarIcon, RobotIcon } from '@/src/components/icons/PlatformIcons'

export default function WelcomePage() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)

  const [activeSide, setActiveSide] = useState<'left' | 'right' | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [iconPatterns, setIconPatterns] = useState<{ shopping: any[], platform: any[] }>({ shopping: [], platform: [] })
  const [mousePosition, setMousePosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 })

  useEffect(() => {
    setMounted(true)
  }, [])

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

      if (isMobile) {
        const midpoint = rect.height / 2
        setActiveSide(y < midpoint ? 'left' : 'right')
      } else {
        const topX = 45
        const bottomX = 55
        const lineXAtY = topX + ((bottomX - topX) * (y / rect.height))
        const mouseXPercent = (x / rect.width) * 100

        setActiveSide(mouseXPercent < lineXAtY ? 'left' : 'right')
      }
    }

    generatePatterns()
    handleResize()

    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
    }
  }, [mounted, isMobile])

  const partnerBrands = [
    'GUCCI', 'PRADA', 'VERSACE', 'DIOR', 'CHANEL', 'BALENCIAGA', 'FENDI', 'GIVENCHY',
    'VALENTINO', 'BURBERRY', 'SAINT LAURENT', 'BOTTEGA VENETA'
  ]

  // Calculate proximity-based glow intensity
  const getIconGlowIntensity = (iconX: number, iconY: number) => {
    const distance = Math.sqrt(
      Math.pow(mousePosition.x - iconX, 2) + Math.pow(mousePosition.y - iconY, 2)
    )
    const maxDistance = 225 // radius in pixels (1.5x larger)

    if (distance > maxDistance) return 0

    // Inverse relationship: closer = stronger glow
    return 1 - (distance / maxDistance)
  }

  // Generate random tilt for icon on hover
  const getRandomTilt = () => {
    const degrees = Math.random() * 4 + 1 // 1-5 degrees
    const direction = Math.random() > 0.5 ? 1 : -1 // random left or right
    return degrees * direction
  }

  if (!mounted) return null

  const leftClipDesktop = 'polygon(0 0, 45% 0, 55% 100%, 0 100%)'
  const rightClipDesktop = 'polygon(45% 0, 100% 0, 100% 100%, 55% 100%)'
  const leftClipMobile = 'polygon(0 0, 100% 0, 100% 50%, 0 50%)'
  const rightClipMobile = 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)'

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden bg-neutral-950 flex flex-col">
      <div className="flex-1 relative">
        {/* Left Side - CleanPro Pastel Gradient */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: isMobile ? leftClipMobile : leftClipDesktop,
          }}
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
              const glowIntensity = getIconGlowIntensity(item.x, item.y)
              const hasGlow = glowIntensity > 0
              const tilt = hasGlow ? getRandomTilt() : 0

              return (
                <div
                  key={idx}
                  className="absolute transition-all duration-300"
                  style={{
                    left: `${item.x}px`,
                    top: `${item.y}px`,
                    transform: `rotate(${item.rotation + tilt}deg)`,
                    opacity: hasGlow ? 0.08 + (glowIntensity * 0.5) : 0.08,
                    filter: hasGlow ? `drop-shadow(0 0 ${4 + glowIntensity * 10}px rgba(219, 39, 119, ${glowIntensity * 0.9}))` : 'none',
                  }}
                >
                  <item.Icon
                    color={hasGlow ? `rgba(219, 39, 119, ${0.4 + glowIntensity * 0.6})` : "#78716c"}
                    size={32}
                    strokeWidth={hasGlow ? 1.5 + (glowIntensity * 0.7) : 1.5}
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

        {/* Right Side - Darker Richer Gradient */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: isMobile ? rightClipMobile : rightClipDesktop,
          }}
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
              const glowIntensity = getIconGlowIntensity(item.x, item.y)
              const hasGlow = glowIntensity > 0
              const tilt = hasGlow ? getRandomTilt() : 0

              return (
                <div
                  key={idx}
                  className="absolute transition-all duration-300"
                  style={{
                    left: `${item.x}px`,
                    top: `${item.y}px`,
                    transform: `rotate(${item.rotation + tilt}deg)`,
                    opacity: hasGlow ? 0.12 + (glowIntensity * 0.6) : 0.12,
                    filter: hasGlow ? `drop-shadow(0 0 ${4 + glowIntensity * 10}px rgba(16, 185, 129, ${glowIntensity * 0.9}))` : 'none',
                  }}
                >
                  <item.Icon
                    color={hasGlow ? `rgba(16, 185, 129, ${0.5 + glowIntensity * 0.5})` : "#a3a3a3"}
                    size={32}
                    strokeWidth={hasGlow ? 1.5 + (glowIntensity * 0.7) : 1.5}
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

      {/* Footer */}
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
