
// 'use client'

// import { useRef, useEffect } from 'react'
// import { motion, useMotionValue, useSpring } from 'framer-motion'

// export default function FeaturesSection() {
//   const containerRef = useRef<HTMLDivElement | null>(null)
//   const textRef = useRef<HTMLParagraphElement | null>(null)

//   const x = useMotionValue(0)
//   const y = useMotionValue(0)
//   const blobSize = useMotionValue(40)

//   const springX = useSpring(x, { stiffness: 300, damping: 25 })
//   const springY = useSpring(y, { stiffness: 300, damping: 25 })
//   const springSize = useSpring(blobSize, { stiffness: 300, damping: 25 })

//   const clipPath = useMotionValue(`circle(20px at 0px 0px)`)

//   useEffect(() => {
//     const handleMouseMove = (e: MouseEvent) => {
//       if (!containerRef.current || !textRef.current) return

//       const containerRect = containerRef.current.getBoundingClientRect()
//       const localX = e.clientX - containerRect.left
//       const localY = e.clientY - containerRect.top
//       x.set(localX)
//       y.set(localY)

//       const textRect = textRef.current.getBoundingClientRect()
//       const isHoveringText =
//         e.clientX >= textRect.left &&
//         e.clientX <= textRect.right &&
//         e.clientY >= textRect.top &&
//         e.clientY <= textRect.bottom

//       blobSize.set(isHoveringText ? 160 : 40)
//     }

//     const updateClipPath = () => {
//       const cx = x.get()
//       const cy = y.get()
//       const s = springSize.get()
//       clipPath.set(`circle(${s / 2}px at ${cx}px ${cy}px)`)
//     }

//     const node = containerRef.current
//     if (node) {
//       node.addEventListener('mousemove', handleMouseMove)
//     }

//     const interval = setInterval(updateClipPath, 16) // ~60fps

//     return () => {
//       if (node) node.removeEventListener('mousemove', handleMouseMove)
//       clearInterval(interval)
//     }
//   }, [springX, springY, springSize, clipPath])

//   return (
//     <section className="min-h-screen w-full flex items-center justify-center bg-[#f8f8f8] px-6">
//       <div
//         ref={containerRef}
//         className="relative w-[50vw] h-[50vh] overflow-hidden shadow-lg bg-black cursor-none rounded-xl"
//       >
//         {/* 🔴 Blob Pointer (no mask, no svg) */}
//         {/* <motion.div
//           className="absolute z-50 bg-[#f87171] pointer-events-none"
//           style={{
//             width: springSize,
//             height: springSize,
//             borderRadius: '9999px',
//             left: springX,
//             top: springY,
//             transform: 'translate(-50%, -50%)',
//           }}
//         /> */}

//         {/* 🅰 Default Text Layer */}
//         <div className="absolute inset-0 bg-black p-8 flex items-center justify-center text-white z-0">
//           <p
//             ref={textRef}
//             className="text-lg text-center leading-relaxed max-w-[90%]"
//           >
//             This is the future of fashion tech. <strong>Cove</strong> is where your identity meets innovation.<br />
//             Our blob doesn’t just follow — it <em>becomes you</em>.<br />
//             Forget the old pointer. <strong>Wear the motion.</strong>
//           </p>
//         </div>

//         {/* 🅱 Revealed Text B via clip-path */}
//         <motion.div
//           className="absolute inset-0 p-8 flex items-center justify-center text-black bg-[#f87171] z-10"
//           style={{
//             clipPath,
//             WebkitClipPath: clipPath,
//           }}
//         >
//           <p className="text-lg text-center leading-relaxed max-w-[90%] font-bold italic">
//             Experience <strong>the future</strong> of style. <em>Cove</em> wraps technology in fashion.<br />
//             Explore bold identity and comfort with our interactive experience.<br />
//             You're not just wearing clothes — you're <strong>wearing innovation</strong>.
//           </p>
//         </motion.div>
//       </div>
//     </section>
//   )
// }


'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring, animate } from 'framer-motion'

type Particle = { id: number; x: number; y: number; delay: number }

