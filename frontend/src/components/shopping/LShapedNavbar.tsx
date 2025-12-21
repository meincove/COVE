"use client"

import React, { useState } from "react"
import { cn } from "@/src/lib/utils"
import { AnimatePresence, motion } from "framer-motion"

export type FilterGroup = {
    label: string
    options: string[]
}

type LShapedNavbarProps = {
    className?: string
    topHeightPx?: number
    railWidthPx?: number
    edgeGapPx?: number
    rightCutVW?: number

    searchValue?: string
    onSearchChange?: (v: string) => void

    activeFilters?: Record<string, string[]>
    onFilterChange?: (category: string, option: string) => void
    onResetAll?: () => void

    // Updated to support nested options
    filterGroups?: FilterGroup[]
}

export default function LShapedNavbar({
    className,
    topHeightPx = 76,
    railWidthPx = 112,
    edgeGapPx = 18,
    rightCutVW = 10,

    searchValue = "",
    onSearchChange,
    activeFilters = {},
    onFilterChange,
    onResetAll,
    filterGroups = [],
}: LShapedNavbarProps) {
    // Glass surface style - unified for all parts
    const surfaceClass = "bg-white/70 backdrop-blur-xl shadow-[0_18px_55px_rgba(0,0,0,0.18)]"

    // We use states for managing hover menus
    const [hoveredFilter, setHoveredFilter] = useState<string | null>(null)
    const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null)
    const [isMounted, setIsMounted] = React.useState(false)

    React.useEffect(() => {
        setIsMounted(true)
    }, [])

    const hoverTimeout = React.useRef<NodeJS.Timeout | null>(null)

    const handleHoverStart = (label: string, rect: DOMRect) => {
        if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
        setHoveredFilter(label)
        setHoveredRect(rect)
    }

    const handleHoverEnd = () => {
        hoverTimeout.current = setTimeout(() => {
            setHoveredFilter(null)
            setHoveredRect(null)
        }, 150) // 150ms grace period
    }

    const handleMenuEnter = () => {
        if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
    }

    return (
        <div
            className={cn("pointer-events-none fixed inset-0 z-40 font-sans", className)}
            style={
                {
                    "--nav-gap": `${edgeGapPx}px`,
                    "--top-h": `${topHeightPx}px`,
                    "--rail-w": `${railWidthPx}px`,
                    "--right-cut": `${rightCutVW}vw`,
                } as React.CSSProperties
            }
        >
            {/* 
               UNIFIED CONTAINER CONCEPT:
               To make it look like "One body", we render the parts with specific borders turned off where they connect.
            */}

            {/* TOP BAR */}
            <header
                className={cn(
                    "pointer-events-auto fixed",
                    surfaceClass,
                    "border-t border-b border-r border-black/10", // No left border (connector handles it)
                    "rounded-tr-[28px] rounded-br-[28px]", // Rounded right end
                )}
                style={{
                    top: "var(--nav-gap)",
                    left: "calc(var(--nav-gap) + var(--rail-w))", // Start after rail
                    right: "calc(var(--nav-gap) + var(--right-cut))",
                    height: "var(--top-h)",
                    borderLeft: "none",
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                }}
            >
                <div className="flex h-full w-full items-center gap-4 px-6">
                    {/* Search */}
                    <div className="flex-1 flex justify-center">
                        <div className="w-full max-w-[520px]">
                            <div className="relative group">
                                <input
                                    value={searchValue}
                                    onChange={(e) => onSearchChange?.(e.target.value)}
                                    className="w-full rounded-full bg-black/5 border border-black/5 px-4 py-2.5 text-sm text-black/85 placeholder:text-black/35 outline-none focus:border-black/20 focus:bg-black/10 transition-all font-medium"
                                    placeholder="Search catalog..."
                                />
                                {isMounted && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-black/35 text-xs border border-black/5 rounded-md px-2 py-1 bg-white/50">
                                        ⌘K
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center gap-2">
                        <button className="hidden sm:inline-flex rounded-full px-4 py-2 text-sm text-black/60 hover:text-black/90 transition font-medium">
                            Sign in
                        </button>
                        <button className="rounded-full bg-black text-white px-5 py-2 text-sm hover:scale-105 active:scale-95 transition-all font-medium shadow-lg shadow-black/20">
                            Sign up
                        </button>
                    </div>
                </div>
            </header>

            {/* LEFT RAIL */}
            <aside
                className={cn(
                    "pointer-events-auto fixed flex flex-col",
                    surfaceClass,
                    "border-l border-b border-r border-black/10", // No top border
                    "rounded-bl-[28px] rounded-br-[28px]"
                )}
                style={{
                    top: "calc(var(--nav-gap) + var(--top-h))", // Start below top bar height
                    bottom: "var(--nav-gap)",
                    left: "var(--nav-gap)",
                    width: "var(--rail-w)",
                    borderTop: "none",
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                }}
            >
                {/* Scrollable content area */}
                <div className="flex-1 overflow-y-auto no-scrollbar py-6 px-3 flex flex-col items-center gap-2">
                    <div className="text-[10px] text-black/40 font-bold tracking-widest mb-4 w-full text-center">
                        FILTERS
                    </div>

                    {filterGroups.map((group) => {
                        const selectedCount = activeFilters[group.label]?.length || 0
                        const isAnyOptionActive = selectedCount > 0

                        return (
                            <FilterItem
                                key={group.label}
                                group={group}
                                isActive={isAnyOptionActive}
                                selectedCount={selectedCount}
                                onHoverStart={(rect) => handleHoverStart(group.label, rect)}
                                onHoverEnd={handleHoverEnd}
                            />
                        )
                    })}

                    <div className="my-2 w-1/2 h-px bg-black/5 mx-auto" />

                    {/* Reset All */}
                    <button
                        onClick={onResetAll}
                        className={cn(
                            "w-full rounded-xl border px-2 py-3 text-[12px] font-medium transition-all hover:bg-black/5 hover:text-black text-black/60 border-transparent bg-transparent"
                        )}
                    >
                        Reset All
                    </button>
                </div>

                {/* Bottom Actions */}
                <div className="p-3 w-full flex flex-col gap-2 border-t border-black/5">
                    <button className="w-full rounded-xl bg-black/5 hover:bg-black/10 text-black/70 font-medium py-3 text-xs transition-colors border border-black/5">
                        Cart
                    </button>
                    <div className="w-full text-center text-[10px] text-black/20 pb-1">
                        © 2025
                    </div>
                </div>
            </aside>

            {/* CORNER CONNECTOR (The "Hub") */}
            <div
                className={cn(
                    "pointer-events-auto fixed flex items-center justify-center",
                    surfaceClass,
                    "border-t border-l border-black/10", // Top-Left borders
                    "rounded-tl-[28px]", // Exterior round
                )}
                style={{
                    top: "var(--nav-gap)",
                    left: "var(--nav-gap)",
                    width: "var(--rail-w)",
                    height: "var(--top-h)",
                    zIndex: 50, // Top z-index
                    borderRight: "none",
                    borderBottom: "none",
                    borderTopRightRadius: 0,
                    borderBottomLeftRadius: 0,
                    boxShadow: "none",
                }}
            >
                <div className="text-black font-bold tracking-[0.2em] text-sm">COVE</div>
            </div>

            {/* FLYOUT OVERLAY - Rendered outside the aside to escape clipping */}
            <AnimatePresence>
                {hoveredFilter && hoveredRect && (
                    <FlyoutMenu
                        group={filterGroups.find(g => g.label === hoveredFilter)!}
                        rect={hoveredRect}
                        activeFilters={activeFilters}
                        onSelect={(opt) => {
                            if (hoveredFilter) {
                                onFilterChange?.(hoveredFilter, opt)
                            }
                        }}
                        onMouseEnter={handleMenuEnter}
                        onMouseLeave={handleHoverEnd}
                    />
                )}
            </AnimatePresence>

        </div>
    )
}

