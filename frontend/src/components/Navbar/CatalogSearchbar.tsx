"use client"

import { Search, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"

export type SearchMode = "collapsed" | "expanded"

type Props = {
    expanded: boolean
    onExpand: () => void
    onCollapse: () => void
}

export default function CatalogSearchbar({ expanded, onExpand, onCollapse }: Props) {
    const [query, setQuery] = useState("")

    return (
        <div className="flex-1 max-w-2xl mx-auto relative group">
            {/* Search Container */}
            <motion.div
                layout
                className="relative flex items-center bg-gray-100/50 hover:bg-gray-100 transition-colors rounded-full h-10 md:h-12 px-4 cursor-text"
                onClick={onExpand}
            >
                <Search className="w-4 h-4 text-black/40 mr-3" />

                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search catalog..."
                    className="flex-1 bg-transparent border-none outline-none text-sm font-medium placeholder:text-black/30 w-full"
                    onFocus={onExpand}
                />

                {/* Clear/Close button if expanded or has text */}
                <AnimatePresence>
                    {(expanded || query) && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            onClick={(e) => {
                                e.stopPropagation()
                                setQuery("")
                                onCollapse()
                            }}
                            className="p-1 rounded-full hover:bg-black/10 transition-colors"
                        >
                            <X className="w-3 h-3 text-black/50" />
                        </motion.button>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    )
}
