// "use client"

// import { useEffect, useRef } from "react"

// interface ParticleWaveProps {
//     particleCount?: number
//     radiusBase?: number
//     className?: string
// }

// class Particle {
//     index: number
//     angle: number
//     radius: number
//     baseRadius: number
//     speed: number
//     offset: number
//     size: number
//     color: string
//     x: number = 0
//     y: number = 0

//     constructor(index: number, particleCount: number, radiusBase: number) {
//         this.index = index
//         this.angle = (Math.PI * 2 * index) / particleCount
//         this.radius = radiusBase + Math.random() * 50
//         this.baseRadius = this.radius
//         this.speed = Math.random() * 0.002 + 0.001
//         this.offset = Math.random() * Math.PI * 2
//         this.size = Math.random() * 2 + 0.5

//         const isBlue = Math.random() > 0.3
//         this.color = isBlue
//             ? `rgba(37, 99, 235, ${Math.random() * 0.45 + 0.15})` // Blue-600
//             : `rgba(59, 130, 246, ${Math.random() * 0.45 + 0.15})` // Blue-500
//     }

//     update(time: number, width: number, height: number) {
//         this.angle += this.speed

//         const wave1 = Math.sin(this.angle * 3 + time * 0.5 + this.offset) * 30
//         const wave2 = Math.cos(this.angle * 5 - time * 0.3) * 15
//         const breath = Math.sin(time * 0.2) * 20

//         this.radius = this.baseRadius + wave1 + wave2 + breath

//         const cx = width / 2
//         const cy = height / 2.2

//         this.x = cx + Math.cos(this.angle) * this.radius
//         this.y = cy + Math.sin(this.angle) * (this.radius * 0.78)
//     }

//     draw(ctx: CanvasRenderingContext2D) {
//         ctx.beginPath()
//         ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
//         ctx.fillStyle = this.color
//         ctx.fill()
//     }
// }

// export default function ParticleWave({
//     particleCount = 180,
//     radiusBase = 240,
//     className = "",
// }: ParticleWaveProps) {
//     const canvasRef = useRef<HTMLCanvasElement>(null)
//     const particlesRef = useRef<Particle[]>([])
//     const timeRef = useRef(0)
//     const rafRef = useRef<number | null>(null)

//     useEffect(() => {
//         const canvas = canvasRef.current
//         if (!canvas) return
//         const ctx = canvas.getContext("2d")
//         if (!ctx) return

//         const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))

//         let width = 0
//         let height = 0

//         const initParticles = () => {
//             particlesRef.current = []
//             for (let i = 0; i < particleCount; i++) {
//                 particlesRef.current.push(new Particle(i, particleCount, radiusBase))
//             }
//         }

//         const resizeToParent = () => {
//             const parent = canvas.parentElement
//             if (!parent) return
//             const rect = parent.getBoundingClientRect()
//             width = Math.max(1, rect.width)
//             height = Math.max(1, rect.height)

//             canvas.width = Math.floor(width * dpr)
//             canvas.height = Math.floor(height * dpr)
//             canvas.style.width = "100%"
//             canvas.style.height = "100%"

//             ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
//             initParticles()
//         }

//         const ro = new ResizeObserver(() => resizeToParent())
//         if (canvas.parentElement) ro.observe(canvas.parentElement)

//         const animate = () => {
//             // subtle white trail
//             ctx.fillStyle = "rgba(255, 255, 255, 0.18)"
//             ctx.fillRect(0, 0, width, height)

//             for (const p of particlesRef.current) {
//                 p.update(timeRef.current, width, height)
//                 p.draw(ctx)
//             }

//             // web lines
//             ctx.strokeStyle = "rgba(37, 99, 235, 0.10)"
//             ctx.lineWidth = 0.6

//             for (let i = 0; i < particlesRef.current.length; i += 2) {
//                 const p1 = particlesRef.current[i]
//                 const p2 = particlesRef.current[(i + 1) % particlesRef.current.length]
//                 ctx.beginPath()
//                 ctx.moveTo(p1.x, p1.y)
//                 ctx.lineTo(p2.x, p2.y)
//                 ctx.stroke()
//             }

