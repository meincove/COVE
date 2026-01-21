"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import clsx from "clsx"

type Props = {
    images: string[]
}

export default function VerticalGallery({ images }: Props) {
    const [selectedIndex, setSelectedIndex] = useState(0)

    // Ensure we have at least one image
    const displayImages = images.length > 0 ? images : ["/clothing-images/fallback.jpg"]
    const mainImage = displayImages[selectedIndex]

    return (
        <div className="w-full h-full flex flex-col gap-6">
            {/* 3D Framed Main Image Container */}
            {/* Increased height by ~15% as requested (approx 65vh) */}
            <div className="relative w-[85%] md:w-[75%] mx-auto h-[60vh] md:h-[65vh] rounded-[2.5rem] bg-gray-50 transition-all duration-500 group perspective-1000 flex items-center justify-center">

                {/* Outer Glow & Shadow - The "3D" Feel */}
                <div className="absolute inset-0 rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)]" />
                <div className="absolute inset-0 rounded-[2.5rem] shadow-[0_0_0_1px_rgba(0,0,0,0.02)]" />
                {/* Stronger, nicer blue spread */}
                <div className="absolute -inset-1 rounded-[2.7rem] bg-gradient-to-tr from-blue-100/50 to-purple-100/50 blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="absolute inset-0 rounded-[2.5rem] shadow-[0_0_60px_-10px_rgba(59,130,246,0.3)] opacity-40 group-hover:opacity-70 transition-opacity duration-700" />

                {/* Main Image */}
                <div className="relative w-[96%] h-[97%] rounded-[2.3rem] overflow-hidden bg-white z-10">
                    <AnimatePresence mode="wait">
                        <motion.img
                            key={`${mainImage}-${selectedIndex}`}
                            src={mainImage}
                            alt="Product View"
                            initial={{ opacity: 0, scale: 1.08 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5, ease: "circOut" }}
                            className="w-full h-full object-contain p-1"
                        />
                    </AnimatePresence>

                    {/* Inner sheen */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/5 pointer-events-none" />
                </div>
            </div>

            {/* Thumbnails - Bottom Left (Centered relative to column) */}
            <div className="flex gap-3 overflow-x-auto pb-2 px-1 scrollbar-hide h-[12vh] items-center justify-center">
                {displayImages.map((src, i) => (
                    <button
                        key={`${src}-${i}`}
                        onClick={() => setSelectedIndex(i)}
                        className={clsx(
                            "relative w-16 h-auto aspect-[3/4] flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-all duration-300 ease-out",
                            selectedIndex === i
                                ? "border-black shadow-lg scale-100 opacity-100 ring-4 ring-black/5"
                                : "border-transparent opacity-50 hover:opacity-100 hover:scale-105"
                        )}
                    >
                        <img
                            src={src}
                            alt={`Thumbnail ${i}`}
                            className="w-full h-full object-cover"
                        />
                    </button>
                ))}
            </div>
        </div>
    )
}
