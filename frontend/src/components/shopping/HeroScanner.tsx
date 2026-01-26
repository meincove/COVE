// "use client"

// import * as React from "react"
// import type { UiProduct } from "@/lib/catalog/shared"
// import HeroScannerWall from "@/components/shopping/hero/HeroScannerWall"
// import SplineFaintBg from "@/components/background/SplineFaintBg"
// import HeroScannerOverlay from "@/components/shopping/hero/HeroScannerOverlay"
// import { useRouter } from "next/navigation"

// function FpsMeter() {
//     const [fps, setFps] = React.useState(0)
//     const rafRef = React.useRef<number | null>(null)

//     React.useEffect(() => {
//         let last = performance.now()
//         let frames = 0

//         const loop = (t: number) => {
//             frames++
//             if (t - last >= 250) {
//                 setFps(Math.round((frames * 1000) / (t - last)))
//                 frames = 0
//                 last = t
//             }
//             rafRef.current = requestAnimationFrame(loop)
//         }

//         rafRef.current = requestAnimationFrame(loop)
//         return () => {
//             if (rafRef.current) cancelAnimationFrame(rafRef.current)
//         }
//     }, [])

//     return (
//         <div className="fixed top-3 right-3 z-[200] rounded-full bg-black/70 text-white px-3 py-1 text-xs font-medium backdrop-blur">
//             FPS {fps}
//         </div>
//     )
// }

// type HeroScannerProps = {
//     products: UiProduct[]
//     heightVh?: number
//     minHeight?: number
//     splineSrc?: string
// }

// function uniq(arr: string[]) {
//     return Array.from(new Set(arr)).filter(Boolean)
// }

// /** bottom curved bar shown inside hero */
// function HeroScanBottomBar({
//     scanned,
//     dragging,
// }: {
//     scanned: UiProduct | null
//     dragging: boolean
// }) {
//     const router = useRouter()

//     const colorCount = scanned?.colorNames?.length ?? 0
//     const sizeCount = scanned?.sizes?.length ?? 0

//     const goProduct = () => {
//         if (!scanned?.slug) return
//         router.push(`/product/${scanned.slug}`)
//     }

//     const askCove = () => {
//         // safe placeholder: later we can connect it to your assistant modal
//         window.dispatchEvent(
//             new CustomEvent("cove:ask", {
//                 detail: { productId: scanned?.id, slug: scanned?.slug, name: scanned?.name },
//             })
//         )
//     }

//     return (
//         <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[95] w-[min(980px,92vw)] pointer-events-none">
//             <div
//                 className={[
//                     "pointer-events-auto",
//                     "rounded-[28px] border border-black/10",
//                     "bg-white/65 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.12)]",
//                     "px-4 py-3 md:px-5 md:py-3.5",
//                     "transition",
//                     dragging ? "opacity-85" : "opacity-100",
//                 ].join(" ")}
//             >
//                 {!scanned ? (
//                     <div className="flex items-center justify-between gap-4">
//                         <div className="min-w-0">
//                             <div className="text-xs font-medium text-black/60">Scanner</div>
//                             <div className="text-sm font-semibold text-black/80 truncate">
//                                 Drag tiles into the frame to preview
//                             </div>
//                         </div>
//                         <div className="hidden sm:flex items-center gap-2 text-xs text-black/45">
//                             <span className="px-2 py-1 rounded-full bg-black/5">x + y drag</span>
//                             <span className="px-2 py-1 rounded-full bg-black/5">center = scan</span>
//                         </div>
//                     </div>
//                 ) : (
//                     <div className="flex items-center gap-4">
//                         {/* left mini image */}
//                         <div className="h-12 w-12 rounded-2xl overflow-hidden bg-black/5 shrink-0">
//                             <img
//                                 src={scanned.imageSrc ?? scanned.images?.[0] ?? "/clothing-images/fallback.jpg"}
//                                 alt=""
//                                 className="h-full w-full object-cover"
//                                 draggable={false}
//                             />
//                         </div>