//             timeRef.current += 0.01
//             rafRef.current = requestAnimationFrame(animate)
//         }

//         resizeToParent()
//         animate()

//         return () => {
//             ro.disconnect()
//             if (rafRef.current) cancelAnimationFrame(rafRef.current)
//         }
//     }, [particleCount, radiusBase])

//     return (
//         <canvas
//             ref={canvasRef}
//             className={["absolute inset-0 w-full h-full pointer-events-none", className].join(" ")}
//         />
//     )
// }




// 'use client'

// import { useEffect, useRef } from 'react'

// interface ParticleWaveProps {
//     particleCount?: number
//     radiusBase?: number
//     className?: string
// }

// class Particle {
//     index: number
//     angle: number
//     radius: number
//     baseRadius: number
//     speed: number
//     offset: number
//     size: number
//     color: string
//     x: number = 0
//     y: number = 0

//     constructor(index: number, particleCount: number, radiusBase: number) {
//         this.index = index
//         this.angle = (Math.PI * 2 * index) / particleCount
//         this.radius = radiusBase + Math.random() * 50
//         this.baseRadius = this.radius
//         this.speed = Math.random() * 0.002 + 0.001
//         this.offset = Math.random() * Math.PI * 2
//         this.size = Math.random() * 2 + 0.5

//         // Pure Blue Colors
//         const isBlue = Math.random() > 0.3
//         this.color = isBlue
//             ? `rgba(37, 99, 235, ${Math.random() * 0.5 + 0.2})` // Blue-600
//             : `rgba(59, 130, 246, ${Math.random() * 0.5 + 0.2})` // Blue-500
//     }

//     update(time: number, width: number, height: number) {
//         // Rotation
//         this.angle += this.speed

//         // Wave motion
//         const wave1 = Math.sin(this.angle * 3 + time * 0.5 + this.offset) * 30
//         const wave2 = Math.cos(this.angle * 5 - time * 0.3) * 15

//         // "Breathing" effect
//         const breath = Math.sin(time * 0.2) * 20

//         this.radius = this.baseRadius + wave1 + wave2 + breath

//         // Calculate Position (Centered)
//         const cx = width / 2
//         const cy = height / 2.5

//         this.x = cx + Math.cos(this.angle) * this.radius
//         this.y = cy + Math.sin(this.angle) * (this.radius * 0.8)
//     }

//     draw(ctx: CanvasRenderingContext2D) {
//         ctx.beginPath()
//         ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
//         ctx.fillStyle = this.color
//         ctx.fill()
//     }
// }

// export default function ParticleWave({
//     particleCount = 180,
//     radiusBase = 375,
//     className = ''
// }: ParticleWaveProps) {
//     const canvasRef = useRef<HTMLCanvasElement>(null)
//     const particlesRef = useRef<Particle[]>([])
//     const timeRef = useRef<number>(0)
//     const animationFrameRef = useRef<number | undefined>(undefined)

//     useEffect(() => {
//         const canvas = canvasRef.current
//         if (!canvas) return

//         const ctx = canvas.getContext('2d')
//         if (!ctx) return

//         let width = canvas.width
//         let height = canvas.height

//         const resize = () => {
//             width = canvas.width = window.innerWidth
//             height = canvas.height = window.innerHeight
//             initParticles()
//         }

//         const initParticles = () => {
//             particlesRef.current = []
//             for (let i = 0; i < particleCount; i++) {
//                 particlesRef.current.push(new Particle(i, particleCount, radiusBase))
//             }
//         }

//         const animate = () => {
//             // Light mode trail: clear with white opacity
//             ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
//             ctx.fillRect(0, 0, width, height)

//             particlesRef.current.forEach(p => {
//                 p.update(timeRef.current, width, height)
//                 p.draw(ctx)
//             })

//             // Connect nearby particles for "web" look - Blue lines
//             ctx.strokeStyle = 'rgba(37, 99, 235, 0.1)'
//             ctx.lineWidth = 0.5

