import { useState, useEffect } from "react"
import { useDebounce } from "@/src/hooks/useDebounce" // We'll assume or create this too

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001"

export type SearchResultItem = {
    product_id: string
    name: string
    slug: string
    brand_id: string
    base_price: string
    color_variants?: { images: { image_name: string }[] }[]
}

export function useProductSearch() {
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<SearchResultItem[]>([])
    const [loading, setLoading] = useState(false)

    // Custom debounce implementation if not existing
    const [debouncedQuery, setDebouncedQuery] = useState(query)
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedQuery(query), 300)
        return () => clearTimeout(handler)
    }, [query])

    useEffect(() => {
        if (!debouncedQuery.trim()) {
            setResults([])
            return
        }

        async function fetchResults() {
            setLoading(true)
            try {
                // Professional Step: We could eventually move this to a dedicated /search/ endpoint 
                // if we want complex aggregation (products + collections + brands mixed), 
                // but ?search= remains the standard REST pattern.
                const res = await fetch(`${API_BASE}/api/products/?search=${encodeURIComponent(debouncedQuery)}&page_size=6`)
                if (res.ok) {
                    const data = await res.json()
                    setResults(data.results || [])
                }
            } catch (e) {
                console.error("Search failed", e)
            } finally {
                setLoading(false)
            }
        }
        fetchResults()
    }, [debouncedQuery])

    return {
        query,
        setQuery,
        results,
        loading
    }
}
