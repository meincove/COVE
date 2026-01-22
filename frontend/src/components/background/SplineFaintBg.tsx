"use client"

import React from "react"

export default function SplineFaintBg({
    src,
    opacity = 0.12,
    className,
}: {
    src: string
    opacity?: number
    className?: string
}) {
    return (
        <div className={["absolute inset-0 pointer-events-none", className ?? ""].join(" ")}>
            {/* Cropped + scaled so no top/bottom bars show */}
            <div
                className="absolute -inset-[12%]"
                style={{
                    opacity,
                    transform: "scale(1.18)",
                    transformOrigin: "center",
                }}
            >
                <iframe
                    src={src}
                    className="h-full w-full"
                    loading="lazy"
                    title="Background animation"
                    frameBorder={0}
                    allowFullScreen
                    referrerPolicy="no-referrer"
                    style={{
                        border: "none",
                        background: "transparent",
                    }}
                />
            </div>

            {/* very subtle depth - DOES NOT blur tiles */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08)_0%,transparent_55%)]" />
        </div>
    )
}