//                         {/* text */}
//                         <div className="min-w-0 flex-1">
//                             <div className="flex items-center gap-2 text-[11px] text-black/45 font-medium">
//                                 <span className="uppercase tracking-wider">{(scanned.type ?? "Item").toString()}</span>
//                                 {scanned.tier ? <span className="px-2 py-[3px] rounded-full bg-black/5">{scanned.tier}</span> : null}
//                                 {colorCount > 0 ? <span className="px-2 py-[3px] rounded-full bg-black/5">{colorCount} colors</span> : null}
//                                 {sizeCount > 0 ? <span className="px-2 py-[3px] rounded-full bg-black/5">{sizeCount} sizes</span> : null}
//                             </div>

//                             <div className="mt-0.5 flex items-baseline gap-3 min-w-0">
//                                 <div className="text-sm md:text-base font-semibold text-black/85 truncate">
//                                     {scanned.name}
//                                 </div>
//                                 <div className="text-sm md:text-base font-medium text-black/65 shrink-0">
//                                     €{Number(scanned.price ?? 0).toFixed(2)}
//                                 </div>
//                             </div>
//                         </div>

//                         {/* actions */}
//                         <div className="flex items-center gap-2 shrink-0">
//                             <button
//                                 onClick={askCove}
//                                 className="h-10 px-4 rounded-full bg-black/5 text-black/70 text-sm font-medium hover:bg-black/10 transition"
//                             >
//                                 Ask Cove
//                             </button>

//                             <button
//                                 onClick={goProduct}
//                                 disabled={!scanned.slug}
//                                 className="h-10 px-4 rounded-full bg-black text-white text-sm font-medium hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-40 disabled:hover:scale-100"
//                             >
//                                 Go to Product
//                             </button>
//                         </div>
//                     </div>
//                 )}
//             </div>
//         </div>
//     )
// }

// export default function HeroScanner({
//     products,
//     heightVh = 70,
//     minHeight = 600,
//     splineSrc = "https://my.spline.design/particlesmoment-kW3xVhny6weIhXJ3vbs2M2b",
// }: HeroScannerProps) {
//     const [open, setOpen] = React.useState(false)
//     const [active, setActive] = React.useState<string>("Curated")

//     const [dragging, setDragging] = React.useState(false)
//     const [scanned, setScanned] = React.useState<UiProduct | null>(null)

//     const typeOptions = React.useMemo(() => {
//         const types = uniq((products ?? []).map((p) => (p.type ?? "").toString().trim()))
//         const nice = types.length ? types : ["Jacket", "Hoodie", "Shirt", "Tee", "Pants"]
//         return ["Curated", ...nice]
//     }, [products])

//     const filtered = React.useMemo(() => {
//         if (active === "Curated") return products ?? []
//         const a = active.toLowerCase()
//         return (products ?? []).filter((p) => (p.type ?? "").toString().toLowerCase().includes(a))
//     }, [products, active])

//     const onScan = React.useCallback((p: UiProduct | null) => setScanned(p), [])

//     const [pulseKey, setPulseKey] = React.useState(0)
//     const lastId = React.useRef<string | null>(null)

//     React.useEffect(() => {
//         const id = scanned?.id ?? null
//         if (id && id !== lastId.current) setPulseKey((k) => k + 1)
//         lastId.current = id
//     }, [scanned])

//     return (
//         <section
//             className="relative w-full overflow-hidden"
//             style={{
//                 height: `${heightVh}vh`,
//                 minHeight,
//                 background: "#f7f7fb",
//             }}
//         >
//             {/* ===== Background (dot grid + gentle flow) ===== */}
//             <div className="absolute inset-0">
//                 {/* base */}
//                 <div className="absolute inset-0 bg-gradient-to-b from-white via-white/80 to-white" />

