// "use client"

// import { AnimatePresence, motion } from "framer-motion"
// import { ShoppingBag, Zap } from "lucide-react"
// import { useRouter } from "next/navigation"
// import type { UiProduct } from "@/src/lib/catalog/shared"

// function safeImg(src?: string) {
//     if (!src) return "/clothing-images/fallback.jpg"
//     return src
// }

// export default function HeroScannerOverlay({
//     scanned,
//     pulseKey,
//     dragging,
// }: {
//     scanned: UiProduct | null
//     pulseKey: number
//     dragging: boolean
// }) {
//     const router = useRouter()

//     const goProduct = (p: UiProduct) => {
//         // if your app uses /product/[slug], keep this:
//         if (p.slug) router.push(`/product/${p.slug}`)
//         else router.push(`/shopping`)
//     }

//     return (
//         <div
//             className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] pointer-events-none"
//             style={{ width: "min(420px, 86vw)", height: "min(280px, 42vh)" }}
//         >
//             {/* center scan brackets */}
//             {(["tl", "tr", "bl", "br"] as const).map((pos) => (
//                 <div
//                     key={pos}
//                     className="absolute"
//                     style={{
//                         width: 30,
//                         height: 30,
//                         borderStyle: "solid",
//                         borderColor: scanned ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.35)",
//                         transition: "border-color 0.2s ease",
//                         borderWidth:
//                             pos === "tl"
//                                 ? "2px 0 0 2px"
//                                 : pos === "tr"
//                                     ? "2px 2px 0 0"
//                                     : pos === "bl"
//                                         ? "0 0 2px 2px"
//                                         : "0 2px 2px 0",
//                         borderRadius:
//                             pos === "tl"
//                                 ? "12px 0 0 0"
//                                 : pos === "tr"
//                                     ? "0 12px 0 0"
//                                     : pos === "bl"
//                                         ? "0 0 0 12px"
//                                         : "0 0 12px 0",
//                         top: pos.includes("t") ? 0 : undefined,
//                         bottom: pos.includes("b") ? 0 : undefined,
//                         left: pos.includes("l") ? 0 : undefined,
//                         right: pos.includes("r") ? 0 : undefined,
//                     }}
//                 />
//             ))}

//             {!scanned && (
//                 <div className="absolute inset-0 flex items-center justify-center text-center">
//                     <div className="rounded-2xl bg-white/75 border border-black/10 px-4 py-2 shadow-md">
//                         <div className="text-xs text-black/60 font-medium">Drag to explore (x + y)</div>
//                         <div className="text-[11px] text-black/40 mt-1">Bring a tile into the center to preview</div>
//                     </div>
//                 </div>
//             )}

//             <AnimatePresence>
//                 {scanned && (
//                     <motion.div
//                         key={scanned.id}
//                         initial={{ opacity: 0, scale: 0.97, y: 10 }}
//                         animate={{ opacity: 1, scale: 1, y: 0 }}
//                         exit={{ opacity: 0, scale: 0.98, y: 8 }}
//                         transition={{ duration: 0.22, ease: [0.2, 0.9, 0.2, 1] }}
//                         className="absolute inset-0 overflow-hidden pointer-events-auto"
//                         style={{
//                             borderRadius: 18,
//                             background: dragging ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.97)",
//                             border: "1px solid rgba(0,0,0,0.10)",
//                             boxShadow: dragging ? "0 18px 55px rgba(0,0,0,0.10)" : "0 30px 90px rgba(0,0,0,0.14)",
//                             backdropFilter: dragging ? "none" : "blur(12px)",
//                             WebkitBackdropFilter: dragging ? "none" : "blur(12px)",
//                         }}
//                         onPointerDown={(e) => e.stopPropagation()}
//                         onPointerMove={(e) => e.stopPropagation()}
//                     >
//                         {/* scan line */}
//                         <div
//                             key={pulseKey}
//                             className="absolute left-0 right-0 h-[2px]"
//                             style={{
//                                 top: 0,
//                                 background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.28), transparent)",
//                                 animation: "coveScanLine 0.55s ease-out forwards",
//                             }}
//                         />

