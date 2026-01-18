"use client"

import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useUser, useClerk } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { User, LogOut } from "lucide-react"

import { cn } from "@/src/lib/utils"
/* Components */
import EnhancedSearchbar from "@/src/components/Navbar/EnhancedSearchbar"

type FilterItemProps = {
    label: string
    count?: number
    isActive: boolean
    onClick: () => void
}

function FilterItem({ label, count, isActive, onClick }: FilterItemProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "group flex items-center justify-between w-full px-3 py-2 text-xs uppercase tracking-wider transition-all rounded-lg",
                isActive
                    ? "bg-black text-white font-medium"
                    : "text-black/50 hover:bg-black/5 hover:text-black"
            )}
        >
            <span>{label}</span>
            {count !== undefined && (
                <span
                    className={cn(
                        "ml-2 text-[10px] px-1.5 py-0.5 rounded-full",
                        isActive
                            ? "bg-white/20 text-white"
                            : "bg-black/5 text-black/40 group-hover:text-black/60"
                    )}
                >
                    {count}
                </span>
            )}
        </button>
    )
}

export interface FilterGroup {
    label: string
    options: string[]
}

interface LShapedNavbarProps {
    className?: string
    style?: React.CSSProperties

    // Data props
    activeFilters?: Record<string, string[]>
    filterGroups?: FilterGroup[]
    searchValue?: string

    // Callbacks
    onFilterToggle?: (type: string, value: string) => void
    onSearchChange?: (val: string) => void
    onResetAll?: () => void

    // Slots
    hero?: React.ReactNode
    children?: React.ReactNode

    // Legacy support (optional)
    onFilterChange?: (type: string, value: string) => void
}

