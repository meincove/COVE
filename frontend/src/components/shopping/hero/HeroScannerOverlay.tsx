"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Scan, ShoppingBag, Zap } from "lucide-react"
import type { UiProduct } from "@/src/lib/catalog/shared"

function safeImg(src?: string) {
    if (!src) return "/clothing-images/fallback.jpg"
    return src
}

export default function HeroScannerOverlay({
    scanned,
    pulseKey,
}: {
    scanned: UiProduct | null
    pulseKey: number
}) {
    return (
        <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none"
            style={{ width: "min(380px, 75vw)", height: "min(260px, 38vh)" }}
        >
            {/* Corner brackets */}
            {(["tl", "tr", "bl", "br"] as const).map((pos) => (
                <div
                    key={pos}
                    className="absolute"
                    style={{
                        width: 28,
                        height: 28,
                        borderStyle: "solid",
                        borderColor: scanned ? "rgba(0,0,0,0.78)" : "rgba(0,0,0,0.40)",
                        transition: "border-color 0.25s ease",
                        borderWidth:
                            pos === "tl"
                                ? "2px 0 0 2px"
                                : pos === "tr"
                                    ? "2px 2px 0 0"
                                    : pos === "bl"
                                        ? "0 0 2px 2px"
                                        : "0 2px 2px 0",
                        borderRadius:
                            pos === "tl"
                                ? "10px 0 0 0"
                                : pos === "tr"
                                    ? "0 10px 0 0"
                                    : pos === "bl"
                                        ? "0 0 0 10px"
                                        : "0 0 10px 0",
                        top: pos.includes("t") ? 0 : undefined,
                        bottom: pos.includes("b") ? 0 : undefined,
                        left: pos.includes("l") ? 0 : undefined,
                        right: pos.includes("r") ? 0 : undefined,
                    }}
                />
            ))}

            {!scanned && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <div className="w-11 h-11 rounded-xl bg-white/80 backdrop-blur-sm border border-neutral-200/50 flex items-center justify-center mb-3 shadow-md">
                        <Scan className="w-5 h-5 text-neutral-400" strokeWidth={1.5} />
                    </div>
                    <p className="text-xs text-neutral-500 font-medium">Drag to explore</p>
                    <p className="text-xs text-neutral-400 mt-1">
                        Bring items into frame to preview
                    </p>
                </div>
            )}

            <AnimatePresence>
                {scanned && (
                    <motion.div
                        key={scanned.id}
                        initial={{ opacity: 0, scale: 0.96, y: 10, filter: "blur(3px)" }}
                        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, scale: 0.98, y: 8, filter: "blur(2px)" }}
                        transition={{ duration: 0.24, ease: [0.2, 0.9, 0.2, 1] }}
                        className="absolute inset-0 rounded-2xl bg-white/98 backdrop-blur-xl border border-neutral-200/70 shadow-2xl shadow-black/10 overflow-hidden pointer-events-auto"
                    >
                        {/* scan line */}
                        <div
                            key={pulseKey}
                            className="absolute left-0 right-0 h-[2px]"
                            style={{
                                top: 0,
                                background:
                                    "linear-gradient(90deg, transparent, rgba(0,0,0,0.35), transparent)",
                                animation: "coveScanLine 0.55s ease-out forwards",
                            }}
                        />

                        <div className="flex h-full">
                            <div className="w-2/5 h-full bg-neutral-50 relative overflow-hidden">
                                <img
                                    src={safeImg(scanned.imageSrc ?? scanned.images?.[0])}
                                    alt={scanned.name}
                                    className="w-full h-full object-cover"
                                    draggable={false}
                                    onError={(e) => {
                                        const t = e.currentTarget as HTMLImageElement
                                        if (t.src.includes("fallback.jpg")) return
                                        t.src = "/clothing-images/fallback.jpg"
                                    }}
                                />
                                {!!scanned.badge && (
                                    <div className="absolute top-3 left-3">
                                        <span className="px-2 py-1 text-xs font-medium bg-neutral-900 text-white rounded">
                                            {scanned.badge}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="w-3/5 h-full p-5 flex flex-col justify-between">
                                <div>
                                    <p className="text-xs text-neutral-400 font-medium uppercase tracking-wider mb-1">
                                        {scanned.type ?? "Item"}
                                    </p>
                                    <h3 className="text-lg font-semibold text-neutral-900 tracking-tight leading-tight mb-2">
                                        {scanned.name}
                                    </h3>
                                    <p className="text-base font-medium text-neutral-700">
                                        €{Number(scanned.price ?? 0).toFixed(2)}
                                    </p>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <button className="w-full py-2.5 px-4 bg-neutral-900 text-white text-sm font-medium rounded-xl hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2">
                                        <ShoppingBag className="w-4 h-4" strokeWidth={1.5} />
                                        Add to Cart
                                    </button>
                                    <div className="flex gap-2">
                                        <button className="flex-1 py-2 px-3 bg-neutral-100 text-neutral-600 text-xs font-medium rounded-lg hover:bg-neutral-200 transition-colors">
                                            View Details
                                        </button>
                                        <button className="flex-1 py-2 px-3 bg-neutral-100 text-neutral-600 text-xs font-medium rounded-lg hover:bg-neutral-200 transition-colors flex items-center justify-center gap-1">
                                            <Zap className="w-3 h-3" strokeWidth={1.5} />
                                            Buy Now
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx global>{`
        @keyframes coveScanLine {
          0% {
            top: 0%;
            opacity: 1;
          }
          100% {
            top: 100%;
            opacity: 0.35;
          }
        }
      `}</style>
        </div>
    )
}
