"use client"

import React, { useState } from "react"
import { cn } from "@/src/lib/utils"
import { AnimatePresence, motion } from "framer-motion"

export type FilterGroup = {
    label: string
    options: string[]
}

type CSSLen = string

type LShapedNavbarProps = {
    className?: string

    topHeight?: CSSLen
    railWidth?: CSSLen
    edgeGap?: CSSLen

    topHeightPx?: number
    railWidthPx?: number
    edgeGapPx?: number

    searchValue?: string
    onSearchChange?: (v: string) => void

    activeFilters?: Record<string, string[]>
    onFilterToggle?: (category: string, option: string) => void
    onResetAll?: () => void

    filterGroups?: FilterGroup[]

    /** ✅ HERO SLOT: rendered ABOVE navbar + body (NOT inside grid) */
    hero?: React.ReactNode

    children: React.ReactNode
}

export default function LshapedNavbar({
    className,

    topHeight,
    railWidth,
    edgeGap,

    topHeightPx = 76,
    railWidthPx = 112,
    edgeGapPx = 18,

    searchValue = "",
    onSearchChange,
    activeFilters = {},
    onFilterToggle,
    onResetAll,
    filterGroups = [],

    hero,
    children,
}: LShapedNavbarProps) {
    const surfaceClass =
        "bg-white/90 backdrop-blur-xl shadow-[0_18px_55px_rgba(0,0,0,0.14)]"

    const [hoveredFilter, setHoveredFilter] = useState<string | null>(null)
    const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null)
    const [isMounted, setIsMounted] = React.useState(false)

    React.useEffect(() => setIsMounted(true), [])

    const hoverTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null)

    const handleHoverStart = (label: string, rect: DOMRect) => {
        if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
        setHoveredFilter(label)
        setHoveredRect(rect)
    }

    const handleHoverEnd = () => {
        hoverTimeout.current = setTimeout(() => {
            setHoveredFilter(null)
            setHoveredRect(null)
        }, 150)
    }

    const handleMenuEnter = () => {
        if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
    }

    const navGap = edgeGap ?? `${edgeGapPx}px`
    const topH = topHeight ?? `${topHeightPx}px`
    const railW = railWidth ?? `${railWidthPx}px`

    const railStickyTop = `calc(var(--nav-gap) + var(--top-h))`

    return (
        <div
            className={cn("relative w-full", className)}
            style={
                {
                    ["--nav-gap" as any]: navGap,
                    ["--top-h" as any]: topH,
                    ["--rail-w" as any]: railW,
                } as React.CSSProperties
            }
        >
            {/* ✅ HERO FIRST (so it is not “under navbar / inside body”) */}
            {hero ? <div className="pointer-events-auto relative p-0 m-0">{hero}</div> : null}


            {/* STICKY HEADER ROW (will stick only once you scroll past hero) */}
            <div className="sticky top-0 z-50">
                <div
                    className="w-full bg-gradient-to-b from-white/70 via-white/85 to-white/92 backdrop-blur-xl"
                    style={{
                        paddingTop: "var(--nav-gap)",
                        paddingLeft: "var(--nav-gap)",
                        paddingRight: "var(--nav-gap)",
                        paddingBottom: 0,
                    }}
                >
                    <div className="flex items-stretch gap-[var(--nav-gap)]">
                        {/* Logo */}
                        <div
                            className={cn(
                                "shrink-0 flex items-center justify-center",
                                surfaceClass,
                                "border border-black/10",
                                "rounded-[28px]"
                            )}
                            style={{
                                width: "var(--rail-w)",
                                height: "var(--top-h)",
                            }}
                        >
                            <div className="text-black font-bold tracking-[0.2em] text-sm">
                                COVE
                            </div>
                        </div>

                        {/* Top bar */}
                        <header
                            className={cn(
                                "flex-1",
                                surfaceClass,
                                "border border-black/10",
                                "rounded-[28px]"
                            )}
                            style={{
                                height: "var(--top-h)",
                            }}
                        >
                            <div className="flex h-full w-full items-center gap-4 px-6">
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
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-black/35 text-xs border border-black/5 rounded-md px-2 py-1 bg-white/70">
                                                    ⌘K
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

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
                    </div>

                    <div style={{ height: "var(--nav-gap)" }} />
                </div>
            </div>

            {/* BODY GRID */}
            <div
                className="w-full"
                style={{
                    paddingLeft: "var(--nav-gap)",
                    paddingRight: "var(--nav-gap)",
                    paddingBottom: "var(--nav-gap)",
                    paddingTop: "var(--nav-gap)",
                }}
            >
                <div
                    className="grid w-full gap-[var(--nav-gap)]"
                    style={{
                        gridTemplateColumns: `var(--rail-w) minmax(0, 1fr)`,
                    }}
                >
                    {/* Left rail */}
                    <aside
                        className={cn(
                            "self-start",
                            surfaceClass,
                            "border border-black/10",
                            "rounded-[28px]"
                        )}
                        style={{
                            position: "sticky",
                            top: railStickyTop,
                            height: `calc(100dvh - (${railStickyTop}) - var(--nav-gap))`,
                            overflow: "hidden",
                        }}
                    >
                        <div className="h-full flex flex-col">
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
                                            onHoverStart={(rect) =>
                                                handleHoverStart(group.label, rect)
                                            }
                                            onHoverEnd={handleHoverEnd}
                                        />
                                    )
                                })}

                                <div className="my-2 w-1/2 h-px bg-black/5 mx-auto" />

                                <button
                                    onClick={onResetAll}
                                    className="w-full rounded-xl border px-2 py-3 text-[12px] font-medium transition-all hover:bg-black/5 hover:text-black text-black/60 border-transparent bg-transparent"
                                >
                                    Reset All
                                </button>
                            </div>

                            <div className="p-3 w-full flex flex-col gap-2 border-t border-black/5">
                                <button className="w-full rounded-xl bg-black/5 hover:bg-black/10 text-black/70 font-medium py-3 text-xs transition-colors border border-black/5">
                                    Cart
                                </button>
                                <div className="w-full text-center text-[10px] text-black/20 pb-1">
                                    © 2025
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Main content */}
                    <div className="min-w-0">{children}</div>
                </div>
            </div>

            {/* Flyout */}
            <AnimatePresence>
                {hoveredFilter && hoveredRect && (
                    <FlyoutMenu
                        group={filterGroups.find((g) => g.label === hoveredFilter)!}
                        rect={hoveredRect}
                        activeFilters={activeFilters}
                        onSelect={(opt) => {
                            if (hoveredFilter) onFilterToggle?.(hoveredFilter, opt)
                        }}
                        onMouseEnter={handleMenuEnter}
                        onMouseLeave={handleHoverEnd}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

function FilterItem({
    group,
    isActive,
    selectedCount,
    onHoverStart,
    onHoverEnd,
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
                if (ref.current) onHoverStart(ref.current.getBoundingClientRect())
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
    onMouseLeave,
}: {
    group: FilterGroup
    rect: DOMRect
    activeFilters: Record<string, string[]>
    onSelect: (val: string) => void
    onMouseEnter: () => void
    onMouseLeave: () => void
}) {
    const selectedOptions = activeFilters[group.label] || []

    return (
        <motion.div
            initial={{ opacity: 0, x: -10, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed z-[70] min-w-[220px] pointer-events-auto"
            style={{
                top: rect.top,
                left: rect.right + 12,
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className="rounded-2xl border border-black/10 bg-white/92 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,0,0,0.12)] p-2 flex flex-col gap-1">
                <div className="px-3 py-2 text-[10px] font-bold text-black/40 uppercase tracking-widest border-b border-black/5 mb-1 flex justify-between items-center">
                    <span>{group.label}</span>
                    <span className="text-[9px] bg-black/5 px-1.5 py-0.5 rounded text-black/50">
                        {group.options.length} options
                    </span>
                </div>

                <div className="max-h-[300px] overflow-y-auto no-scrollbar flex flex-col gap-1">
                    {group.options.map((option) => {
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
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="text-white"
                                    >
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                ) : (
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