//                 {/* dot grid static */}
//                 <div className="absolute inset-0 cove-dotgrid opacity-[0.55]" />

//                 {/* dot grid drifting layer (river-flow vibe) */}
//                 <div className="absolute inset-0 cove-dotgrid cove-dotgrid-flow opacity-[0.25]" />

//                 {/* luxury blooms (keep your vibe) */}
//                 <div className="absolute inset-0 bg-[radial-gradient(1100px_650px_at_55%_40%,rgba(0,0,0,0.06),transparent_62%)]" />
//                 <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_18%_28%,rgba(236,72,153,0.10),transparent_56%)]" />
//                 <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_82%_38%,rgba(34,197,94,0.10),transparent_62%)]" />
//             </div>

//             {/* faint spline bg (still optional) */}
//             <SplineFaintBg src={splineSrc} opacity={0.08} className="mix-blend-multiply" />

//             {/* edge vignette */}
//             <div className="pointer-events-none absolute inset-0">
//                 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.0)_45%,rgba(0,0,0,0.06)_100%)]" />
//             </div>

//             {/* wall */}
//             <HeroScannerWall
//                 products={filtered}
//                 onDraggingChange={setDragging}
//                 onScan={onScan}
//                 canvasScale={1.5}
//             />

//             {/* QR overlay stays minimal */}
//             <HeroScannerOverlay scanned={scanned} pulseKey={pulseKey} dragging={dragging} />

//             {/* ✅ bottom bar INSIDE hero */}
//             <HeroScanBottomBar scanned={scanned} dragging={dragging} />

//             {/* top pill selector */}
//             <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[110]">
//                 <button
//                     className="group flex items-center gap-2 rounded-full bg-white/70 border border-black/10 px-4 py-2 shadow-sm backdrop-blur-md"
//                     onClick={() => setOpen((v) => !v)}
//                 >
//                     <span className="h-2 w-2 rounded-full bg-emerald-500" />
//                     <span className="text-xs font-medium text-black/70">{active}</span>
//                     <span className="text-xs text-black/40 group-hover:text-black/60 transition">▾</span>
//                 </button>

//                 {open && (
//                     <div className="mt-2 rounded-2xl bg-white/80 border border-black/10 shadow-lg backdrop-blur-xl p-2 w-[220px] mx-auto">
//                         {typeOptions.map((t) => (
//                             <button
//                                 key={t}
//                                 className={[
//                                     "w-full text-left px-3 py-2 rounded-xl text-sm transition",
//                                     t === active ? "bg-black text-white" : "hover:bg-black/5 text-black/75",
//                                 ].join(" ")}
//                                 onClick={() => {
//                                     setActive(t)
//                                     setOpen(false)
//                                 }}
//                             >
//                                 {t}
//                             </button>
//                         ))}
//                     </div>
//                 )}
//             </div>

//             {/* bottom blend into page */}
//             <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-white/95 via-white/65 to-transparent z-[90]" />

//             {/* debug + fps */}
//             <div className="pointer-events-none absolute top-5 right-5 z-[120] text-[11px] text-black/40">
//                 {dragging ? "dragging…" : "idle"}
//             </div>
//             <FpsMeter />

//             {/* background CSS */}
//             <style jsx global>{`
//         .cove-dotgrid {
//           background-image: radial-gradient(rgba(0, 0, 0, 0.14) 0.6px, transparent 0.7px);
//           background-size: 18px 18px;
//           background-position: 0 0;
//         }

//         .cove-dotgrid-flow {
//           animation: coveDotFlow 10.5s ease-in-out infinite;
//           will-change: background-position, transform;
//           filter: blur(0.0px);
//         }

//         @keyframes coveDotFlow {
//           0% {
//             background-position: 0px 0px;
//             transform: translate3d(0, 0, 0);
//           }
//           50% {
//             background-position: 40px 22px;
//             transform: translate3d(0, -4px, 0);
//           }
//           100% {
//             background-position: 0px 0px;
//             transform: translate3d(0, 0, 0);
//           }
//         }
//       `}</style>
//         </section>
//     )
// }