//             for (let i = 0; i < particlesRef.current.length; i += 2) {
//                 const p1 = particlesRef.current[i]
//                 const nextIndex = (i + 1) % particlesRef.current.length
//                 const p2 = particlesRef.current[nextIndex]

//                 ctx.beginPath()
//                 ctx.moveTo(p1.x, p1.y)
//                 ctx.lineTo(p2.x, p2.y)
//                 ctx.stroke()
//             }

//             timeRef.current += 0.01
//             animationFrameRef.current = requestAnimationFrame(animate)
//         }

//         window.addEventListener('resize', resize)
//         resize()
//         animate()

//         return () => {
//             window.removeEventListener('resize', resize)
//             if (animationFrameRef.current) {
//                 cancelAnimationFrame(animationFrameRef.current)
//             }
//         }
//     }, [particleCount, radiusBase])

//     return (
//         <canvas
//             ref={canvasRef}
//             className={`absolute inset-0 w-full h-full pointer-events-none z-0 ${className}`}
//         />
//     )
// }














// 'use client'

// import { useEffect, useRef } from 'react'

// interface ParticleWaveProps {
//     particleCount?: number
//     radiusBase?: number
//     className?: string
// }

// type Color = {
//     r: number
//     g: number
//     b: number
//     a: number
// }

// class Particle {
//     index: number
//     angle: number
//     radius: number
//     baseRadius: number
//     speed: number
//     offset: number

//     // size
//     size: number
//     baseSize: number

//     // depth / pseudo-3D
//     depth: number
//     depthOffset: number
//     depthBrightness: number

//     x: number = 0
//     y: number = 0

//     constructor(index: number, particleCount: number, radiusBase: number) {
//         this.index = index

//         // evenly spaced around the circle
//         this.angle = (Math.PI * 2 * index) / particleCount

//         // base radius with small random spread
//         this.radius = radiusBase + Math.random() * 50
//         this.baseRadius = this.radius

//         // 🔹 20% faster rotation (was: Math.random() * 0.001 + 0.0003)
//         this.speed = Math.random() * 0.0012 + 0.00036

//         this.offset = Math.random() * Math.PI * 2

//         // base size (already 1.15x) * 1.15 again (bigger particles)
//         this.baseSize = (Math.random() * 2 + 0.5) * 1.15 * 1.15
//         this.size = this.baseSize

//         // depth / 3D feel
//         this.depthOffset = Math.random() * Math.PI * 2
//         this.depth = 0
//         this.depthBrightness = 1


//     /**
//      * introFactor: 0 → start (no waves, no depth), 1 → full motion / depth.
//      */
//     update(timeSeconds: number, width: number, height: number, introFactor: number) {
//         // --- depth oscillation for subtle 3D effect ---
//         const depthRaw = Math.sin(timeSeconds * 0.25 + this.depthOffset)
//         this.depth = depthRaw * introFactor

//         // 🔹 more depth range (was 0.15)
//         const depthScale = 1 + this.depth * 0.2 // radius scale
//         const sizeDepthScale = 1 + this.depth * 0.2 // size scale
//         this.depthBrightness = 1 + this.depth * 0.25 // brightness factor

//         // --- rotation around center ---
//         this.angle += this.speed

//         // --- wave motion & breathing, eased in by introFactor ---
//         // 🔹 20% faster time factors, ~30% larger amplitudes
//         const wave1 =
//             Math.sin(this.angle * 3 + timeSeconds * 0.6 + this.offset) *
//             27 *
//             introFactor // was 21
//         const wave2 =
//             Math.cos(this.angle * 5 - timeSeconds * 0.36) *
//             13.5 *
//             introFactor // was 10.5
//         const breath =
//             Math.sin(timeSeconds * 0.24) *
//             18 *
//             introFactor // was 14

//         // 🔹 global scale: 25% bigger than previous 0.84 → 1.05
//         const baseRadial = (this.baseRadius + wave1 + wave2 + breath) * 1.05
//         this.radius = baseRadial * depthScale

//         // --- position (centered, slightly above vertical center) ---
//         const cx = width / 2
//         const cy = height / 2.5

