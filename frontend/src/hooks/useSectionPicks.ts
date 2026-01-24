"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { UiProduct } from "@/lib/catalog/shared"
import { FALLBACK_IMG, resolveImgPath } from "@/lib/catalog/shared"

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

function getImage(p: ApiProduct) {
    const img = p.color_variants?.[0]?.images?.[0]
    const raw = img?.url || img?.image_name
    if (!raw) return FALLBACK_IMG
    return resolveImgPath(String(raw))
}

function mapApi(p: ApiProduct): UiProduct {
    return {
        id: String(p.product_id),
        slug: p.slug,
        name: p.name,
        brandId: p.brand_id,
        price: num(p.base_price, 0),
        oldPrice: p.old_price != null ? num(p.old_price, undefined as any) : undefined,
        badge: p.is_new ? "NEW" : "",
        type: p.type,
        fit: p.fit,
        tier: p.tier,
        imageSrc: getImage(p),
        images: [getImage(p)],
    }
}

export type SectionBlock = {
    type: string
    title: string
    total: number
    items: UiProduct[]
    loading: boolean
    error?: string | null
}

export function useSectionPicks({
    apiBase,
    types,
    pageSize = 12,
}: {
    apiBase: string
    types: { type: string; title: string }[]
    pageSize?: number
}) {
    const [data, setData] = useState<Record<string, SectionBlock>>({})
    const abortRef = useRef<AbortController | null>(null)

    useEffect(() => {
        abortRef.current?.abort()
        const ac = new AbortController()
        abortRef.current = ac

        setData(() => {
            const init: Record<string, SectionBlock> = {}
            for (const t of types) {
                init[t.type] = {
                    type: t.type,
                    title: t.title,
                    total: 0,
                    items: [],
                    loading: true,
                    error: null,
                }
            }
            return init
        })

            ; (async () => {
                await Promise.all(
                    types.map(async (t) => {
                        try {
                            const url =
                                `${apiBase}/api/products/?type=${encodeURIComponent(t.title)}` +
                                `&page=1&page_size=${pageSize}`

                            const res = await fetch(url, { signal: ac.signal })
                            if (!res.ok) throw new Error(`HTTP ${res.status}`)
                            const json = await res.json()

                            const results: ApiProduct[] = json.results || []
                            const mapped = results.map(mapApi)

                            const total = Number(json.count ?? mapped.length)

                            setData((prev) => ({
                                ...prev,
                                [t.type]: {
                                    ...prev[t.type],
                                    loading: false,
                                    items: mapped,
                                    total,
                                    error: null,
                                },
                            }))
                        } catch (e: any) {
                            if (e?.name === "AbortError") return
                            setData((prev) => ({
                                ...prev,
                                [t.type]: {
                                    ...prev[t.type],
                                    loading: false,
                                    error: e?.message || "Failed to load",
                                },
                            }))
                        }
                    })
                )
            })()

        return () => ac.abort()
    }, [apiBase, pageSize, types])

    return useMemo(() => Object.values(data).filter(Boolean), [data])
}
