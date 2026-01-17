"use client"

import { useState, useEffect, useRef } from "react"
import { Search, X, Loader2, ArrowRight } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { useRouter } from "next/navigation"

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value)
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay)
        return () => clearTimeout(handler)
    }, [value, delay])
    return debouncedValue
}

export type SearchMode = "collapsed" | "expanded"

type Props = {
    // If 'pill' mode, it replaces the GlobalNavbar search
    variant?: "pill" | "sidebar"
    onExpand?: () => void
    onCollapse?: () => void
    expanded?: boolean
}

type SearchResultItem = {
    product_id: string
    name: string
    slug: string
    brand_id: string
    base_price: string
    color_variants?: { images: { image_name: string }[] }[]
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001"

export default function EnhancedSearchbar({ variant = "pill", onExpand, onCollapse, expanded }: Props) {
    const router = useRouter()
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<SearchResultItem[]>([])
    const [loading, setLoading] = useState(false)
    const [active, setActive] = useState(false)

    // internal expand logic if not controlled
    const isExpanded = expanded ?? active

    const debouncedQuery = useDebounce(query, 300)
    const containerRef = useRef<HTMLDivElement>(null)

    // Handle outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setActive(false)
                onCollapse?.()
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [onCollapse])

    // Fetch API
    useEffect(() => {
        if (!debouncedQuery.trim()) {
            setResults([])
            return
        }

        async function fetchResults() {
            setLoading(true)
            try {
                const res = await fetch(`${API_BASE}/api/products/?search=${encodeURIComponent(debouncedQuery)}&page_size=5`)
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

    const handleFocus = () => {
        setActive(true)
        onExpand?.()
    }

    const clearSearch = (e: React.MouseEvent) => {
        e.stopPropagation()
        setQuery("")
        setResults([])
        if (variant === "sidebar") return // keep focused
        setActive(false)
        onCollapse?.()
    }

    // Styles based on variant
    const containerClasses = variant === "pill"
        ? "relative w-full h-full flex items-center"
        : "relative w-full"

    const inputWrapperClasses = variant === "pill"
        ? "relative flex items-center bg-gray-100/50 hover:bg-gray-100 transition-colors rounded-full h-10 md:h-12 px-4 cursor-text w-full"
        : "relative group w-full"

    const inputClasses = variant === "pill"
        ? "flex-1 bg-transparent border-none outline-none text-sm font-medium placeholder:text-black/30 w-full"
        : "w-full rounded-full bg-black/5 border border-black/5 px-4 py-2 text-sm text-black/85 placeholder:text-black/35 outline-none focus:border-black/20 focus:bg-black/10 transition-all font-medium"

    return (
        <div ref={containerRef} className={containerClasses}>
            {/* Input Area */}
            <div className={inputWrapperClasses} onClick={handleFocus}>
                {variant === "pill" ? (
                    <Search className="w-4 h-4 text-black/40 mr-3" />
                ) : (
                    // Sidebar doesn't show icon inside usually, but we can if we want
                    null
                )}

                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search catalog..."
                    className={inputClasses}
                    onFocus={handleFocus}
                />

                {/* Loading Spinner */}
                <AnimatePresence>
                    {loading && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="absolute right-8 top-1/2 -translate-y-1/2"
                        >
                            <Loader2 className="w-3.5 h-3.5 text-black/40 animate-spin" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Clear Button */}
                <AnimatePresence>
                    {(query.length > 0) && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            onClick={clearSearch}
                            className={`p-1 rounded-full hover:bg-black/10 transition-colors absolute ${variant === 'pill' ? 'right-2' : 'right-2 top-1/2 -translate-y-1/2'}`}
                        >
                            <X className="w-3 h-3 text-black/50" />
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>

            {/* RESULTS DROPDOWN */}
            <AnimatePresence>
                {isExpanded && (query.length > 0 || variant === 'sidebar') && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        className={`absolute left-0 right-0 bg-white border border-black/5 shadow-[0_20px_40px_-5px_rgba(0,0,0,0.1)] rounded-2xl overflow-hidden z-20 ${variant === 'pill' ? 'top-[calc(100%+12px)] w-[120%]' : 'top-[calc(100%+8px)] w-full'}`}
                        // Align pill dropdown nicely (center it slightly if expanded)
                        style={variant === 'pill' ? { left: '-10%', width: '120%' } : {}}
                    >
                        {/* 1. Empty State / Trending */}
                        {!query && (
                            <div className="p-4">
                                <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mb-3">Trending Now</p>
                                <div className="flex flex-wrap gap-2">
                                    {["Oversized Hoodie", "Summer", "Accessories", "Black"].map(tag => (
                                        <button key={tag} onClick={() => setQuery(tag)} className="px-3 py-1.5 bg-gray-50 hover:bg-black hover:text-white rounded-lg text-xs font-medium transition-colors">
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 2. Loading Skeleton */}
                        {loading && query && (
                            <div className="p-4 space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="flex gap-3 animate-pulse">
                                        <div className="w-10 h-12 bg-gray-100 rounded-md" />
                                        <div className="flex-1 space-y-2 py-1">
                                            <div className="h-3 bg-gray-100 rounded w-3/4" />
                                            <div className="h-2 bg-gray-100 rounded w-1/2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 3. Results List */}
                        {!loading && query && results.length > 0 && (
                            <div className="py-2">
                                <p className="px-4 py-2 text-[10px] font-bold text-black/40 uppercase tracking-widest">Products</p>
                                {results.map((item) => {
                                    // Find first image
                                    const img = item.color_variants?.[0]?.images?.[0]?.image_name
                                    return (
                                        <button
                                            key={item.product_id}
                                            onClick={() => {
                                                router.push(`/product/${item.slug}`)
                                                setActive(false)
                                                onCollapse?.()
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors text-left group"
                                        >
                                            {/* Thumbnail */}
                                            <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-200 rounded-md overflow-hidden shrink-0 border border-black/5">
                                                {img ? (
                                                    <img src={img} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-black/20 text-[8px]">IMG</div>
                                                )}
                                            </div>
                                            {/* Text */}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-semibold truncate text-black/80 group-hover:text-black">{item.name}</h4>
                                                <div className="flex items-center gap-2 text-xs text-black/50">
                                                    <span>{item.brand_id}</span>
                                                    <span>•</span>
                                                    <span>€{item.base_price}</span>
                                                </div>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-black/20 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
                                        </button>
                                    )
                                })}
                            </div>
                        )}

                        {/* 4. No Results */}
                        {!loading && query && results.length === 0 && (
                            <div className="p-6 text-center text-sm text-black/50">
                                No result found for "{query}"
                            </div>
                        )}

                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