//         this.x = cx + Math.cos(this.angle) * this.radius
//         this.y = cy + Math.sin(this.angle) * (this.radius * 0.8)

//         // --- size adjusted by depth ---
//         this.size = this.baseSize * sizeDepthScale
//     }

//     draw(ctx: CanvasRenderingContext2D, baseColor: Color) {
//         const { r, g, b, a } = baseColor

//         // apply depth-based brightness to alpha and clamp
//         const alpha = Math.min(1, a * this.depthBrightness)

//         ctx.beginPath()
//         ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
//         ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
//         ctx.fill()
//     }
// }

// // global colour helper (shared by all particles)
// const randomGlobalColor = (): Color => {
//     const r = Math.floor(Math.random() * 256)
//     const g = Math.floor(Math.random() * 256)
//     const b = Math.floor(Math.random() * 256)

//     // 🔹 25% brighter: was 0.55 * 1.2 = 0.66
//     const a = 0.55 * 1.2 * 1.25 // ≈ 0.825

//     return { r, g, b, a }
// }

// export default function ParticleWave({
//     // 🔹 +25% particles: was 214
//     particleCount = 268,
//     radiusBase = 375,
//     className = ''
// }: ParticleWaveProps) {
//     const canvasRef = useRef<HTMLCanvasElement>(null)
//     const particlesRef = useRef<Particle[]>([])
//     const timeRef = useRef<number>(0)
//     const animationFrameRef = useRef<number | undefined>(undefined)

//     useEffect(() => {
//         const canvas = canvasRef.current
//         if (!canvas) return

//         const ctx = canvas.getContext('2d')
//         if (!ctx) return

//         let width = canvas.width
//         let height = canvas.height

//         const initParticles = () => {
//             particlesRef.current = []

//             // --- MOBILE OPTIMISATION: scale particle count by viewport width ---
//             const baseCount = particleCount
//             let factor = 1

//             if (width < 480) {
//                 factor = 0.4
//             } else if (width < 768) {
//                 factor = 0.6
//             } else if (width < 1024) {
//                 factor = 0.8
//             }

//             const effectiveCount = Math.max(40, Math.floor(baseCount * factor))

//             for (let i = 0; i < effectiveCount; i++) {
//                 particlesRef.current.push(new Particle(i, effectiveCount, radiusBase))
//             }
//         }

//         const resize = () => {
//             width = (canvas.width = window.innerWidth)
//             height = (canvas.height = window.innerHeight)
//             initParticles()
//         }

//         // global colour transition state (shared by all particles)
//         let globalFromColor: Color = randomGlobalColor()
//         let globalToColor: Color = randomGlobalColor()
//         let globalLastChangeTime = 0 // seconds
//         let globalInterval = 10 + Math.random() * 2 // 10–12 seconds

//         // intro + lines timing
//         const INTRO_DURATION = 2.0 // seconds for waves/depth to fully kick in
//         const LINES_DELAY = 2.0 // wait this long before any lines appear
//         const LINES_FADE_DURATION = 4.0 // fade-in duration for lines

//         // use real time in seconds from requestAnimationFrame
//         let lastTimestamp: number | null = null

//         const animate = (timestamp: number) => {
//             if (lastTimestamp === null) {
//                 lastTimestamp = timestamp
//             }

//             const deltaMs = timestamp - lastTimestamp
//             lastTimestamp = timestamp

//             const deltaSeconds = deltaMs / 1000
//             timeRef.current += deltaSeconds
//             const timeSeconds = timeRef.current

//             // intro factor 0 → 1 over INTRO_DURATION seconds
//             const introFactor = Math.max(
//                 0,
//                 Math.min(1, timeSeconds / INTRO_DURATION)
//             )

//             // 🔹 20% faster trail fade: was 0.2
//             ctx.fillStyle = 'rgba(255, 255, 255, 0.24)'
//             ctx.fillRect(0, 0, width, height)

//             const particles = particlesRef.current

//             // update particle positions
//             particles.forEach(p => {
//                 p.update(timeSeconds, width, height, introFactor)
//             })

