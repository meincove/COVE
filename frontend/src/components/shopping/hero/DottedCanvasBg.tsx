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
    const spacingRef = React.useRef(26)
    const baseRRef = React.useRef(1.05)
    const baseARef = React.useRef(0.14)

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
                // tiny deterministic jitter to avoid “too perfect”
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

    // draw one frame (static + optional local animation)
    const drawFrame = React.useCallback(() => {
        const c = canvasRef.current
        const buf = bufferRef.current
        if (!c || !buf) return

        const ctx = c.getContext("2d")
        if (!ctx) return

        const rect = c.getBoundingClientRect()
        const w = rect.width
        const h = rect.height

        // clear + draw static buffer (fast)
        ctx.clearRect(0, 0, w, h)
        ctx.drawImage(buf, 0, 0, w, h)

        if (!active || !point) return

        // local animated region only
        const spacing = spacingRef.current
        const baseR = baseRRef.current
        // const baseA = baseARef.current

        const px = point.x
        const py = point.y
        const strength = 1 // default

        const R = 210 * strength
        const R2 = R * R

        // compute grid bounds near point (only iterate local cells)
        const minX = Math.max(0, Math.floor((px - R) / spacing) * spacing)
        const maxX = Math.min(w + spacing, Math.ceil((px + R) / spacing) * spacing)
        const minY = Math.max(0, Math.floor((py - R) / spacing) * spacing)
        const maxY = Math.min(h + spacing, Math.ceil((py + R) / spacing) * spacing)

        // small time (only while dragging)
        const t = performance.now() * 0.001

        for (let yy = minY; yy <= maxY; yy += spacing) {
            for (let xx = minX; xx <= maxX; xx += spacing) {
                const dx = xx - px
                const dy = yy - py
                const d2 = dx * dx + dy * dy
                if (d2 > R2) continue

                // gaussian falloff
                const k = Math.exp(-d2 / (2 * R2))

                // gentle circular wave (no drift)
                const d = Math.sqrt(d2)
                const phase = d * 0.03 - t * 3.2
                const wave = Math.sin(phase)

                const lift = k * wave * 1.25
                const r = baseR + k * (0.7 + 0.4 * (0.5 + 0.5 * wave))
                // const a = Math.min(0.30, baseA + k * 0.14)

                const jx = ((xx * 13 + yy * 7) % 7) - 3
                const jy = ((xx * 9 + yy * 11) % 7) - 3

                // We just draw the animated dots on top. 
                // Alternatively clear rect but that's complex. 
                // Simple overdraw is fine.
                ctx.beginPath()
                ctx.fillStyle = `rgba(0,0,0,0.4)`
                ctx.arc(xx + jx * 0.07, yy + jy * 0.07 + lift, r, 0, Math.PI * 2)
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
