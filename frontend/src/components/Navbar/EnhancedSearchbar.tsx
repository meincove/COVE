import { useState, useEffect, useRef } from "react"
import { Search, X, Loader2, ArrowRight } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { useProductSearch } from "@/src/hooks/useProductSearch"

export type SearchMode = "collapsed" | "expanded"

type Props = {
    // Original props
    variant?: "pill" | "sidebar"
    onExpand?: () => void
    onCollapse?: () => void
    expanded?: boolean

    // Controlled props
    query?: string
    onQueryChange?: (q: string) => void
    externalResults?: boolean
    results?: any[]
    loading?: boolean
}

export default function EnhancedSearchbar({
    variant = "pill",
    onExpand,
    onCollapse,
    expanded,
    query: controlledQuery,
    onQueryChange,
    externalResults = false,
    results: controlledResults,
    loading: controlledLoading
}: Props) {
    const router = useRouter()

    // Use internal hook ONLY if not controlled or partial
    const internalSearch = useProductSearch()

    // Derived state - Prefer controlled if present
    const query = controlledQuery ?? internalSearch.query
    const setQuery = onQueryChange ?? internalSearch.setQuery
    // CRITICAL FIX: If using controlled query, must use controlled results!
    const results = controlledResults ?? internalSearch.results
    const loading = controlledLoading ?? internalSearch.loading

    const [active, setActive] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const isExpanded = expanded ?? active

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

    const handleFocus = () => {
        setActive(true)
        onExpand?.()
    }

    const clearSearch = (e: React.MouseEvent) => {
        e.stopPropagation()
        setQuery("")
        if (variant === "sidebar") return // keep focused
        setActive(false)
        onCollapse?.()
    }

    // If externalResults is true, we ONLY render the input shell, not the dropdown results
    // The shell animation might need adjustment too - if external results, maybe we don't expand height?
    const shouldExpandShell = isExpanded && (query || variant === 'sidebar') && !externalResults

    return (
        <div ref={containerRef} className={`relative w-full z-50 ${variant === 'pill' ? 'h-10 md:h-12' : 'h-10'}`}>

            {/* THE UNIFIED SHELL */}
            <motion.div
                layout
                initial={false}
                animate={{
                    height: shouldExpandShell ? "auto" : "100%",
                    backgroundColor: (isExpanded && query) ? "#ffffff" : (variant === 'pill' ? "rgba(243, 244, 246, 0.5)" : "rgba(0, 0, 0, 0.05)"),
                    borderRadius: (isExpanded && query) ? 24 : 9999,
                    boxShadow: (shouldExpandShell) ? "0 25px 50px -12px rgba(0, 0, 0, 0.25)" : "none",
                    border: (isExpanded && query) ? "1px solid rgba(0,0,0,0.05)" : "1px solid transparent"
                }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className="absolute top-0 left-0 right-0 overflow-hidden"
            >
                {/* INPUT ROW */}
                <div
                    className={`flex items-center px-4 cursor-text w-full ${variant === 'pill' ? 'h-10 md:h-12' : 'h-10'}`}
                    onClick={handleFocus}
                >
                    {variant === "pill" && (
                        <Search className="w-4 h-4 text-black/40 mr-3 shrink-0" />
                    )}

                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search catalog..."
                        className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-black placeholder:text-black/30 w-full min-w-0" // Bold text update
                        onFocus={handleFocus}
                    />

                    {/* Loading Spinner */}
                    <AnimatePresence>
                        {loading && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="mr-2"
                            >
                                <Loader2 className="w-3.5 h-3.5 text-black/40 animate-spin" />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Clear Button */}
                    <AnimatePresence>
                        {query.length > 0 && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                onClick={clearSearch}
                                className="p-1 rounded-full hover:bg-black/10 transition-colors"
                            >
                                <X className="w-3 h-3 text-black/50" />
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>

                {/* RESULTS AREA (Only if NOT externalResults) */}
                <AnimatePresence>
                    {shouldExpandShell && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="w-full border-t border-black/5"
                        >
                            {/* ... (Existing Results Logic, kept same but wrapped) ... */}
                            {loading && (
                                <div className="p-4 space-y-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex gap-3 animate-pulse">
                                            <div className="w-10 h-10 bg-gray-100 rounded-md" />
                                            <div className="flex-1 space-y-2 py-1">
                                                <div className="h-3 bg-gray-100 rounded w-3/4" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!loading && results.length > 0 && (
                                <div className="py-2 max-h-[320px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                                    <p className="px-4 py-2 text-[10px] font-black text-black uppercase tracking-widest sticky top-0 bg-white z-10">Products</p>
                                    {results.map((item) => {
                                        const img = item.color_variants?.[0]?.images?.[0]?.image_name
                                        return (
                                            <button
                                                key={item.product_id}
                                                onClick={() => {
                                                    router.push(`/product/${item.slug}`)
                                                    setActive(false)
                                                    onCollapse?.()
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left group border-b border-black/5 last:border-0"
                                            >
                                                <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden shrink-0 border border-black/10">
                                                    {img ? (
                                                        <img src={img} alt={item.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-black/40 text-[9px] font-bold">IMG</div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-bold text-black truncate">{item.name}</h4>
                                                    <div className="flex items-center gap-2 text-xs font-semibold text-black/70">
                                                        <span>€{item.base_price}</span>
                                                    </div>
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-black opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                                            </button>
                                        )
                                    })}
                                </div>
                            )}

                            {/* 3. Empty/Trends */}
                            {!loading && results.length === 0 && (
                                <div className="p-4">
                                    <p className="text-[10px] font-black text-black uppercase tracking-widest mb-3">Trending</p>
                                    <div className="flex flex-wrap gap-2">
                                        {["Oversized Hoodie", "Summer", "Accessories", "Black"].map(tag => (
                                            <button key={tag} onClick={(e) => { e.stopPropagation(); setQuery(tag); }} className="px-4 py-2 bg-gray-100 hover:bg-black hover:text-white rounded-lg text-xs font-bold text-black transition-colors">
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    )
}