export default function FeaturesSection() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const textRef = useRef<HTMLParagraphElement | null>(null)

  const [particles, setParticles] = useState<Particle[]>([])
  const [showBlob, setShowBlob] = useState(true)

  const x = useMotionValue(200)
  const y = useMotionValue(100)
  const blobSize = useMotionValue(40)

  const springX = useSpring(x, { stiffness: 300, damping: 25 })
  const springY = useSpring(y, { stiffness: 300, damping: 25 })
  const springSize = useSpring(blobSize, { stiffness: 300, damping: 25 })

  const clipPath = useMotionValue(`circle(20px at 200px 100px)`)

  useEffect(() => {
    const updateClipPath = () => {
      const cx = x.get()
      const cy = y.get()
      const s = springSize.get()
      clipPath.set(`circle(${s / 2}px at ${cx}px ${cy}px)`)
    }
    const interval = setInterval(updateClipPath, 16)
    return () => clearInterval(interval)
  }, [x, y, springSize])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !textRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const radius = springSize.get() / 2
      let localX = e.clientX - rect.left
      let localY = e.clientY - rect.top

      localX = Math.max(radius, Math.min(rect.width - radius, localX))
      localY = Math.max(radius, Math.min(rect.height - radius, localY))

      x.set(localX)
      y.set(localY)

      const textRect = textRef.current.getBoundingClientRect()
      const hovering =
        e.clientX >= textRect.left &&
        e.clientX <= textRect.right &&
        e.clientY >= textRect.top &&
        e.clientY <= textRect.bottom

      blobSize.set(hovering ? 160 : 40)
    }

    const handleMouseEnter = () => {
      setShowBlob(true)
      setParticles([])
    }

    const handleMouseLeave = () => {
      setShowBlob(false)
      const centerX = x.get()
      const centerY = y.get()

      const newParticles: Particle[] = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: Math.random() * 300 - 150,
        y: Math.random() * 300 - 150,
        delay: Math.random() * 0.2,
        scale: Math.random() * 1.2 + 0.5, // scale from 0.5 to 1.7
      }))

      setParticles(newParticles)

      setTimeout(() => setParticles([]), 1000)
    }

    const node = containerRef.current
    node?.addEventListener('mousemove', handleMouseMove)
    node?.addEventListener('mouseenter', handleMouseEnter)
    node?.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      node?.removeEventListener('mousemove', handleMouseMove)
      node?.removeEventListener('mouseenter', handleMouseEnter)
      node?.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [x, y, springSize])

  return (
    <section className="min-h-screen w-full flex items-center justify-center bg-[#f8f8f8] px-6">
      <div
        ref={containerRef}
        className="relative w-[50vw] h-[50vh] overflow-hidden shadow-lg bg-black cursor-none rounded-xl"
      >
        {/* Default Text */}
        <div className="absolute inset-0 bg-black p-8 flex items-center justify-center text-white z-0">
          <p ref={textRef} className="text-lg text-center leading-relaxed max-w-[90%]">
            This is the future of fashion tech. <strong>Cove</strong> is where your identity meets innovation.<br />
            Our blob doesn’t just follow — it <em>becomes you</em>.<br />
            Forget the old pointer. <strong>Wear the motion.</strong>
          </p>
        </div>

        {/* Text B: blob-reveal */}
        {showBlob && (
          <motion.div
            className="absolute inset-0 p-8 flex items-center justify-center text-black bg-[#f87171] z-10"
            style={{
              clipPath,
              WebkitClipPath: clipPath,
            }}
          >
            <p className="text-lg text-center leading-relaxed max-w-[90%] font-bold italic">
              Experience <strong>the future</strong> of style. <em>Cove</em> wraps technology in fashion.<br />
              Explore bold identity and comfort with our interactive experience.<br />
              You're not just wearing clothes — you're <strong>wearing innovation</strong>.
            </p>
          </motion.div>
        )}

        {/* 💥 Blob explosion fragments */}
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 1, x: springX.get(), y: springY.get(), scale: 1 }}
            animate={{
              x: springX.get() + p.x,
              y: springY.get() + p.y,
              opacity: 0,
              scale: 0.3,
            }}
            transition={{ duration: 0.8, delay: p.delay, ease: 'easeOut' }}
            className="absolute w-4 h-4 rounded-full bg-[#f87171] pointer-events-none z-50"
          />
        ))}
      </div>
    </section>
  )
}
