"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { UiProduct, resolveImgPath, FALLBACK_IMG } from "@/lib/catalog/shared"

type ApiImage = { image_name?: string; url?: string }
type ApiVariant = { images?: ApiImage[] }
type ApiProduct = {
    product_id: string
    slug?: string
    name: string
    brand_id?: string
    base_price?: number | string
    old_price?: number | string
    is_new?: boolean
    type?: string
    fit?: string
    tier?: string
    color_variants?: ApiVariant[]
}

function num(v: unknown, fallback = 0) {
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
}

function mapApi(p: ApiProduct): UiProduct {
    const img0 =
        p.color_variants?.[0]?.images?.[0]?.url ||
        p.color_variants?.[0]?.images?.[0]?.image_name ||
        FALLBACK_IMG

    const img = resolveImgPath(String(img0))

    return {
        id: String(p.product_id),
        slug: p.slug,
        name: p.name,
        brandId: p.brand_id,
        price: num(p.base_price, 0),
        oldPrice: p.old_price != null ? num(p.old_price, 0) : undefined,
        badge: p.is_new ? "NEW" : "",
        type: p.type,
        fit: p.fit,
        tier: p.tier,
        images: [img],
        imageSrc: img,
        colorNames: [],
        sizes: [],
    } as UiProduct
}

export function useCatalogBrowse({
    apiBase,
    typeName,
    pageSize = 48,
    enabled = true,
}: {
    apiBase: string
    typeName: string
    pageSize?: number
    enabled?: boolean
}) {
    const [items, setItems] = useState<UiProduct[]>([])
    const [totalCount, setTotalCount] = useState<number>(0)
    const [hasMore, setHasMore] = useState(true)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const pageRef = useRef(1)
    const abortRef = useRef<AbortController | null>(null)

    const reset = useCallback(() => {
        pageRef.current = 1
        setItems([])
        setTotalCount(0)
        setHasMore(true)
        setError(null)
    }, [])

    const loadMore = useCallback(async () => {
        if (!enabled) return
        if (loading) return
        if (!hasMore) return
        if (!typeName) return

        setLoading(true)
        setError(null)

        abortRef.current?.abort()
        const ac = new AbortController()
        abortRef.current = ac

        try {
            const page = pageRef.current

            // ✅ IMPORTANT: exact-match filter (because we now pass real API type string)
            const url =
                `${apiBase}/api/products/?page=${page}&page_size=${pageSize}` +
                `&type=${encodeURIComponent(typeName)}`

            const res = await fetch(url, { signal: ac.signal, cache: "no-store" })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const json = await res.json()

            const results: ApiProduct[] = json.results || []
            const count: number = Number(json.count ?? 0)
            const next: string | null = json.next ?? null

            const mapped = results.map(mapApi)

            setItems((prev) => {
                // prevent accidental duplicates across pages
                const seen = new Set(prev.map((x) => x.id))
                const merged = [...prev]
                for (const m of mapped) if (!seen.has(m.id)) merged.push(m)
                return merged
            })

            setTotalCount(count)
            setHasMore(Boolean(next) && mapped.length > 0)
            pageRef.current = page + 1
        } catch (e: any) {
            if (e?.name !== "AbortError") setError(e?.message ?? "Failed")
        } finally {
            setLoading(false)
        }
    }, [apiBase, enabled, hasMore, loading, pageSize, typeName])

    useEffect(() => {
        if (!enabled) return
        // auto-load first page
        if (items.length === 0) loadMore()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, typeName])

    useEffect(() => {
        return () => abortRef.current?.abort()
    }, [])

    return { items, totalCount, hasMore, loading, error, loadMore, reset }
}
