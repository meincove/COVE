"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Scan, ShoppingBag, Zap } from "lucide-react"
import type { UiProduct } from "@/lib/catalog/shared"
import { useRouter } from "next/navigation"

function safeImg(src?: string) {
    return src || "/clothing-images/fallback.jpg"
}

export function ScannerOverlay({
    scannedProduct,
    scannedId,
    scanPulseKey,
    dragging,
}: {
    scannedProduct: UiProduct | null
    scannedId: string | null
    scanPulseKey: number
    dragging: boolean
}) {
    const router = useRouter()

    const goProduct = () => {
        const slug = scannedProduct?.slug
        if (!slug) return
        const variantParam = scannedProduct?.variantId ? `?variantId=${scannedProduct.variantId}` : ''
        router.push(`/product/${slug}${variantParam}`)
    }

    return (
        <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[40]"
            style={{ width: "min(380px, 75vw)", height: "min(260px, 38vh)" }}
        >
            {(["tl", "tr", "bl", "br"] as const).map((pos) => (
                <div
                    key={pos}
                    className="absolute"
                    style={{
                        width: 28,
                        height: 28,
                        borderStyle: "solid",
                        borderColor: scannedId ? "rgba(0,0,0,0.78)" : "rgba(0,0,0,0.40)",
                        transition: "border-color 0.2s ease",
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

            {!scannedProduct && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <div className="w-11 h-11 rounded-xl bg-white/85 backdrop-blur-sm border border-neutral-200/60 flex items-center justify-center mb-3 shadow-md">
                        <Scan className="w-5 h-5 text-neutral-400" strokeWidth={1.5} />
                    </div>
                    <p className="text-xs text-neutral-500 font-medium">Drag to explore</p>
                    <p className="text-xs text-neutral-400 mt-1">Bring items into frame to preview</p>
                </div>
            )}

            <AnimatePresence>
                {scannedProduct && (
                    <motion.div
                        key={scannedProduct.id}
                        initial={{ opacity: 0, scale: 0.96, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 8 }}
                        transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                        className="absolute inset-0 rounded-2xl border border-neutral-200/70 overflow-hidden"
                        style={{
                            background: dragging ? "rgba(255,255,255,0.94)" : "rgba(255,255,255,0.98)",
                            backdropFilter: dragging ? "none" : "blur(14px)",
                            WebkitBackdropFilter: dragging ? "none" : "blur(14px)",
                            boxShadow: dragging ? "0 18px 50px rgba(0,0,0,0.10)" : "0 28px 80px rgba(0,0,0,0.14)",
                            pointerEvents: dragging ? "none" : "auto",
                        }}
                    >
                        <div
                            key={scanPulseKey}
                            className="absolute left-0 right-0 h-[2px]"
                            style={{
                                top: 0,
                                background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.28), transparent)",
                                animation: "coveScanLine 0.55s ease-out forwards",
                            }}
                        />

                        <div className="flex h-full">
                            <div className="w-2/5 h-full bg-neutral-50 relative overflow-hidden">
                                <img
                                    src={safeImg(scannedProduct.imageSrc ?? scannedProduct.images?.[0])}
                                    alt={scannedProduct.name}
                                    className="w-full h-full object-cover"
                                    draggable={false}
                                    onError={(e) => {
                                        const t = e.currentTarget as HTMLImageElement
                                        if (t.src.includes("fallback.jpg")) return
                                        t.src = "/clothing-images/fallback.jpg"
                                    }}
                                />
                            </div>

                            <div className="w-3/5 h-full p-5 flex flex-col justify-between">
                                <div>
                                    <p className="text-xs text-neutral-400 font-medium uppercase tracking-wider mb-1">
                                        {scannedProduct.type ?? "Item"}
                                    </p>
                                    <h3 className="text-lg font-semibold text-neutral-900 tracking-tight leading-tight mb-2">
                                        {scannedProduct.name}
                                    </h3>
                                    <p className="text-base font-medium text-neutral-700">
                                        €{Number(scannedProduct.price ?? 0).toFixed(2)}
                                    </p>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={goProduct}
                                        className="w-full py-2.5 px-4 bg-neutral-900 text-white text-sm font-medium rounded-xl hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <ShoppingBag className="w-4 h-4" strokeWidth={1.5} />
                                        View Product
                                    </button>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={goProduct}
                                            className="flex-1 py-2 px-3 bg-neutral-100 text-neutral-700 text-xs font-medium rounded-lg hover:bg-neutral-200 transition-colors"
                                        >
                                            Details
                                        </button>
                                        <button
                                            onClick={goProduct}
                                            className="flex-1 py-2 px-3 bg-neutral-100 text-neutral-700 text-xs font-medium rounded-lg hover:bg-neutral-200 transition-colors flex items-center justify-center gap-1"
                                        >
                                            <Zap className="w-3 h-3" strokeWidth={1.5} />
                                            Buy Now
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <style jsx global>{`
              @keyframes coveScanLine {
                0% {
                  top: 0%;
                  opacity: 1;
                }
                100% {
                  top: 100%;
                  opacity: 0.25;
                }
              }
            `}</style>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