//             // global colour interpolation (for ALL particles)
//             let elapsed = timeSeconds - globalLastChangeTime
//             if (elapsed >= globalInterval) {
//                 globalLastChangeTime = timeSeconds
//                 globalFromColor = globalToColor
//                 globalToColor = randomGlobalColor()
//                 globalInterval = 10 + Math.random() * 2
//                 elapsed = 0
//             }

//             const t = Math.max(0, Math.min(1, elapsed / globalInterval))
//             const globalColor: Color = {
//                 r: globalFromColor.r + (globalToColor.r - globalFromColor.r) * t,
//                 g: globalFromColor.g + (globalToColor.g - globalFromColor.g) * t,
//                 b: globalFromColor.b + (globalToColor.b - globalFromColor.b) * t,
//                 a: globalFromColor.a + (globalToColor.a - globalFromColor.a) * t
//             }

//             // sort COPY by depth for drawing (do NOT mutate original order)
//             const sortedForDraw = [...particles].sort((a, b) => a.depth - b.depth)

//             // draw particles with shared global colour
//             sortedForDraw.forEach(p => {
//                 p.draw(ctx, globalColor)
//             })

//             // --- lines: appear later & fade in slowly ---
//             let lineAlphaFactor = 0
//             if (timeSeconds > LINES_DELAY) {
//                 lineAlphaFactor = Math.min(
//                     1,
//                     (timeSeconds - LINES_DELAY) / LINES_FADE_DURATION
//                 )
//             }

//             if (lineAlphaFactor > 0 && particles.length > 1) {
//                 // base web lines
//                 const baseLineAlpha = 0.025
//                 const finalAlpha = baseLineAlpha * lineAlphaFactor

//                 // 🔹 fewer neighbours: was 2
//                 const maxNeighborOffset = 1
//                 const distThreshold = Math.min(width, height) * 0.25 // a bit larger for bigger radius

//                 const lineParticles = particles // original order (stable)

//                 // LOCAL WEB: short, distance-based connections
//                 for (let i = 0; i < lineParticles.length; i++) {
//                     const p1 = lineParticles[i]

//                     for (let offset = 1; offset <= maxNeighborOffset; offset++) {
//                         const j = (i + offset) % lineParticles.length
//                         const p2 = lineParticles[j]

//                         const dx = p1.x - p2.x
//                         const dy = p1.y - p2.y
//                         const dist = Math.sqrt(dx * dx + dy * dy)

//                         if (dist > distThreshold) continue

//                         const avgDepth = (p1.depth + p2.depth) / 2
//                         const depthNorm = (avgDepth + 1) / 2 // 0–1

//                         const localAlpha = finalAlpha * (0.4 + depthNorm * 0.6)
//                         const lineWidth = 0.3 + depthNorm * 0.6

//                         ctx.strokeStyle = `rgba(37, 99, 235, ${localAlpha})`
//                         ctx.lineWidth = lineWidth

//                         ctx.beginPath()
//                         ctx.moveTo(p1.x, p1.y)
//                         ctx.lineTo(p2.x, p2.y)
//                         ctx.stroke()
//                     }
//                 }

//                 // DIAGONAL MESH: longer chords across the circle
//                 const diagonalStep = Math.max(6, Math.floor(lineParticles.length / 5))
//                 const centralAlphaBase = 0.02 * lineAlphaFactor

//                 for (let i = 0; i < lineParticles.length; i++) {
//                     const p1 = lineParticles[i]
//                     const p2 = lineParticles[(i + diagonalStep) % lineParticles.length]

//                     const avgDepth = (p1.depth + p2.depth) / 2
//                     const depthNorm = (avgDepth + 1) / 2 // 0–1

//                     const localAlpha =
//                         centralAlphaBase * (0.6 + depthNorm * 0.8)
//                     const lineWidth = 0.8 + depthNorm * 1.0

//                     ctx.strokeStyle = `rgba(37, 99, 235, ${localAlpha})`
//                     ctx.lineWidth = lineWidth

//                     ctx.beginPath()
//                     ctx.moveTo(p1.x, p1.y)
//                     ctx.lineTo(p2.x, p2.y)
//                     ctx.stroke()
//                 }
//             }

