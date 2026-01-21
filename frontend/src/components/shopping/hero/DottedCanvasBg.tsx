"use client"

import * as React from "react"

type Point = { x: number; y: number } | null

export default function DottedCanvasBg({
    active,
    point,
    strength = 1,
    className = "",
}: {
    active: boolean
    point: Point
    strength?: number
    className?: string
}) {
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
    const rafRef = React.useRef<number | null>(null)

    // pre-rendered static grid buffer
    const bufferRef = React.useRef<HTMLCanvasElement | null>(null)
    const dprRef = React.useRef(1)

    // grid config (softer + less dense)
    // grid config (softer + less dense)
    const spacingRef = React.useRef(32)
    const baseRRef = React.useRef(1.35) // ✅ Smaller (User request: "particle size is too big")
    const baseARef = React.useRef(0.09) // ✅ Fainter (User request: "colour is so off/better")

    const resize = React.useCallback(() => {
        const c = canvasRef.current
        if (!c) return

        const dpr = Math.min(2, window.devicePixelRatio || 1)
        dprRef.current = dpr

        const rect = c.getBoundingClientRect()
        const w = Math.max(1, Math.floor(rect.width))
        const h = Math.max(1, Math.floor(rect.height))

        c.width = Math.floor(w * dpr)
        c.height = Math.floor(h * dpr)

        const ctx = c.getContext("2d")
        if (!ctx) return
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

        // build buffer
        const buf = document.createElement("canvas")
        buf.width = c.width
        buf.height = c.height
        const bctx = buf.getContext("2d")
        if (!bctx) return
        bctx.setTransform(dpr, 0, 0, dpr, 0, 0)

        // draw static grid once
        bctx.clearRect(0, 0, w, h)

        const spacing = spacingRef.current
        const baseR = baseRRef.current
        const baseA = baseARef.current

        for (let yy = 0; yy <= h + spacing; yy += spacing) {
            for (let xx = 0; xx <= w + spacing; xx += spacing) {
                const jx = ((xx * 13 + yy * 7) % 7) - 3
                const jy = ((xx * 9 + yy * 11) % 7) - 3

                bctx.beginPath()
                bctx.fillStyle = `rgba(0,0,0,${baseA})`
                bctx.arc(xx + jx * 0.07, yy + jy * 0.07, baseR, 0, Math.PI * 2)
                bctx.fill()
            }
        }

        bufferRef.current = buf
    }, [])

    React.useEffect(() => {
        resize()
        const ro = new ResizeObserver(() => resize())
        if (canvasRef.current) ro.observe(canvasRef.current)
        return () => ro.disconnect()
    }, [resize])

    // draw one frame (single pass, no buffer for pure dynamic control)
    const drawFrame = React.useCallback(() => {
        const c = canvasRef.current
        if (!c) return

        const ctx = c.getContext("2d")
        if (!ctx) return

        const rect = c.getBoundingClientRect()
        const w = rect.width
        const h = rect.height

        // Clear all
        ctx.clearRect(0, 0, w, h)

        const spacing = spacingRef.current
        const baseR = baseRRef.current
        const baseA = baseARef.current

        // Animation state
        const px = active && point ? point.x : -9999
        const py = active && point ? point.y : -9999
        const t = performance.now() * 0.001

        for (let yy = 0; yy <= h + spacing; yy += spacing) {
            for (let xx = 0; xx <= w + spacing; xx += spacing) {
                // Determine lift
                let lift = 0

                if (active) {
                    const dx = xx - px
                    const dy = yy - py
                    const d = Math.hypot(dx, dy)

                    // Global Wave
                    const phase = d * 0.008 - t * 2.5
                    const wave = Math.sin(phase)

                    // Attenuation
                    const distFact = Math.max(0, 1 - d / 1800)

                    if (distFact > 0.01) {
                        lift = wave * 2.5 * distFact
                    }
                }

                const jx = ((xx * 13 + yy * 7) % 7) - 3
                const jy = ((xx * 9 + yy * 11) % 7) - 3

                // Draw Dot
                ctx.beginPath()
                // Constant opacity, no pulsing
                ctx.fillStyle = `rgba(0,0,0,${baseA})`
                ctx.arc(xx + jx * 0.07, yy + jy * 0.07 + lift, baseR, 0, Math.PI * 2)
                ctx.fill()
            }
        }
    }, [active, point])

    // run RAF only while active; otherwise draw once (ultra stable FPS)
    React.useEffect(() => {
        const c = canvasRef.current
        if (!c) return

        // always draw at least once
        drawFrame()

        if (!active) {
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
            rafRef.current = null
            return
        }

        const loop = () => {
            drawFrame()
            rafRef.current = requestAnimationFrame(loop)
        }

        rafRef.current = requestAnimationFrame(loop)
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
            rafRef.current = null
        }
    }, [active, drawFrame])

    return (
        <canvas
            ref={canvasRef}
            className={[
                "absolute inset-0 w-full h-full pointer-events-none",
                "z-[1]", // behind wall (wall is z10)
                className,
            ].join(" ")}
        />
    )
}
