// Brand-aware product detail page
// Reuses the existing product page component to maintain consistent styling

"use client"

import { use } from "react"
import { redirect } from "next/navigation"

export default function BrandProductPage({ params }: { params: Promise<{ brandSlug: string; slug: string }> }) {
    const { brandSlug, slug } = use(params)

    // Import the existing product page to maintain consistency
    // The brand context is preserved in the URL for analytics/SEO
    // Future enhancement: Pass brandSlug as prop for brand-specific theming

    // For now, we'll use a dynamic import to reuse the existing product page
    // This ensures the layout stays exactly the same
    const ProductPage = require("@/src/app/product/[slug]/page").default

    // Create params in the format the ProductPage expects
    const productParams = Promise.resolve({ slug })

    return <ProductPage params={productParams} />
}