//             animationFrameRef.current = window.requestAnimationFrame(animate)
//         }

//         window.addEventListener('resize', resize)
//         resize()
//         animationFrameRef.current = window.requestAnimationFrame(animate)

//         return () => {
//             window.removeEventListener('resize', resize)
//             if (animationFrameRef.current !== undefined) {
//                 cancelAnimationFrame(animationFrameRef.current)
//             }
//         }
//     }, [particleCount, radiusBase])

//     return (
//         <canvas
//             ref={canvasRef}
//             className={`fixed inset-0 w-full h-full pointer-events-none z-0 ${className}`}
//         />
//     )
// }























'use client'

import { useEffect, useRef } from 'react'

interface ParticleWaveProps {
    particleCount?: number
    radiusBase?: number
    className?: string
    contained?: boolean // If true, uses absolute positioning instead of fixed
}

type Color = {
    r: number
    g: number
    b: number
    a: number
}

class Particle {
    index: number
    angle: number
    radius: number
    baseRadius: number
    speed: number
    offset: number

    // size
    size: number
    baseSize: number

    // depth / pseudo-3D
    depth: number
    depthOffset: number
    depthBrightness: number

    x: number = 0
    y: number = 0

    constructor(index: number, particleCount: number, radiusBase: number) {
        this.index = index

        // evenly spaced around the circle
        this.angle = (Math.PI * 2 * index) / particleCount

        // base radius with small random spread
        this.radius = radiusBase + Math.random() * 50
        this.baseRadius = this.radius

        // 20% faster rotation (from: Math.random() * 0.001 + 0.0003)
        this.speed = Math.random() * 0.0012 + 0.00036

        this.offset = Math.random() * Math.PI * 2

        // base size (already 1.15x) * 1.15 again (bigger particles)
        this.baseSize = (Math.random() * 2 + 0.5) * 1.15 * 1.15
        this.size = this.baseSize

        // depth / 3D feel
        this.depthOffset = Math.random() * Math.PI * 2
        this.depth = 0
        this.depthBrightness = 1
    }

    /**
     * introFactor: 0 → start (no waves, no depth), 1 → full motion / depth.
     */
    update(timeSeconds: number, width: number, height: number, introFactor: number) {
        // --- depth oscillation for subtle 3D effect ---
        const depthRaw = Math.sin(timeSeconds * 0.25 + this.depthOffset)
        this.depth = depthRaw * introFactor

        const depthScale = 1 + this.depth * 0.2 // radius scale
        const sizeDepthScale = 1 + this.depth * 0.2 // size scale
        this.depthBrightness = 1 + this.depth * 0.25 // brightness factor

        // --- rotation around center ---
        this.angle += this.speed

        // --- wave motion & breathing, eased in by introFactor ---
        // slightly smaller amplitudes → tighter band
        const wave1 =
            Math.sin(this.angle * 3 + timeSeconds * 0.6 + this.offset) *
            22 *                 // was 27
            introFactor
        const wave2 =
            Math.cos(this.angle * 5 - timeSeconds * 0.36) *
            11 *                 // was 13.5
            introFactor
        const breath =
            Math.sin(timeSeconds * 0.24) *
            14 *                 // was 18
            introFactor

        // combine waves and add *gentler* inward bias
        const totalWave = wave1 + wave2 + breath

        // inwardBias > 1 → stronger inward pull than outward push
        const inwardBias = totalWave < 0 ? 1.25 : 1.0 // was 1.35

        // clamp so radius stays in a narrower band
        let radial = this.baseRadius + totalWave * inwardBias

        const minRadius = this.baseRadius * 0.55 // was 0.45 (less extreme inward)
        const maxRadius = this.baseRadius * 1.15 // was 1.4  (much less outward)

        radial = Math.max(minRadius, Math.min(maxRadius, radial))

        // global scale (slightly > 1 to keep sphere big, but not huge)
        const baseRadial = radial * 0.92 // was 0.9
        this.radius = baseRadial * depthScale

        // --- position (centered, slightly above vertical center) ---
        const cx = width / 1.4
        const cy = height / 2.3

        this.x = cx + Math.cos(this.angle) * this.radius
        this.y = cy + Math.sin(this.angle) * (this.radius * 0.8)

        // --- size adjusted by depth ---
        this.size = this.baseSize * sizeDepthScale
    }


