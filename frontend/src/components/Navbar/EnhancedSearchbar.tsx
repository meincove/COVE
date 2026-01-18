import { useState, useEffect, useRef } from "react"
import { Search, X, Loader2, ArrowRight } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { useProductSearch } from "@/src/hooks/useProductSearch"

export type SearchMode = "collapsed" | "expanded"

type Props = {
    // If 'pill' mode, it replaces the GlobalNavbar search
    variant?: "pill" | "sidebar"
    onExpand?: () => void
    onCollapse?: () => void
    expanded?: boolean
}

export default function EnhancedSearchbar({ variant = "pill", onExpand, onCollapse, expanded }: Props) {
    const router = useRouter()

    // Professional: Logic abstracted to hook
    const { query, setQuery, results, loading } = useProductSearch()

    const [active, setActive] = useState(false)

    // internal expand logic if not controlled
    const isExpanded = expanded ?? active
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

    // Unified Shell Pattern
    // The shell is an absolute container that sites on top of a relative placeholder.
    // This allows it to expand freely without pushing navbar layout, while maintaining its origin position.

    return (
        <div ref={containerRef} className={`relative w-full z-50 ${variant === 'pill' ? 'h-10 md:h-12' : 'h-10'}`}>

            {/* THE UNIFIED SHELL */}
            <motion.div
                layout
                initial={false}
                animate={{
                    height: (isExpanded && (query || variant === 'sidebar')) ? "auto" : "100%",
                    backgroundColor: (isExpanded && query) ? "#ffffff" : (variant === 'pill' ? "rgba(243, 244, 246, 0.5)" : "rgba(0, 0, 0, 0.05)"),
                    borderRadius: (isExpanded && query) ? 24 : 9999, // 3xl vs full
                    boxShadow: (isExpanded && query) ? "0 25px 50px -12px rgba(0, 0, 0, 0.25)" : "none",
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
                        className="flex-1 bg-transparent border-none outline-none text-sm font-medium placeholder:text-black/30 w-full min-w-0"
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

                {/* RESULTS AREA (Inside the Shell) */}
                <AnimatePresence>
                    {isExpanded && query && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="w-full border-t border-black/5"
                        >
                            {/* 1. Loading Skeleton */}
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

                            {/* 2. Results List */}
                            {!loading && results.length > 0 && (
                                <div className="py-2">
                                    <p className="px-4 py-2 text-[10px] font-bold text-black/40 uppercase tracking-widest">Products</p>
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
                                                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors text-left group"
                                            >
                                                <div className="w-10 h-10 bg-gray-200 rounded-md overflow-hidden shrink-0 border border-black/5">
                                                    {img ? (
                                                        <img src={img} alt={item.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-black/20 text-[8px]">IMG</div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-semibold truncate text-black/80 group-hover:text-black">{item.name}</h4>
                                                    <div className="flex items-center gap-2 text-xs text-black/50">
                                                        <span>€{item.base_price}</span>
                                                    </div>
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-black/20 opacity-0 group-hover:opacity-100 transition-all" />
                                            </button>
                                        )
                                    })}
                                </div>
                            )}

                            {/* 3. Empty/Trends */}
                            {!loading && results.length === 0 && (
                                <div className="p-4">
                                    <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mb-3">Trending</p>
                                    <div className="flex flex-wrap gap-2">
                                        {["Oversized Hoodie", "Summer", "Accessories", "Black"].map(tag => (
                                            <button key={tag} onClick={(e) => { e.stopPropagation(); setQuery(tag); }} className="px-3 py-1.5 bg-gray-50 hover:bg-black hover:text-white rounded-lg text-xs font-medium transition-colors">
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
