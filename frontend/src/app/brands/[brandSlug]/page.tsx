"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import CatalogCard from "@/src/components/Catalog/CatalogCard"
import type { CatalogCard as CatalogCardType } from "@/types/product"

type Brand = {
    brand_id: string
    brand_name: string
    slug: string
    logo_url: string | null
    theme_colors: { primary: string; secondary: string; accent: string }
    description: string
}

export default function BrandStorefrontPage({ params }: { params: Promise<{ brandSlug: string }> }) {
    const { brandSlug } = use(params)
    const router = useRouter()
    const [brand, setBrand] = useState<Brand | null>(null)
    const [products, setProducts] = useState<CatalogCardType[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchBrandAndProducts() {
            try {
                // Fetch brand details
                const brandRes = await fetch(`http://localhost:8001/api/brands/${brandSlug}/`)
                if (!brandRes.ok) {
                    router.push('/brands')
                    return
                }
                const brandData = await brandRes.json()
                setBrand(brandData)

                // Fetch products for this brand
                const productsRes = await fetch(`http://localhost:8001/api/products/?brand_id=${brandData.brand_id}`)
                if (productsRes.ok) {
                    const productsData = await productsRes.json()

                    // Transform to CatalogCard format
                    const formatted: CatalogCardType[] = productsData.results.map((product: any) => ({
                        id: product.product_id,
                        groupId: product.product_id,
                        slug: product.slug,
                        brand: product.brand_id,
                        layoutKey: 'default', // Layout configuration for card
                        name: product.name,
                        tier: product.tier || 'casual',
                        type: product.type || 'clothing',
                        material: product.material || 'Cotton',
                        price: parseFloat(product.base_price),
                        basePrice: parseFloat(product.base_price),
                        gender: product.gender || 'unisex',
                        fit: product.fit || 'regular',
                        description: product.description || '',
                        colors: product.color_variants?.map((v: any) => ({
                            colorName: v.color_name,
                            hex: v.hex,
                            variantId: v.variant_id,
                            images: v.images?.map((img: any) => {
                                const name = img.image_name
                                if (name.startsWith('http') || name.startsWith('/')) return name
                                return `/clothing-images/${name}`
                            }) || [],
                            sizes: {},
                            slug: v.slug
                        })) || [],
                        sizes: {}
                    }))

                    setProducts(formatted)
                }
            } catch (err) {
                console.error('Error fetching brand storefront:', err)
            } finally {
                setIsLoading(false)
            }
        }
        fetchBrandAndProducts()
    }, [brandSlug, router])

    if (isLoading) {
        return <div className="min-h-screen bg-black flex items-center justify-center"><p className="text-white">Loading...</p></div>
    }

    if (!brand) {
        return null
    }

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Brand Hero */}
            <div
                className="relative overflow-hidden py-24 px-8"
                style={{
                    background: `linear-gradient(135deg, ${brand.theme_colors.primary}30, ${brand.theme_colors.accent}20)`
                }}
            >
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <h1 className="text-7xl font-bold mb-6">{brand.brand_name}</h1>
                        <p className="text-2xl text-gray-300 max-w-3xl mb-8">{brand.description}</p>

                        {/* Brand Colors */}
                        <div className="flex gap-4 items-center">
                            <span className="text-sm text-gray-400">Brand Colors:</span>
                            <div className="flex gap-3">
                                <div className="w-10 h-10 rounded-full border-2 border-white/30" style={{ backgroundColor: brand.theme_colors.primary }} />
                                <div className="w-10 h-10 rounded-full border-2 border-white/30" style={{ backgroundColor: brand.theme_colors.secondary }} />
                                <div className="w-10 h-10 rounded-full border-2 border-white/30" style={{ backgroundColor: brand.theme_colors.accent }} />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Products Grid */}
            <div className="max-w-7xl mx-auto px-8 py-16">
                <h2 className="text-4xl font-bold mb-8">{brand.brand_name} Collection ({products.length} items)</h2>

                {products.length === 0 ? (
                    <p className="text-gray-400 text-center py-16">No products available for this brand yet.</p>
                ) : (
                    <div
                        className="grid gap-6"
                        style={{
                            gridTemplateColumns: 'repeat(auto-fill, minmax(var(--card-width, 300px), 1fr))',
                            '--card-width': '300px',
                            '--card-height': '400px'
                        } as any}
                    >
                        {products.map((product, index) => (
                            <CatalogCard key={product.id} {...product} layoutKey={index} />
                        ))}
                    </div>
                )}

                {/* Back Button */}
                <div className="mt-16 text-center">
                    <button
                        onClick={() => router.push('/brands')}
                        className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-full transition-colors"
                    >
                        ← All Brands
                    </button>
                </div>
            </div>
        </div>
    )
}