// --- SUB-COMPONENTS ---

function FilterItem({
    group,
    isActive,
    selectedCount,
    onHoverStart,
    onHoverEnd
}: {
    group: FilterGroup
    isActive: boolean
    selectedCount: number
    onHoverStart: (rect: DOMRect) => void
    onHoverEnd: () => void
}) {
    const ref = React.useRef<HTMLButtonElement>(null)

    return (
        <button
            ref={ref}
            onMouseEnter={() => {
                if (ref.current) {
                    onHoverStart(ref.current.getBoundingClientRect())
                }
            }}
            onMouseLeave={onHoverEnd}
            className={cn(
                "w-full rounded-xl border px-2 py-3 text-[12px] font-medium transition-all duration-200 relative",
                isActive
                    ? "border-black/20 bg-black/10 text-black"
                    : "border-transparent bg-transparent text-black/60 hover:text-black hover:bg-black/5"
            )}
        >
            <div className="flex flex-col items-center leading-tight">
                <span>{group.label}</span>
                {isActive && (
                    <span className="text-[9px] opacity-60 font-normal">
                        ({selectedCount})
                    </span>
                )}
            </div>
            {isActive && (
                <div className="absolute right-2 top-2 w-1.5 h-1.5 rounded-full bg-black/40" />
            )}
        </button>
    )
}

function FlyoutMenu({
    group,
    rect,
    activeFilters,
    onSelect,
    onMouseEnter,
    onMouseLeave
}: {
    group: FilterGroup
    rect: DOMRect
    activeFilters: Record<string, string[]>
    onSelect: (val: string) => void
    onMouseEnter: () => void
    onMouseLeave: () => void
}) {
    // We position fixed based on the rect
    // left = rect.right + gap? No, we want it uniform.
    // Let's rely on the rail width which is passed via CSS vars, but here we are in JS.
    // However, rect.right is the exact edge of the button. The rail is slightly wider (gap).
    // Let's just use rect.right + 12px.

    const selectedOptions = activeFilters[group.label] || []

    return (
        <motion.div
            initial={{ opacity: 0, x: -10, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed z-[60] min-w-[220px] pointer-events-auto"
            style={{
                top: rect.top,
                left: rect.right + 12,
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className="rounded-2xl border border-black/10 bg-white/90 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,0,0,0.12)] p-2 flex flex-col gap-1">
                <div className="px-3 py-2 text-[10px] font-bold text-black/40 uppercase tracking-widest border-b border-black/5 mb-1 flex justify-between items-center">
                    <span>{group.label}</span>
                    <span className="text-[9px] bg-black/5 px-1.5 py-0.5 rounded text-black/50">
                        {group.options.length} options
                    </span>
                </div>

                <div className="max-h-[300px] overflow-y-auto no-scrollbar flex flex-col gap-1">
                    {group.options.map(option => {
                        const isSelected = selectedOptions.includes(option)
                        return (
                            <button
                                key={option}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onSelect(option)
                                }}
                                className={cn(
                                    "text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center justify-between group",
                                    isSelected
                                        ? "bg-black text-white font-medium shadow-md"
                                        : "text-black/70 hover:bg-black/5 hover:text-black"
                                )}
                            >
                                <span>{option}</span>
                                {isSelected ? (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                ) : (
                                    // Empty box or just hover effect? Standard checkbox look might be clearer
                                    <div className="w-3.5 h-3.5 rounded border border-black/20 group-hover:border-black/40" />
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>
        </motion.div>
    )
}