//                         <div className="flex h-full">
//                             <div className="w-[44%] h-full bg-neutral-50 relative overflow-hidden">
//                                 <img
//                                     src={safeImg(scanned.imageSrc ?? scanned.images?.[0])}
//                                     alt=""
//                                     className="w-full h-full object-cover"
//                                     draggable={false}
//                                     onError={(e) => {
//                                         const t = e.currentTarget as HTMLImageElement
//                                         if (t.src.includes("fallback.jpg")) return
//                                         t.src = "/clothing-images/fallback.jpg"
//                                     }}
//                                 />
//                             </div>

//                             <div className="w-[56%] h-full p-5 flex flex-col justify-between">
//                                 <div>
//                                     <div className="text-[11px] uppercase tracking-wider text-black/45 font-medium">
//                                         {(scanned.type ?? "Item").toString()}
//                                     </div>
//                                     <div className="mt-1 text-lg font-semibold text-black/85 leading-tight">{scanned.name}</div>
//                                     <div className="mt-2 text-base font-medium text-black/70">€{Number(scanned.price ?? 0).toFixed(2)}</div>
//                                 </div>

//                                 <div className="flex flex-col gap-2">
//                                     <button
//                                         className="w-full py-2.5 rounded-xl bg-black text-white text-sm font-medium flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition"
//                                         onPointerDown={(e) => e.stopPropagation()}
//                                         onClick={() => goProduct(scanned)}
//                                     >
//                                         <ShoppingBag className="w-4 h-4" strokeWidth={1.6} />
//                                         View Product
//                                     </button>

//                                     <div className="grid grid-cols-2 gap-2">
//                                         <button
//                                             className="py-2 rounded-lg bg-black/5 text-black/65 text-xs font-medium hover:bg-black/10 transition"
//                                             onPointerDown={(e) => e.stopPropagation()}
//                                             onClick={() => goProduct(scanned)}
//                                         >
//                                             Details
//                                         </button>
//                                         <button
//                                             className="py-2 rounded-lg bg-black/5 text-black/65 text-xs font-medium hover:bg-black/10 transition flex items-center justify-center gap-1"
//                                             onPointerDown={(e) => e.stopPropagation()}
//                                             onClick={() => goProduct(scanned)}
//                                         >
//                                             <Zap className="w-3 h-3" strokeWidth={1.6} />
//                                             Buy Now
//                                         </button>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>

//                         <style jsx global>{`
//               @keyframes coveScanLine {
//                 0% {
//                   top: 0%;
//                   opacity: 1;
//                 }
//                 100% {
//                   top: 100%;
//                   opacity: 0.22;
//                 }
//               }
//             `}</style>
//                     </motion.div>
//                 )}
//             </AnimatePresence>
//         </div>
//     )
// }

"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ShoppingBag, Zap, Scan } from "lucide-react"
import { useRouter } from "next/navigation"
import type { UiProduct } from "@/src/lib/catalog/shared"

function safeImg(src?: string) {
    if (!src) return "/clothing-images/fallback.jpg"
    return src
}

