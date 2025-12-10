"use client"

import { useEffect, useState, useRef } from 'react'

export default function FPSMonitor() {
    const [fps, setFps] = useState(60)
    const [avgFps, setAvgFps] = useState(60)
    const frameTimesRef = useRef<number[]>([])
    const lastTimeRef = useRef(performance.now())
    const frameCountRef = useRef(0)

    useEffect(() => {
        let animationFrameId: number

        const measureFPS = () => {
            const now = performance.now()
            const delta = now - lastTimeRef.current

            if (delta > 0) {
                const currentFps = 1000 / delta
                frameTimesRef.current.push(currentFps)

                // Keep only last 60 frames for average
                if (frameTimesRef.current.length > 60) {
                    frameTimesRef.current.shift()
                }

                frameCountRef.current++

                // Update FPS display every 10 frames
                if (frameCountRef.current % 10 === 0) {
                    setFps(Math.round(currentFps))

                    const avg = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length
                    setAvgFps(Math.round(avg))
                }
            }

            lastTimeRef.current = now
            animationFrameId = requestAnimationFrame(measureFPS)
        }

        animationFrameId = requestAnimationFrame(measureFPS)

        return () => {
            cancelAnimationFrame(animationFrameId)
        }
    }, [])

    const getFpsColor = (fps: number) => {
        if (fps >= 60) return '#10b981' // green
        if (fps >= 30) return '#f59e0b' // yellow
        return '#ef4444' // red
    }

    return (
        <div className="fixed top-4 right-4 z-50 bg-black/80 backdrop-blur-sm text-white p-4 rounded-lg font-mono text-sm shadow-2xl border border-white/20">
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <span className="text-gray-400">FPS:</span>
                    <span
                        className="text-2xl font-bold tabular-nums"
                        style={{ color: getFpsColor(fps) }}
                    >
                        {fps}
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-gray-400">Avg:</span>
                    <span
                        className="text-lg tabular-nums"
                        style={{ color: getFpsColor(avgFps) }}
                    >
                        {avgFps}
                    </span>
                </div>

                <div className="pt-2 border-t border-white/20">
                    <div className="text-xs text-gray-400 space-y-1">
                        <div className="flex justify-between gap-4">
                            <span>Target:</span>
                            <span className="text-green-400">60 FPS</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span>Frame Time:</span>
                            <span>{(1000 / fps).toFixed(1)}ms</span>
                        </div>
                    </div>
                </div>

                {/* FPS Bar */}
                <div className="pt-2">
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full transition-all duration-200"
                            style={{
                                width: `${Math.min((fps / 60) * 100, 100)}%`,
                                backgroundColor: getFpsColor(fps)
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
