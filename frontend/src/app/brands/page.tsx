"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

type Brand = {
    brand_id: string
    brand_name: string
    slug: string
    logo_url: string | null
    theme_colors: {
        primary: string
        secondary: string
        accent: string
    }
    description: string
    is_active: boolean
}

export default function BrandsPage() {
    const router = useRouter()
    const [brands, setBrands] = useState<Brand[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchBrands() {
            try {
                const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8001';
                const res = await fetch(`${apiBase}/api/brands/`)
                if (res.ok) {
                    const data = await res.json()
                    setBrands(data.results || [])
                }
            } catch (err) {
                console.error('Failed to fetch brands:', err)
            } finally {
                setIsLoading(false)
            }
        }
        fetchBrands()
    }, [])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <p className="text-white text-xl">Loading brands...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <div className="max-w-7xl mx-auto px-8 py-16">
                <h1 className="text-6xl font-bold mb-4">Our Brands</h1>
                <p className="text-xl text-gray-400 mb-12">
                    Discover curated collections from premium lifestyle brands
                </p>

                {/* Brand Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {brands.map((brand, index) => (
                        <motion.div
                            key={brand.brand_id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => router.push(`/brands/${brand.slug}`)}
                            className="group cursor-pointer"
                        >
                            <div
                                className="relative overflow-hidden rounded-2xl p-8 h-64 flex flex-col justify-between transition-transform duration-300 group-hover:scale-105"
                                style={{
                                    background: `linear-gradient(135deg, ${brand.theme_colors.primary}20, ${brand.theme_colors.accent}30)`
                                }}
                            >
                                {/* Brand Name */}
                                <div>
                                    <h2 className="text-4xl font-bold mb-2">{brand.brand_name}</h2>
                                    <p className="text-sm text-gray-300 line-clamp-2">
                                        {brand.description}
                                    </p>
                                </div>

                                {/* Color Indicators */}
                                <div className="flex gap-3">
                                    <div
                                        className="w-8 h-8 rounded-full border-2 border-white/30"
                                        style={{ backgroundColor: brand.theme_colors.primary }}
                                    />
                                    <div
                                        className="w-8 h-8 rounded-full border-2 border-white/30"
                                        style={{ backgroundColor: brand.theme_colors.secondary }}
                                    />
                                    <div
                                        className="w-8 h-8 rounded-full border-2 border-white/30"
                                        style={{ backgroundColor: brand.theme_colors.accent }}
                                    />
                                </div>

                                {/* Hover Arrow */}
                                <div className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Back to Shopping */}
                <div className="mt-16 text-center">
                    <button
                        onClick={() => router.push('/shopping')}
                        className="px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-colors"
                    >
                        ← Back to All Products
                    </button>
                </div>
            </div>
        </div>
    )
}
