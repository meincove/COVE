'use client'

import { useEffect, useRef } from 'react'

interface ParticleWaveProps {
    particleCount?: number
    radiusBase?: number
    className?: string
}

class Particle {
    index: number
    angle: number
    radius: number
    baseRadius: number
    speed: number
    offset: number
    size: number
    color: string
    x: number = 0
    y: number = 0

    constructor(index: number, particleCount: number, radiusBase: number) {
        this.index = index
        this.angle = (Math.PI * 2 * index) / particleCount
        this.radius = radiusBase + Math.random() * 50
        this.baseRadius = this.radius
        this.speed = Math.random() * 0.002 + 0.001
        this.offset = Math.random() * Math.PI * 2
        this.size = Math.random() * 2 + 0.5

        // Pure Blue Colors
        const isBlue = Math.random() > 0.3
        this.color = isBlue
            ? `rgba(37, 99, 235, ${Math.random() * 0.5 + 0.2})` // Blue-600
            : `rgba(59, 130, 246, ${Math.random() * 0.5 + 0.2})` // Blue-500
    }

    update(time: number, width: number, height: number) {
        // Rotation
        this.angle += this.speed

        // Wave motion
        const wave1 = Math.sin(this.angle * 3 + time * 0.5 + this.offset) * 30
        const wave2 = Math.cos(this.angle * 5 - time * 0.3) * 15

        // "Breathing" effect
        const breath = Math.sin(time * 0.2) * 20

        this.radius = this.baseRadius + wave1 + wave2 + breath

        // Calculate Position (Centered)
        const cx = width / 2
        const cy = height / 2.5

        this.x = cx + Math.cos(this.angle) * this.radius
        this.y = cy + Math.sin(this.angle) * (this.radius * 0.8)
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fillStyle = this.color
        ctx.fill()
    }
}

export default function ParticleWave({
    particleCount = 180,
    radiusBase = 375,
    className = ''
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

        const resize = () => {
            width = canvas.width = window.innerWidth
            height = canvas.height = window.innerHeight
            initParticles()
        }

        const initParticles = () => {
            particlesRef.current = []
            for (let i = 0; i < particleCount; i++) {
                particlesRef.current.push(new Particle(i, particleCount, radiusBase))
            }
        }

        const animate = () => {
            // Light mode trail: clear with white opacity
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
            ctx.fillRect(0, 0, width, height)

            particlesRef.current.forEach(p => {
                p.update(timeRef.current, width, height)
                p.draw(ctx)
            })

            // Connect nearby particles for "web" look - Blue lines
            ctx.strokeStyle = 'rgba(37, 99, 235, 0.1)'
            ctx.lineWidth = 0.5

            for (let i = 0; i < particlesRef.current.length; i += 2) {
                const p1 = particlesRef.current[i]
                const nextIndex = (i + 1) % particlesRef.current.length
                const p2 = particlesRef.current[nextIndex]

                ctx.beginPath()
                ctx.moveTo(p1.x, p1.y)
                ctx.lineTo(p2.x, p2.y)
                ctx.stroke()
            }

            timeRef.current += 0.01
            animationFrameRef.current = requestAnimationFrame(animate)
        }

        window.addEventListener('resize', resize)
        resize()
        animate()

        return () => {
            window.removeEventListener('resize', resize)
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
        }
    }, [particleCount, radiusBase])

    return (
        <canvas
            ref={canvasRef}
            className={`fixed inset-0 w-full h-full pointer-events-none z-0 ${className}`}
        />
    )
}
