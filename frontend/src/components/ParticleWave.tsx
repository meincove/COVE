"use client"

import { useEffect, useRef } from "react"

interface ParticleWaveProps {
    particleCount?: number
    radiusBase?: number
    className?: string
    contained?: boolean // If true, uses absolute positioning instead of fixed
    scrollProgress?: number // 0 = section 1 (right), 0.5 = section 2 (center), 1 = section 3 (left)
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
    color: string // Individual color

    x: number = 0
    y: number = 0

    constructor(index: number, particleCount: number, radiusBase: number) {
        this.index = index

        // evenly spaced around the circle
        this.angle = (Math.PI * 2 * index) / particleCount

        // base radius with small random spread
        this.radius = radiusBase + Math.random() * 50
        this.baseRadius = this.radius

        // 20% faster rotation -> +25% more = 1.5x original? (Current * 1.25)
        // Previous: 0.0012 + 0.00036
        // New: 0.0015 + 0.00045
        this.speed = Math.random() * 0.0015 + 0.00045

        this.offset = Math.random() * Math.PI * 2

        // base size (already 1.15x) * 1.15 again (bigger particles)
        this.baseSize = (Math.random() * 2 + 0.5) * 1.15 * 1.15
        this.size = this.baseSize

        // depth / 3D feel
        this.depthOffset = Math.random() * Math.PI * 2
        this.depth = 0
        this.depthBrightness = 1

        // Assign color based on radius/layer to mimic Google/Antigravity branding
        // Outer -> Blue, Middle -> Red/Green, Inner -> Yellow
        // Normalized index 0..1
        const t = index / particleCount

        if (t < 0.2) {
            this.color = '251, 188, 5' // Yellow (Inner)
        } else if (t < 0.5) {
            this.color = '52, 168, 83' // Green (Mid-Inner)
        } else if (t < 0.8) {
            this.color = '234, 67, 53' // Red (Mid-Outer)
        } else {
            this.color = '66, 133, 244' // Blue (Outer)
        }
    }

    /**
     * introFactor: 0 → start (no waves, no depth), 1 → full motion / depth.
     */
    update(timeSeconds: number, width: number, height: number, introFactor: number, _scrollProgress: number = 0) {
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
        // Speed increased by 25%
        const wave1 =
            Math.sin(this.angle * 3 + timeSeconds * 0.75 + this.offset) *
            22 *
            introFactor
        const wave2 =
            Math.cos(this.angle * 5 - timeSeconds * 0.45) *
            11 *
            introFactor
        const breath =
            Math.sin(timeSeconds * 0.3) *
            14 *
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

        // Dynamic re-scaling based on current window width vs base width (e.g. 1440)
        // This ensures dots shrink/grow continuously on resize
        const responsiveScale = Math.min(1, width / 1200)

        const baseRadial = (radial * 0.92) * responsiveScale
        this.radius = baseRadial * depthScale

        // --- STATIC CENTERED position (no scroll-based movement) ---
        // Position on the RIGHT side for desktop (around COVE text)
        // Center for mobile
        const isMobile = width < 768
        const cx = isMobile ? width / 2 : width * 0.75
        const cy = height / 2

        this.x = cx + Math.cos(this.angle) * this.radius
        this.y = cy + Math.sin(this.angle) * (this.radius * 0.8)

        // --- size adjusted by depth ---
        this.size = this.baseSize * sizeDepthScale
    }


    // Draw using the particle's OWN color
    draw(ctx: CanvasRenderingContext2D, _globalAlpha: number) {
        // apply depth-based brightness to alpha and clamp
        const alpha = Math.min(1, 0.8 * this.depthBrightness)

        ctx.beginPath()
        // Responsive size handled in update or here if passed
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${this.color}, ${alpha})`
        ctx.fill()
    }
}

export default function ParticleWave({
    // 🔹 +25% particles: was 214
    particleCount = 268,
    radiusBase = 375,
    className = '',
    contained = false,
    scrollProgress = 0
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
            width = canvas.width = window.innerWidth
            height = canvas.height = window.innerHeight
            initParticles()
        }

        // intro + lines timing
        const INTRO_DURATION = 6 // was 2.0
        const LINES_DELAY = 1.0 // wait this long before any lines appear
        const LINES_FADE_DURATION = 4.0 // fade-in duration for lines

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

            // 🔹 20% faster trail fade: was 0.2
            ctx.fillStyle = 'rgba(255, 255, 255, 0.24)'
            ctx.fillRect(0, 0, width, height)

            const particles = particlesRef.current

            // update particle positions
            // pass scrollProgress (0..1) to let particles react if needed
            const currentScrollProgress = scrollProgress // captured from closure/props

            particles.forEach(p => {
                p.update(timeSeconds, width, height, introFactor, currentScrollProgress)
            })

            // sort COPY by depth for drawing (do NOT mutate original order)
            const sortedForDraw = [...particles].sort((a, b) => a.depth - b.depth)

            // draw particles with individual colors
            const globalAlpha = 0.8
            sortedForDraw.forEach(p => {
                p.draw(ctx, globalAlpha)
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
                // Increased visual weight to ~0.08 (middle ground)
                const baseLineAlpha = 0.08
                const finalAlpha = baseLineAlpha * lineAlphaFactor

                // 🔹 fewer neighbours: was 2
                const maxNeighborOffset = 1
                const distThreshold = Math.min(width, height) * 0.25 // a bit larger for bigger radius

                const lineParticles = particles // original order (stable)

                // JOB: LOCAL WEB: short, distance-based connections
                // OPTIMIZATION: Check only limited neighbors to keep O(N)ish
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

                        // Distance-based opacity for lines
                        const distFactor = Math.max(0, 1 - (dist / (width * 0.2))) // fade out distant lines quicker

                        const localAlpha = finalAlpha * (0.4 + depthNorm * 0.6) * distFactor
                        const lineWidth = (0.3 + depthNorm * 0.6) * distFactor

                        ctx.strokeStyle = `rgba(37, 99, 235, ${localAlpha})`
                        ctx.lineWidth = lineWidth

                        if (localAlpha > 0.001) {
                            ctx.beginPath()
                            ctx.moveTo(p1.x, p1.y)
                            ctx.lineTo(p2.x, p2.y)
                            ctx.stroke()
                        }
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

                    // Distance-based opacity for lines
                    const dx = p1.x - p2.x
                    const dy = p1.y - p2.y
                    const dist = Math.sqrt(dx * dx + dy * dy)
                    // Increased threshold to 1.5 width so diagonal lines (distant) are NOT hidden
                    const distFactor = Math.max(0, 1 - (dist / (width * 1.5)))

                    const localAlpha =
                        centralAlphaBase * (0.6 + depthNorm * 0.8) * distFactor
                    const lineWidth = (0.8 + depthNorm * 1.0) * distFactor

                    ctx.strokeStyle = `rgba(37, 99, 235, ${localAlpha})`
                    ctx.lineWidth = lineWidth

                    if (localAlpha > 0.001) {
                        ctx.beginPath()
                        ctx.moveTo(p1.x, p1.y)
                        ctx.lineTo(p2.x, p2.y)
                        ctx.stroke()
                    }
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
    }, [particleCount, radiusBase, scrollProgress])

    return (
        <canvas
            ref={canvasRef}
            className={`${contained ? 'absolute' : 'fixed'} inset-0 w-full h-full pointer-events-none z-0 ${className}`}
        />
    )
}