    draw(ctx: CanvasRenderingContext2D, baseColor: Color) {
        const { r, g, b, a } = baseColor

        // apply depth-based brightness to alpha and clamp
        const alpha = Math.min(1, a * this.depthBrightness)

        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
        ctx.fill()
    }
}

// global colour helper (shared by all particles)
const randomGlobalColor = (): Color => {
    const r = Math.floor(Math.random() * 256)
    const g = Math.floor(Math.random() * 256)
    const b = Math.floor(Math.random() * 256)

    // 25% brighter: 0.55 * 1.2 * 1.25 ≈ 0.825
    const a = 0.55 * 1.2 * 1.25

    return { r, g, b, a }
}

export default function ParticleWave({
    // +25% particles: 214 → 268
    particleCount = 288,
    radiusBase = 355,
    className = '',
    contained = false
}: ParticleWaveProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const particlesRef = useRef<Particle[]>([])
    const timeRef = useRef<number>(0)
    const animationFrameRef = useRef<number | undefined>(undefined)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let width = canvas.width
        let height = canvas.height

        const initParticles = () => {
            particlesRef.current = []

            // --- MOBILE OPTIMISATION: scale particle count by viewport width ---
            const baseCount = particleCount
            let factor = 1

            if (width < 480) {
                factor = 0.4
            } else if (width < 768) {
                factor = 0.6
            } else if (width < 1024) {
                factor = 0.8
            }

            const effectiveCount = Math.max(40, Math.floor(baseCount * factor))

            for (let i = 0; i < effectiveCount; i++) {
                particlesRef.current.push(new Particle(i, effectiveCount, radiusBase))
            }
        }

        const resize = () => {
            width = (canvas.width = window.innerWidth)
            height = (canvas.height = window.innerHeight)
            initParticles()
        }

        // global colour transition state (shared by all particles)
        let globalFromColor: Color = randomGlobalColor()
        let globalToColor: Color = randomGlobalColor()
        let globalLastChangeTime = 0 // seconds
        let globalInterval = 10 + Math.random() * 2 // 10–12 seconds

        // 🔹 intro + lines timing (longer, smoother)
        const INTRO_DURATION = 6 // was 2.0
        const LINES_DELAY = 9    // was 2.0
        const LINES_FADE_DURATION = 10 // was 4.0

        // use real time in seconds from requestAnimationFrame
        let lastTimestamp: number | null = null

        const animate = (timestamp: number) => {
            if (lastTimestamp === null) {
                lastTimestamp = timestamp
            }

            const deltaMs = timestamp - lastTimestamp
            lastTimestamp = timestamp

            const deltaSeconds = deltaMs / 1000
            timeRef.current += deltaSeconds
            const timeSeconds = timeRef.current

            // intro factor 0 → 1 over INTRO_DURATION seconds
            const introFactor = Math.max(
                0,
                Math.min(1, timeSeconds / INTRO_DURATION)
            )

            // 20% faster trail fade: 0.2 → 0.24
            ctx.fillStyle = 'rgba(255, 255, 255, 0.24)'
            ctx.fillRect(0, 0, width, height)

            const particles = particlesRef.current

            // update particle positions
            particles.forEach(p => {
                p.update(timeSeconds, width, height, introFactor)
            })

            // global colour interpolation (for ALL particles)
            let elapsed = timeSeconds - globalLastChangeTime
            if (elapsed >= globalInterval) {
                globalLastChangeTime = timeSeconds
                globalFromColor = globalToColor
                globalToColor = randomGlobalColor()
                globalInterval = 10 + Math.random() * 2
                elapsed = 0
            }

            const t = Math.max(0, Math.min(1, elapsed / globalInterval))
            const globalColor: Color = {
                r: globalFromColor.r + (globalToColor.r - globalFromColor.r) * t,
                g: globalFromColor.g + (globalToColor.g - globalFromColor.g) * t,
                b: globalFromColor.b + (globalToColor.b - globalFromColor.b) * t,
                a: globalFromColor.a + (globalToColor.a - globalFromColor.a) * t
            }

            // sort COPY by depth for drawing (do NOT mutate original order)
            const sortedForDraw = [...particles].sort((a, b) => a.depth - b.depth)

            // draw particles with shared global colour
            sortedForDraw.forEach(p => {
                p.draw(ctx, globalColor)
            })

            // --- lines: appear later & fade in slowly ---
            let lineAlphaFactor = 0
            if (timeSeconds > LINES_DELAY) {
                lineAlphaFactor = Math.min(
                    1,
                    (timeSeconds - LINES_DELAY) / LINES_FADE_DURATION
                )
            }

            if (lineAlphaFactor > 0 && particles.length > 1) {
                // base web lines
                const baseLineAlpha = 0.025
                const finalAlpha = baseLineAlpha * lineAlphaFactor

                // fewer neighbours (1 instead of 2)
                const maxNeighborOffset = 1
                const distThreshold = Math.min(width, height) * 0.25

                const lineParticles = particles // original order (stable)

                // LOCAL WEB: short, distance-based connections
                for (let i = 0; i < lineParticles.length; i++) {
                    const p1 = lineParticles[i]

                    for (let offset = 1; offset <= maxNeighborOffset; offset++) {
                        const j = (i + offset) % lineParticles.length
                        const p2 = lineParticles[j]

                        const dx = p1.x - p2.x
                        const dy = p1.y - p2.y
                        const dist = Math.sqrt(dx * dx + dy * dy)

                        if (dist > distThreshold) continue

                        const avgDepth = (p1.depth + p2.depth) / 2
                        const depthNorm = (avgDepth + 1) / 2 // 0–1

                        const localAlpha = finalAlpha * (0.4 + depthNorm * 0.6)
                        const lineWidth = 0.3 + depthNorm * 0.6

                        ctx.strokeStyle = `rgba(37, 99, 235, ${localAlpha})`
                        ctx.lineWidth = lineWidth

                        ctx.beginPath()
                        ctx.moveTo(p1.x, p1.y)
                        ctx.lineTo(p2.x, p2.y)
                        ctx.stroke()
                    }
                }

                // DIAGONAL MESH: longer chords across the circle
                const diagonalStep = Math.max(6, Math.floor(lineParticles.length / 5))
                const centralAlphaBase = 0.02 * lineAlphaFactor

                for (let i = 0; i < lineParticles.length; i++) {
                    const p1 = lineParticles[i]
                    const p2 = lineParticles[(i + diagonalStep) % lineParticles.length]

                    const avgDepth = (p1.depth + p2.depth) / 2
                    const depthNorm = (avgDepth + 1) / 2 // 0–1

                    const localAlpha =
                        centralAlphaBase * (0.6 + depthNorm * 0.8)
                    const lineWidth = 0.8 + depthNorm * 1.0

                    ctx.strokeStyle = `rgba(37, 99, 235, ${localAlpha})`
                    ctx.lineWidth = lineWidth

                    ctx.beginPath()
                    ctx.moveTo(p1.x, p1.y)
                    ctx.lineTo(p2.x, p2.y)
                    ctx.stroke()
                }
            }

            animationFrameRef.current = window.requestAnimationFrame(animate)
        }

        window.addEventListener('resize', resize)
        resize()
        animationFrameRef.current = window.requestAnimationFrame(animate)

        return () => {
            window.removeEventListener('resize', resize)
            if (animationFrameRef.current !== undefined) {
                cancelAnimationFrame(animationFrameRef.current)
            }
        }
    }, [particleCount, radiusBase])

    const positionClass = contained ? 'absolute' : 'fixed'

    return (
        <canvas
            ref={canvasRef}
            className={`${positionClass} inset-0 w-full h-full pointer-events-none z-0 ${className}`}
        />
    )
}
