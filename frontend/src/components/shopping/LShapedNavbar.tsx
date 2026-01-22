"use client"

import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useUser, useClerk } from "@clerk/nextjs"
import { useRouter, usePathname } from "next/navigation"
import { User, LogOut, Layers, Box, Globe2, ShoppingBag, Menu, ArrowLeft, ArrowRight, ChevronRight, Loader2 } from "lucide-react"
import clsx from "clsx"

import { cn } from "@/src/lib/utils"
/* Components */
import EnhancedSearchbar from "@/src/components/Navbar/EnhancedSearchbar"
import { useCartStore } from "@/src/store/cartStore"
import CartModal from "@/src/components/Catalog/CartModal"
import { useProductSearch } from "@/src/hooks/useProductSearch"
import { useAuthModal } from "@/src/context/AuthModalContext"

/* Types */
type MenuState = "none" | "search" | "brands" | "catalog" | "menu"

// Animation Config for "Dampened Spring" (Same as Global)
const SPRING_TRANSITION = {
    type: "spring",
    stiffness: 180,
    damping: 26,
    mass: 0.8
}

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
                    ? "bg-black text-white font-medium shadow-md shadow-black/10"
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
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001"

type Brand = {
    brand_id: string
    brand_name: string
    slug: string
    logo_url: string | null
}

