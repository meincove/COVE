
import { UiProduct, resolveImgPath } from './shared'
import { CatalogCard, ProductColor } from '@/types/product'

/**
 * Transforms a generic shopping page product (UiProduct) 
 * into the rich CatalogCard format required by the 3D Carousel.
 */
export function uiProductToCatalogCard(p: UiProduct): CatalogCard {
    // 1. Create a "fake" variant structure since UiProduct is flattened
    //    We assume the main image is the "first color".
    const colorEntry: ProductColor = {
        colorName: 'Standard', // generic fallback
        hex: '#000000',        // generic fallback
        variantId: p.variantId || p.id,
        images: (p.images && p.images.length > 0)
            ? p.images.map(img => resolveImgPath(img))
            : [resolveImgPath(p.imageSrc)],
        sizes: {}, // we don't have stock data in UiProduct, so empty
        slug: p.slug || p.id
    }

    return {
        id: p.id,
        groupId: p.id,
        slug: p.slug || p.id,
        brand: p.brandId || 'COVE',

        // Ensure name is never empty
        name: p.name || 'Untitled Product',

        // Map or fallback fields
        tier: (p.tier || 'casual').toLowerCase(),
        type: (p.type || 'clothing').toLowerCase(),
        material: 'Premium', // fallback

        // Price handling
        price: p.price,
        basePrice: p.price,

        gender: 'unisex',
        fit: p.fit || 'regular',
        description: `${p.name} - Available now.`,

        // Single color entry derived from the flattened data
        colors: [colorEntry],

        // No aggregated sizes available in simple view
        sizes: {}
    }
}
