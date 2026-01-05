"use client"

import { useEffect, useRef, useState } from "react"

export default function FPSMeter() {
    const [fps, setFps] = useState(0)
    const [min, setMin] = useState<number | null>(null)
    const [max, setMax] = useState<number | null>(null)
    const [focus, setFocus] = useState(true)
    const [vis, setVis] = useState("visible")

    const last = useRef(performance.now())
    const frames = useRef(0)
    const raf = useRef<number | null>(null)

    useEffect(() => {
        const tick = (t: number) => {
            frames.current += 1
            const dt = t - last.current
            if (dt >= 500) {
                const f = Math.round((frames.current * 1000) / dt)
                frames.current = 0
                last.current = t
                setFps(f)
                setMin((m) => (m === null ? f : Math.min(m, f)))
                setMax((m) => (m === null ? f : Math.max(m, f)))
                setFocus(document.hasFocus())
                setVis(document.visibilityState)
            }
            raf.current = requestAnimationFrame(tick)
        }

        raf.current = requestAnimationFrame(tick)
        return () => {
            if (raf.current) cancelAnimationFrame(raf.current)
        }
    }, [])

    return (
        <div className="fixed top-4 right-4 z-[9999] select-none">
            <div className="rounded-xl bg-white border border-black/10 shadow-lg px-3 py-2 text-xs text-black/70">
                <div className="font-semibold text-black/80">FPS {fps}</div>
                <div className="text-[11px] text-black/50">
                    min {min ?? "-"} • max {max ?? "-"}
                </div>
                <div className="text-[11px] text-black/40 mt-1">
                    focus: {String(focus)} • vis: {vis}
                </div>
            </div>
        </div>
    )
}