export default function LShapedNavbar({
    className,
    activeFilters = {},
    filterGroups = [],
    onFilterToggle,
    // onFilterChange alias support
    onResetAll,
    searchValue,
    onSearchChange,
    hero,
    children
}: LShapedNavbarProps) {
    const { isLoaded, isSignedIn, user } = useUser()
    const { signOut } = useClerk()
    const router = useRouter()

    const navGap = "16px"
    const topH = "64px"
    const railW = "200px"

    // Flyout state
    const [hoveredFilter, setHoveredFilter] = useState<string | null>(null)
    const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null)
    const sidebarRef = useRef<HTMLDivElement>(null)

    // Hero state
    const [isHeroOpen, setIsHeroOpen] = useState(true)

    React.useEffect(() => {
        const onScroll = () => {
            setHoveredFilter(null)
            setHoveredRect(null)
        }
        window.addEventListener("scroll", onScroll, { passive: true })
        return () => window.removeEventListener("scroll", onScroll)
    }, [])

    // Smooth scroll to top when opening hero if scrolled down
    const toggleHero = () => {
        const nextState = !isHeroOpen;
        setIsHeroOpen(nextState);

        if (nextState) {
            // Scroll to top to ensure Hero is visible ("Expose Hero")
            // This replaces the complex sticky/fixed logic with a simple behavior reset.
            window.scrollTo({ top: 0, behavior: "smooth" })
        }
    }

    return (
        <div
            className={cn("relative w-full", className)}
            style={{
                ["--nav-gap" as any]: navGap,
                ["--top-h" as any]: topH,
                ["--rail-w" as any]: railW,
            } as React.CSSProperties}
        >
            {/* 1. HERO SECTION (Relative/In-Flow - Pushes content down) */}
            <AnimatePresence>
                {
                    hero && isHeroOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{
                                height: "auto",
                                opacity: 1,
                                transition: {
                                    height: { type: "spring", stiffness: 90, damping: 14, mass: 1.2 },
                                    opacity: { duration: 0.8, ease: "circOut", delay: 0.3 },
                                },
                            }}
                            exit={{
                                height: 0,
                                opacity: 0,
                                transition: {
                                    height: { type: "spring", stiffness: 250, damping: 30, mass: 0.8 },
                                    opacity: { duration: 0.15 },
                                },
                            }}
                            className="overflow-hidden bg-[#fafafa] border-b border-black/5 relative z-40"
                        >
                            <div className="pointer-events-auto relative p-0 m-0">
                                {hero}
                            </div>
                        </motion.div>
                    )
                }
            </AnimatePresence >

            {/* 2. NAVBAR (Sticky by default) */}
            < div className="sticky top-0 z-50 w-full border-b border-black/5 bg-white/80 backdrop-blur-md transition-shadow duration-500 shadow-sm" >
                <div className="flex items-center h-[var(--top-h)]">
                    {/* Logo Area */}
                    <div
                        className="flex items-center justify-center shrink-0 border-r border-black/5 bg-[#fafafa]/50"
                        style={{ width: "var(--rail-w)", height: "100%" }}
                    >
                        <div className="text-black font-bold tracking-[0.2em] text-sm">COVE</div>
                    </div>

                    {/* Search / Nav Area */}
                    <div className="flex-1 flex items-center px-6 relative">
                        <div className="w-full max-w-[400px] hidden md:block">
                            {/* Assuming EnhancedSearchbar handles its own state or accepts props (passing generic for now as previous usage was variant=sidebar) */}
                            <EnhancedSearchbar variant="sidebar" />
                        </div>

                        {/* CENTER TOGGLE BUTTON */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                            <button
                                onClick={toggleHero}
                                className="w-10 h-10 rounded-full bg-black/5 hover:bg-black/10 active:scale-90 flex items-center justify-center transition-all text-black/60 hover:text-black"
                                title={isHeroOpen ? "Minimize Hero" : "Expand Hero"}
                            >
                                <div className="text-sm font-bold tracking-widest scale-110">
                                    {isHeroOpen ? '[ ]' : '][ '}
                                </div>
                            </button>
                        </div>

                        {/* Right Buttons */}
                        <div className="flex items-center gap-3 ml-auto z-10">
                            {isLoaded && isSignedIn ? (
                                <>
                                    <button
                                        onClick={() => router.push('/dashboard')}
                                        className="hidden sm:inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-black/60 hover:text-black/90 hover:bg-black/5 transition font-medium"
                                    >
                                        <User className="h-4 w-4" />
                                        {user?.firstName || 'Dashboard'}
                                    </button>
                                    <button
                                        onClick={() => signOut()}
                                        className="rounded-full bg-black/5 hover:bg-black/10 text-black/70 px-4 py-2 text-sm transition-all font-medium flex items-center gap-2"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        <span className="hidden sm:inline">Sign out</span>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => router.push('/sign-in')}
                                        className="hidden sm:inline-flex rounded-full px-4 py-2 text-sm text-black/60 hover:text-black/90 transition font-medium"
                                    >
                                        Sign in
                                    </button>
                                    <button
                                        onClick={() => router.push('/sign-up')}
                                        className="rounded-full bg-black text-white px-5 py-2 text-sm hover:scale-105 active:scale-95 transition-all font-medium shadow-lg shadow-black/20"
                                    >
                                        Join Us
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div >

            {/* 3. BODY GRID */}
            < div className="w-full flex flex-col md:flex-row min-h-screen bg-[#fafafa]" >
                {/* Left rail (Sticky) */}
                < aside
                    ref={sidebarRef}
                    className="hidden md:flex flex-col w-[var(--rail-w)] shrink-0 border-r border-black/5 bg-[#fafafa] z-30"
                    style={{
                        position: "sticky",
                        top: "var(--top-h)",
                        height: "calc(100vh - var(--top-h))",
                    }}
                >
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
                                    label={group.label}
                                    count={selectedCount}
                                    isActive={isAnyOptionActive || (hoveredFilter === group.label)}
                                    // Expand logic could be added here if flyout menu was fully implemented
                                    onClick={() => { }}
                                />
                            )
                        })}

                        {/* Reset All */}
                        <button
                            onClick={onResetAll}
                            className="mt-6 text-[10px] text-black/40 hover:text-black uppercase tracking-widest transition-colors"
                        >
                            Reset All
                        </button>
                    </div>

                    <div className="p-6 text-center border-t border-black/5">
                        <div className="text-[10px] text-black/30">© 2024 COVE</div>
                        {isLoaded && isSignedIn && (
                            <div className="mt-2 text-[10px] text-emerald-600 font-medium flex items-center justify-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Online
                            </div>
                        )}
                    </div>
                </aside >

                {/* Main Content Area (Children injected here) */}
                < div className="relative flex-1 min-w-0" >
                    {children}
                </div >
            </div >
        </div >
    )
}
