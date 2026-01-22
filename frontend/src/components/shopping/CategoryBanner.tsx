"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { UiProduct, resolveImgPath, FALLBACK_IMG } from "@/src/lib/catalog/shared"

type Props = {
    title: string
    imageSrc: string
    products: UiProduct[]
}

export default function CategoryBanner({ title, imageSrc, products }: Props) {
    // 1. Extract unique brands from the products of this category
    const brands = useMemo(() => {
        const unique = new Set(products.map(p => p.brandId || "COVE").filter(Boolean))
        return Array.from(unique)
    }, [products])

    // 2. Pagination logic for the brand animation loop
    // We want to show ~6-8 brands at a time
    const PAGE_SIZE = 8
    const [pageIndex, setPageIndex] = useState(0)

    // Only animate if we have more brands than the page size
    const totalPages = Math.ceil(brands.length / PAGE_SIZE)

    useEffect(() => {
        if (totalPages <= 1) return

        const interval = setInterval(() => {
            setPageIndex((prev) => (prev + 1) % totalPages)
        }, 5000)

        return () => clearInterval(interval)
    }, [totalPages])

    // Get current slice
    const currentBrands = brands.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE)

    return (
        <div className="w-full h-full relative flex flex-col bg-gray-100">
            {/* 
               Top Part: Image (~55-60%) 
               We use a gradient mask at the bottom to fade it into the brand area
            */}
            <div className="relative h-[60%] w-full overflow-hidden">
                <img
                    src={resolveImgPath(imageSrc)}
                    alt={title}
                    className="w-full h-full object-cover"
                />
                {/* Fade to white/gray at the bottom */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#f5f5f5]" />
            </div>

            {/* 
               Bottom Part: Animated Brands Grid 
               Background matches the fade target (light gray #f5f5f5)
            */}
            <div className="h-[40%] w-full bg-[#f5f5f5] px-6 py-4 flex flex-col justify-center relative overflow-hidden">
                <div className="text-[10px] uppercase tracking-widest text-black/40 mb-3 text-center border-b border-black/5 pb-2">
                    Featured Brands
                </div>

                <div className="relative h-20 w-full">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={pageIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                            className="absolute inset-0 grid grid-cols-2 md:grid-cols-4 gap-4 items-center justify-items-center"
                        >
                            {currentBrands.map((brand) => (
                                <div
                                    key={brand}
                                    className="text-center"
                                >
                                    {/* 
                                       Ideally we would show a Logo image here. 
                                       For now, we render the name in a "logo-like" style.
                                    */}
                                    <span className="text-sm md:text-base font-bold text-black/70 tracking-tight uppercase hover:text-black transition-colors cursor-default">
                                        {brand}
                                    </span>
                                </div>
                            ))}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}