export default function HeroScannerOverlay({
    scanned,
    pulseKey,
    dragging,
}: {
    scanned: UiProduct | null
    pulseKey: number
    dragging: boolean
}) {
    const router = useRouter()

    const goProduct = (p: UiProduct) => {
        if (p.slug) {
            const variantParam = p.variantId ? `?variantId=${p.variantId}` : ''
            router.push(`/product/${p.slug}${variantParam}`)
        } else {
            router.push(`/shopping`)
        }
    }

    return (
        <motion.div
            layoutId="hero-scanner-focus"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] pointer-events-none"
            initial={false}
            animate={{
                width: scanned ? "min(420px, 86vw)" : "170px",
                height: scanned ? "min(280px, 42vh)" : "170px",
            }}
            // ✅ QUICKER SPRING (User request: "smooth and quicker with nice spring")
            transition={{ type: "spring", stiffness: 380, damping: 30, mass: 0.8 }}
        >
            {/* Static Brackets - Hidden until scanned (User request) */}
            {(["tl", "tr", "bl", "br"] as const).map((pos) => (
                <div
                    key={pos}
                    className="absolute"
                    style={{
                        width: 30,
                        height: 30,
                        borderStyle: "solid",
                        // ✅ VISIBILITY FIX: Only visible when scanned (or dragging?)
                        // User said: "Until something is scanned, the outer layer will not be visible"
                        borderColor: scanned ? "rgba(0,0,0,0.72)" : "rgba(0,0,0,0.0)",
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
                                ? "12px 0 0 0"
                                : pos === "tr"
                                    ? "0 12px 0 0"
                                    : pos === "bl"
                                        ? "0 0 0 12px"
                                        : "0 0 12px 0",
                        top: pos.includes("t") ? 0 : undefined,
                        bottom: pos.includes("b") ? 0 : undefined,
                        left: pos.includes("l") ? 0 : undefined,
                        right: pos.includes("r") ? 0 : undefined,
                    }}
                />
            ))}


            {!scanned && (
                <div className="absolute inset-0 flex items-center justify-center text-center">
                    <motion.div
                        // ✅ SQUARE ICON (User request: "small square , inside it we have a scan symbol")
                        initial={{ opacity: 0, scale: 0.5, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 25,
                            mass: 0.8,
                            delay: 0.1
                        }}
                        className="h-12 w-12 rounded-xl bg-white/75 border border-black/10 flex items-center justify-center shadow-sm backdrop-blur-md"
                    >
                        <Scan className="w-5 h-5 text-black/60" strokeWidth={1.5} />
                    </motion.div>
                </div>
            )}

            <AnimatePresence>
                {scanned && (
                    <motion.div
                        key={scanned.id}
                        initial={{ opacity: 0, scale: 0.97, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 8 }}
                        transition={{ duration: 0.22, ease: [0.2, 0.9, 0.2, 1] }}
                        className="absolute inset-0 overflow-hidden pointer-events-auto"
                        style={{
                            borderRadius: 18,
                            // ✅ FIX: don’t use shorthand `background`
                            backgroundColor: dragging ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.55)",
                            backgroundImage:
                                "radial-gradient(900px 240px at 30% 0%, rgba(255,255,255,0.40), transparent 60%)",
                            border: "1px solid rgba(0,0,0,0.08)",
                            boxShadow: dragging ? "0 16px 48px rgba(0,0,0,0.06)" : "0 22px 68px rgba(0,0,0,0.08)",
                            backdropFilter: dragging ? "none" : "blur(16px)",
                            WebkitBackdropFilter: dragging ? "none" : "blur(16px)",
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onPointerMove={(e) => e.stopPropagation()}
                    >
                        {/* subtle inner stroke */}
                        <div
                            className="pointer-events-none absolute inset-0"
                            style={{
                                borderRadius: 18,
                                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.55)",
                            }}
                        />

                        <div
                            key={pulseKey}
                            className="absolute left-0 right-0 h-[2px]"
                            style={{
                                top: 0,
                                background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.22), transparent)",
                                animation: "coveScanLine 0.55s ease-out forwards",
                            }}
                        />

                        <div className="flex h-full">
                            <div className="w-[44%] h-full bg-neutral-50/50 relative overflow-hidden">
                                <img
                                    src={safeImg(scanned.imageSrc ?? scanned.images?.[0])}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    draggable={false}
                                    onError={(e) => {
                                        const t = e.currentTarget as HTMLImageElement
                                        if (t.src.includes("fallback.jpg")) return
                                        t.src = "/clothing-images/fallback.jpg"
                                    }}
                                />
                            </div>

                            <div className="w-[56%] h-full p-5 flex flex-col justify-between">
                                <div>
                                    <div className="text-[11px] uppercase tracking-wider text-black/45 font-medium">
                                        {(scanned.type ?? "Item").toString()}
                                    </div>
                                    <div className="mt-1 text-lg font-semibold text-black/85 leading-tight">{scanned.name}</div>
                                    <div className="mt-2 text-base font-medium text-black/70">€{Number(scanned.price ?? 0).toFixed(2)}</div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <button
                                        className="w-full py-2.5 rounded-xl bg-black text-white text-sm font-medium flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition"
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={() => goProduct(scanned)}
                                    >
                                        <ShoppingBag className="w-4 h-4" strokeWidth={1.6} />
                                        View Product
                                    </button>

                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            className="py-2 rounded-lg bg-black/5 text-black/65 text-xs font-medium hover:bg-black/10 transition"
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onClick={() => goProduct(scanned)}
                                        >
                                            Details
                                        </button>
                                        <button
                                            className="py-2 rounded-lg bg-black/5 text-black/65 text-xs font-medium hover:bg-black/10 transition flex items-center justify-center gap-1"
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onClick={() => goProduct(scanned)}
                                        >
                                            <Zap className="w-3 h-3" strokeWidth={1.6} />
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
                  opacity: 0.18;
                }
              }
            `}</style>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
