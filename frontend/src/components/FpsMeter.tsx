"use client"

import { useEffect, useRef, useState } from "react"

/** Super light FPS meter (vsync-limited) */
export function FpsMeter() {
    const [fps, setFps] = useState(0)
    const rafRef = useRef<number | null>(null)

    useEffect(() => {
        let last = performance.now()
        let frames = 0
        let acc = 0

        const loop = (t: number) => {
            const dt = t - last
            last = t
            frames += 1
            acc += dt

            // update 4x per second
            if (acc >= 250) {
                const current = Math.round((frames * 1000) / acc)
                setFps(current)
                frames = 0
                acc = 0
            }

            rafRef.current = requestAnimationFrame(loop)
        }

        rafRef.current = requestAnimationFrame(loop)
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
        }
    }, [])

    return (
        <div className="absolute right-4 top-4 z-40">
            <div className="rounded-lg border border-black/10 bg-white/90 px-3 py-2 text-xs font-semibold text-black/70">
                FPS {fps}
            </div>
        </div>
    )
}