"use client"

import * as React from "react"
import type { UiProduct } from "@/lib/catalog/shared"
import HeroScannerWall from "@/components/shopping/hero/HeroScannerWall"
import HeroScannerOverlay from "@/components/shopping/hero/HeroScannerOverlay"
import DottedCanvasBg from "@/components/shopping/hero/DottedCanvasBg"
import HeroScannerBottomBar from "@/components/shopping/hero/HeroScannerBottomBar"



type HeroScannerProps = {
    products: UiProduct[]
    heightVh?: number
    minHeight?: number
}

function uniq(arr: string[]) {
    return Array.from(new Set(arr)).filter(Boolean)
}

export default function HeroScanner({ products, heightVh = 70, minHeight = 600 }: HeroScannerProps) {
    const [open, setOpen] = React.useState(false)
    const [active, setActive] = React.useState<string>("Curated")

    const [dragging, setDragging] = React.useState(false)
    const [scanned, setScanned] = React.useState<UiProduct | null>(null)

    const [dragPoint, setDragPoint] = React.useState<{ x: number; y: number } | null>(null)
    const [bgActive, setBgActive] = React.useState(false)

    const typeOptions = React.useMemo(() => {
        const types = uniq((products ?? []).map((p) => (p.type ?? "").toString().trim()))
        const nice = types.length ? types : ["Jacket", "Hoodie", "Shirt", "Tee", "Pants"]
        return ["Curated", ...nice]
    }, [products])

    const filtered = React.useMemo(() => {
        if (active === "Curated") return products ?? []
        const a = active.toLowerCase()
        return (products ?? []).filter((p) => (p.type ?? "").toString().toLowerCase().includes(a))
    }, [products, active])

    const onScan = React.useCallback((p: UiProduct | null) => {
        setScanned(p)
    }, [])

    const [pulseKey, setPulseKey] = React.useState(0)
    const lastId = React.useRef<string | null>(null)

    React.useEffect(() => {
        const id = scanned?.id ?? null
        if (id && id !== lastId.current) setPulseKey((k) => k + 1)
        lastId.current = id
    }, [scanned])

    return (
        <section
            className="relative w-full overflow-hidden"
            style={{
                height: `${heightVh}vh`,
                minHeight,
                // ✅ FIX: Cleaner white background (User request: "lighter... no pinkish")
                backgroundColor: "#ffffff",
            }}
        >
            {/* ✅ Background layers — Curved to match wall (CONCAVE) */}
            <div
                className="absolute inset-0 z-[0]"
                style={{
                    perspective: "1200px",
                    perspectiveOrigin: "50% 50%",
                    transformStyle: "preserve-3d"
                }}
            >
                {/* Dotted background curves inward - same as card wall */}
                {/* FIX: Scaled up to 150% to cover edges when pushed back/rotated */}
                <div
                    className="absolute"
                    style={{
                        top: "-50%", left: "-50%", right: "-50%", bottom: "-50%", // Huge overscan
                        width: "200%", height: "200%",
                        transform: "rotateX(15deg) translateZ(-200px)",
                        transformOrigin: "center center",
                        transformStyle: "preserve-3d"
                    }}
                >
                    {/* Neutral premium gradients */}
                    <div className="absolute inset-0 bg-[radial-gradient(1200px_800px_at_50%_40%,rgba(0,0,0,0.02),transparent_60%)]" />

                    {/* dotted canvas - curves with the panel */}
                    <DottedCanvasBg active={bgActive} point={dragPoint} strength={1} />
                </div>
            </div>

            {/* edge vignette - Reduced blue blur on all 4 sides */}
            <div className="pointer-events-none absolute inset-0 z-[20]">
                {/* Left - Blue ambient glow */}
                <div
                    className="absolute top-0 bottom-0 left-0 w-20"
                    style={{
                        background: "linear-gradient(to right, rgba(59, 130, 246, 0.10) 0%, rgba(59, 130, 246, 0.02) 50%, transparent 100%)",
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                        maskImage: "linear-gradient(to right, black 30%, transparent 100%)",
                        WebkitMaskImage: "linear-gradient(to right, black 30%, transparent 100%)"
                    }}
                />
                {/* Right - Blue ambient glow */}
                <div
                    className="absolute top-0 bottom-0 right-0 w-20"
                    style={{
                        background: "linear-gradient(to left, rgba(59, 130, 246, 0.10) 0%, rgba(59, 130, 246, 0.02) 50%, transparent 100%)",
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                        maskImage: "linear-gradient(to left, black 30%, transparent 100%)",
                        WebkitMaskImage: "linear-gradient(to left, black 30%, transparent 100%)"
                    }}
                />
                {/* Top - Blue ambient glow */}
                <div
                    className="absolute top-0 left-0 right-0 h-16"
                    style={{
                        background: "linear-gradient(to bottom, rgba(59, 130, 246, 0.10) 0%, rgba(59, 130, 246, 0.02) 50%, transparent 100%)",
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                        maskImage: "linear-gradient(to bottom, black 30%, transparent 100%)",
                        WebkitMaskImage: "linear-gradient(to bottom, black 30%, transparent 100%)"
                    }}
                />
                {/* Bottom - Blue ambient glow */}
                <div
                    className="absolute bottom-0 left-0 right-0 h-20"
                    style={{
                        background: "linear-gradient(to top, rgba(59, 130, 246, 0.10) 0%, rgba(59, 130, 246, 0.02) 50%, transparent 100%)",
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                        maskImage: "linear-gradient(to top, black 30%, transparent 100%)",
                        WebkitMaskImage: "linear-gradient(to top, black 30%, transparent 100%)"
                    }}
                />
            </div>

            {/* ✅ Wall on top */}
            <div className="absolute inset-0 z-[10]">
                <HeroScannerWall
                    products={filtered}
                    onDraggingChange={setDragging}
                    onScan={onScan}
                    onDragPointChange={(p, active) => {
                        setDragPoint(p)
                        setBgActive(active)
                    }}
                    canvasScale={1.45} // slightly less “zoomed in”
                    gapFactor={0.86} // more spacing (feels like 90% zoom)
                />
            </div>

            {/* overlay */}
            <HeroScannerOverlay scanned={scanned} pulseKey={pulseKey} dragging={dragging} />

            {/* ✅ Bottom bar ABOVE fade */}
            <HeroScannerBottomBar scanned={scanned} visible={!!scanned} onAskCove={() => { }} />

            {/* top pill selector */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[90]">
                <button
                    className="group flex items-center gap-2 rounded-full bg-white/75 border border-black/10 px-4 py-2 shadow-sm backdrop-blur-md"
                    onClick={() => setOpen((v) => !v)}
                >
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-medium text-black/70">{active}</span>
                    <span className="text-xs text-black/40 group-hover:text-black/60 transition">▾</span>
                </button>

                {open && (
                    <div className="mt-2 rounded-2xl bg-white/85 border border-black/10 shadow-lg backdrop-blur-xl p-2 w-[220px] mx-auto">
                        {typeOptions.map((t) => (
                            <button
                                key={t}
                                className={[
                                    "w-full text-left px-3 py-2 rounded-xl text-sm transition",
                                    t === active ? "bg-black text-white" : "hover:bg-black/5 text-black/75",
                                ].join(" ")}
                                onClick={() => {
                                    setActive(t)
                                    setOpen(false)
                                }}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* debug */}
            <div className="pointer-events-none absolute top-5 right-5 z-[95] text-[11px] text-black/40">
                {dragging ? "dragging…" : "idle"}
            </div>


        </section>
    )
}