export default function LShapedNavbar({
    className,
    activeFilters = {},
    filterGroups = [],
    onFilterToggle,
    onResetAll,
    hero,
    children
}: LShapedNavbarProps) {
    const { isLoaded, isSignedIn, user } = useUser()
    const { signOut } = useClerk()
    const router = useRouter()
    const pathname = usePathname()

    const { items: cartItems } = useCartStore()
    const itemCount = cartItems.reduce((sum, it) => sum + it.quantity, 0)
    const [cartOpen, setCartOpen] = useState(false)

    // Search Hook
    const { query, setQuery, results, loading: searchLoading } = useProductSearch()

    // Auth Modal
    const { openAuthModal } = useAuthModal()

    // Layout Constants
    const navGap = "16px"
    const topH = "64px" // Collapsed Height

    // SIDEBAR OPEN/CLOSE STATE
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const sidebarWidth = isSidebarOpen ? "240px" : "0px"
    // We keep a small reservation for the "rail" visual if needed, but requested "minimize going left side" implies smooth 0 width.

    // TOP BAR EXPANSION STATE
    const [menuState, setMenuState] = useState<MenuState>("none")
    const isExpanded = menuState !== "none"
    const expandedHeight = "420px" // Taller for catalog/brands

    // Hero Logic (Same as before)
    const [isHeroOpen, setIsHeroOpen] = useState(true)
    const toggleHero = () => {
        const nextState = !isHeroOpen;
        setIsHeroOpen(nextState);
        if (nextState) window.scrollTo({ top: 0, behavior: "smooth" })
    }

    // Brands Data
    const [brands, setBrands] = useState<Brand[]>([])
    const [loadingBrands, setLoadingBrands] = useState(false)

    // Fetch Brands Logic (Same as Global)
    useEffect(() => {
        if (menuState === "brands" && brands.length === 0) {
            setLoadingBrands(true)
            fetch(`${API_BASE}/api/brands/`)
                .then(res => res.json())
                .then(data => {
                    const list = Array.isArray(data) ? data : (data.results || [])
                    setBrands(list)
                })
                .catch(console.error)
                .finally(() => setLoadingBrands(false))
        }
    }, [menuState])


    const closeMenu = () => setMenuState("none")
    // Toggle logic: If clicking active state, switch to none. Else switch to new state.
    const toggleState = (s: MenuState) => setMenuState(prev => prev === s ? "none" : s)


    return (
        <div
            className={cn("relative w-full bg-white", className)}
            style={{
                ["--nav-gap" as any]: navGap,
                ["--top-h" as any]: topH,
                ["--rail-w" as any]: sidebarWidth,
            } as React.CSSProperties}
        >
            {/* 1. HERO SECTION (Full Width, Pushes everything down) */}
            <AnimatePresence>
                {hero && isHeroOpen && (
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
                        className="overflow-hidden bg-white border-b border-black/5 relative z-40"
                    >
                        {hero}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 2. MAIN SPLIT LAYOUT */}
            <div className="flex min-h-screen relative">

                {/* --- LEFT COLUMN (Sticky) --- */}
                {/* Brand + Sidebar share this vertical stack */}
                <motion.div
                    className="shrink-0 flex flex-col border-r border-black/5 bg-white z-50 overflow-hidden"
                    animate={{ width: sidebarWidth }}
                    transition={SPRING_TRANSITION}
                    style={{
                        position: "sticky",
                        top: 0,
                        height: "100vh",
                    }}
                >
                    {/* A. BRAND CONNECTOR (Fixed Height) */}
                    <div className="h-[64px] shrink-0 flex items-center justify-center border-b border-black/5">
                        <div className="text-black font-black tracking-[0.2em] text-sm uppercase">COVE</div>
                    </div>

                    {/* B. SIDEBAR CONTENT (Fills remaining height) */}
                    <div className="flex-1 w-[240px] flex flex-col p-4 relative overflow-y-auto no-scrollbar">
                        {/* Header with Close Button */}
                        <div className="flex items-center justify-between mb-6 px-1">
                            <span className="text-[10px] text-black/40 font-bold tracking-widest">FILTERS</span>
                            <button
                                onClick={() => setIsSidebarOpen(false)}
                                className="p-2 hover:bg-black/5 rounded-lg transition-colors text-black/60"
                                title="Minimize Sidebar"
                            >
                                <ArrowLeft size={16} />
                            </button>
                        </div>

                        {/* Filters List */}
                        <div className="flex-1 space-y-1">
                            {filterGroups.map((group) => {
                                const selectedCount = activeFilters[group.label]?.length || 0
                                const isAnyOptionActive = selectedCount > 0
                                return (
                                    <FilterItem
                                        key={group.label}
                                        label={group.label}
                                        count={selectedCount}
                                        isActive={isAnyOptionActive}
                                        onClick={() => { }}
                                    />
                                )
                            })}
                        </div>

                        <div className="mt-4 pt-4 border-t border-black/5 text-center">
                            <button
                                onClick={onResetAll}
                                className="text-[10px] uppercase font-bold text-black/40 hover:text-black transition-colors"
                            >
                                Reset All Filters
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* --- RIGHT COLUMN (Fluid) --- */}
                <div className="flex-1 flex flex-col min-w-0">

                    {/* C. TOP NAVBAR (Sticky) */}
                    <motion.div
                        className="sticky top-0 z-40 w-full border-b border-black/5 bg-white shadow-sm"
                        initial={false}
                        animate={{
                            height: isExpanded ? expandedHeight : topH
                        }}
                        transition={SPRING_TRANSITION}
                    >
                        {/* Navbar Content */}
                        <div className="absolute top-0 left-0 right-0 h-[64px] flex items-center px-6">

                            {/* Nav Buttons (Catalog / Brands) */}
                            <div className="flex items-center gap-2 mr-auto">
                                <AnimatePresence>
                                    {menuState !== "search" && (
                                        <motion.div
                                            initial={{ opacity: 0, width: 0 }}
                                            animate={{ opacity: 1, width: "auto" }}
                                            exit={{ opacity: 0, width: 0 }}
                                            className="overflow-hidden flex gap-2"
                                        >
                                            <TextButton
                                                active={menuState === "catalog"}
                                                onClick={() => toggleState("catalog")}
                                                label="Catalog"
                                                icon={<Layers size={14} />}
                                            />
                                            <TextButton
                                                active={menuState === "brands"}
                                                onClick={() => toggleState("brands")}
                                                label="Brands"
                                                icon={<Box size={14} />}
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* CENTER SEARCH */}
                            <motion.div
                                layout
                                className={clsx(
                                    "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-spring",
                                    menuState === "search" ? "w-[60%] pl-4" : "w-[320px]"
                                )}
                            >
                                <EnhancedSearchbar
                                    variant="pill"
                                    expanded={menuState === "search"}
                                    onExpand={() => setMenuState("search")}
                                    onCollapse={closeMenu}
                                    // Controlled props
                                    query={query}
                                    onQueryChange={setQuery}
                                    results={results}
                                    loading={searchLoading}
                                />
                            </motion.div>

                            {/* HERO TOGGLE */}
                            {menuState !== "search" && (
                                <div className="absolute left-[calc(50%+180px)] top-1/2 -translate-y-1/2 ml-4">
                                    <button
                                        onClick={toggleHero}
                                        className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition-all text-black/60 hover:text-black"
                                        title={isHeroOpen ? "Minimize Hero" : "Expand Hero"}
                                    >
                                        <div className="text-[10px] font-bold tracking-widest scale-110">
                                            {isHeroOpen ? '[ ]' : ']['}
                                        </div>
                                    </button>
                                </div>
                            )}

                            {/* RIGHT ACTIONS */}
                            <div className="flex items-center gap-3 ml-auto z-10">
                                <IconButton label="Language"> <Globe2 size={18} strokeWidth={2} /> </IconButton>
                                <div className="w-[1px] h-6 bg-black/5 mx-1 hidden md:block" />
                                <IconButton onClick={() => setCartOpen(true)} badge={itemCount > 0 ? itemCount : undefined} label="Cart">
                                    <ShoppingBag size={18} strokeWidth={2} />
                                </IconButton>
                                {!isSignedIn ? (
                                    <button onClick={() => openAuthModal('sign-in', pathname || '/shopping')} className="hidden sm:block text-xs font-bold bg-black text-white px-5 py-2 rounded-full hover:scale-105 transition-all shadow-lg shadow-black/20 ml-2">Login</button>
                                ) : (
                                    <button onClick={() => router.push("/dashboard")} className="ml-2 w-8 h-8 rounded-full bg-gray-100 overflow-hidden ring-1 ring-black/5">
                                        <img src={user?.imageUrl} alt="User" className="w-full h-full object-cover" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* D. DRAWER CONTENT */}
                        <AnimatePresence mode="wait">
                            {isExpanded && menuState !== "search" && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute top-[64px] left-0 right-0 bottom-0 p-8 z-10 overflow-y-auto no-scrollbar bg-white"
                                >


                                    {/* BRANDS CONTENT */}
                                    {menuState === "brands" && (
                                        <div className="h-full px-12">
                                            <div className="flex justify-between items-end mb-6">
                                                <h3 className="text-xl font-black uppercase tracking-tight text-black">Select Brand</h3>
                                                <button className="text-xs font-bold underline opacity-50 hover:opacity-100 text-black">View All</button>
                                            </div>
                                            {loadingBrands ? (
                                                <div className="flex justify-center p-10"><div className="w-6 h-6 rounded-full border-2 border-black/10 border-t-black animate-spin" /></div>
                                            ) : (
                                                <div className="grid grid-cols-4 gap-4">
                                                    {brands.slice(0, 8).map(brand => (
                                                        <div key={brand.brand_id} className="aspect-[2/1] bg-gray-50 rounded-xl flex items-center justify-center text-lg font-bold text-black hover:bg-gray-100 hover:scale-[1.02] transition-all cursor-pointer border border-black/5">
                                                            {brand.brand_name}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* CATALOG CONTENT */}
                                    {menuState === "catalog" && (
                                        <div className="h-full px-12 grid grid-cols-3 gap-8">
                                            {[
                                                { title: "Men", items: ["New Arrivals", "Best Sellers", "Clothing", "Shoes"] },
                                                { title: "Women", items: ["New Arrivals", "Trending", "Clothing", "Accessories"] },
                                                { title: "Collections", items: ["Summer '26", "Streetwear", "Minimalist", "Workwear"] }
                                            ].map((col, i) => (
                                                <div key={i} className="bg-gray-50 p-6 rounded-3xl border border-black/5 hover:border-black/10 transition-colors">
                                                    <h4 className="font-black uppercase tracking-tight mb-4 text-black">{col.title}</h4>
                                                    <ul className="space-y-3">
                                                        {col.items.map(item => (
                                                            <li key={item}><button className="text-sm font-semibold text-black/70 hover:text-black transition-colors">{item}</button></li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* E. PAGE CONTENT */}
                    <div className="flex-1 min-w-0 bg-white">
                        {children}
                    </div>
                </div>

                {/* F. EXPAND TRIGGER (Outside flow, fixed) */}
                <AnimatePresence>
                    {!isSidebarOpen && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="fixed left-0 top-[calc(64px+20px)] z-50 group"
                        >
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="bg-white border border-black/10 rounded-r-xl p-3 shadow-md flex items-center gap-2 group-hover:pl-4 transition-all"
                            >
                                <ChevronRight size={16} className="text-black/60" />
                                <span className="text-xs font-bold text-black overflow-hidden w-0 group-hover:w-auto opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap">Click to Expand</span>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>

            <CartModal open={cartOpen} onClose={() => setCartOpen(false)} />
        </div>
    )
}

// Subcomponents
function TextButton({ label, icon, active, onClick }: { label: string, icon: React.ReactNode, active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={clsx(
                "hidden md:flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all",
                active ? "bg-black text-white" : "hover:bg-black/5 text-black/60 hover:text-black"
            )}
        >
            {icon}
            <span>{label}</span>
        </button>
    )
}

function IconButton({ children, onClick, badge, active, label, className }: { children: React.ReactNode, onClick?: () => void, badge?: number, active?: boolean, label?: string, className?: string }) {
    return (
        <div className={clsx("relative group", className)}>
            <button
                onClick={onClick}
                className={clsx(
                    "w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300",
                    active ? "bg-black text-white" : "hover:bg-black/5 text-black/70"
                )}
            >
                {children}
                {badge && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                        {badge}
                    </span>
                )}
            </button>
            {label && (
                <span className="absolute top-full left-1/2 -translate-x-1/2 mt-3 px-2 py-1 bg-black text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {label}
                </span>
            )}
        </div>
    )
}
