// frontend/src/lib/catalog/shared.ts
export type UiProduct = {
    id: string
    slug?: string
    variantId?: string  // First variant ID for product page redirects
    name: string
    brandId?: string
    brandName?: string // NEW
    price: number
    oldPrice?: number
    badge?: string
    type?: string
    fit?: string
    tier?: string
    sizes?: string[]
    colorNames?: string[]
    imageSrc: string
    // optional extra images if you have them
    images?: string[]
    affiliateUrl?: string
}

// No-404 fallback (so you never spam console with missing fallback.jpg)
export const FALLBACK_IMG =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
    <rect width="100%" height="100%" fill="#f3f4f6"/>
    <path d="M40 180l52-62 38 46 26-30 60 72H40z" fill="#d1d5db"/>
    <circle cx="92" cy="92" r="18" fill="#e5e7eb"/>
  </svg>`)

export function resolveImgPath(raw?: string | null) {
    if (!raw) return FALLBACK_IMG
    const s = String(raw)
    if (s.startsWith("http")) return s
    if (s.startsWith("data:image")) return s
    if (s.startsWith("/")) return s
    if (s.startsWith("uploads/")) return `/media/${s}`
    return `/clothing-images/${s}`
}

export function formatPriceEUR(n: number) {
    try {
        return new Intl.NumberFormat("de-DE", {
            style: "currency",
            currency: "EUR",
            maximumFractionDigits: 2,
        }).format(n)
    } catch {
        return `${n.toFixed(2)} €`
    }
}
