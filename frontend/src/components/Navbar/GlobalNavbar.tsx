"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { useUser, useClerk } from "@clerk/nextjs"
import { ShoppingBag, Globe2, Heart, Menu, Box, Layers, Play } from "lucide-react"
import clsx from "clsx"

import EnhancedSearchbar from "./EnhancedSearchbar"
import { useCartStore } from "@/src/store/cartStore"
import CartModal from "@/src/components/Catalog/CartModal"

// Animation Config for "Dampened Spring"
const SPRING_TRANSITION = {
    type: "spring",
    stiffness: 180,
    damping: 26,
    mass: 0.8
}

type MenuState = "none" | "search" | "brands" | "catalog" | "menu"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001"

type Brand = {
    brand_id: string
    brand_name: string
    slug: string
    logo_url: string | null
    theme_colors: { primary: string }
}

export default function GlobalNavbar() {
    const router = useRouter()
    const { isSignedIn, user } = useUser()
    const { signOut } = useClerk()
    const { items } = useCartStore()
    const itemCount = items.reduce((sum, it) => sum + it.quantity, 0)

    const [menuState, setMenuState] = useState<MenuState>("none")
    const [cartOpen, setCartOpen] = useState(false)
    const [brands, setBrands] = useState<Brand[]>([])
    const [loadingBrands, setLoadingBrands] = useState(false)

    // Fetch brands when menu opens or on mount
    useEffect(() => {
        // Simple fetch on mount for now
        async function fetchBrands() {
            try {
                setLoadingBrands(true)
                const res = await fetch(`${API_BASE}/api/brands/`)
                if (res.ok) {
                    const data = await res.json()
                    // Handle pagination if results exists, or array
                    const list = Array.isArray(data) ? data : (data.results || [])
                    setBrands(list)
                }
            } catch (e) {
                console.error("Failed to fetch brands", e)
            } finally {
                setLoadingBrands(false)
            }
        }
        fetchBrands()
    }, [])

    // Derived state
    const isExpanded = menuState !== "none"
    const expandedHeight = "420px" // Taller for catalog/brands
    const collapsedHeight = "64px"

    const closeMenu = () => setMenuState("none")
    const toggleState = (s: MenuState) => setMenuState(prev => prev === s ? "none" : s)

    return (
        <>
            {/*
              Blue Ambient Backdrop
              "all the way from top of the screen gradually ending till the bottom of the searchbar"
            */}
            {/*
              Blue Ambient Backdrop with Gradual Blur
              - Stronger blue tint (15% opacity at top)
              - Blur radius increased to 16px
              - Fades out smoothly
            */}
            <div
                className="fixed top-0 inset-x-0 h-[160px] z-[290] pointer-events-none transition-all duration-700"
                style={{
                    background: "linear-gradient(to bottom, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.02) 80%, transparent 100%)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    maskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
                    WebkitMaskImage: "linear-gradient(to bottom, black 50%, transparent 100%)"
                }}
            />

            {/*
              Positioning Wrapper
              Fixed to top, centered, smaller width
            */}
            <div className="fixed top-6 left-1/2 -translate-x-1/2 w-[95%] md:w-[85%] lg:w-[70%] max-w-[1100px] z-[300]">

                <motion.div
                    layout
                    initial={false}
                    animate={{
                        height: isExpanded ? expandedHeight : collapsedHeight,
                        borderRadius: "32px",
                        backgroundColor: "rgba(255, 255, 255, 0.85)"
                    }}
                    transition={SPRING_TRANSITION}
                    className="relative w-full border-[3px] border-white/80 shadow-[0_30px_60px_-10px_rgba(0,0,0,0.3),0_10px_20px_-5px_rgba(0,0,0,0.1)] backdrop-blur-3xl overflow-hidden"
                >
                    {/* --- TOP BAR ROW --- */}
                    <motion.div
                        layout
                        className="absolute top-0 left-0 right-0 h-[64px] grid grid-cols-[1fr_auto_1fr] items-center px-4 md:px-6 z-20"
                    >

                        {/* LEFT: Branding + Buttons */}
                        <div className="flex items-center gap-2 justify-start">
                            <motion.button
                                layout
                                onClick={() => router.push("/")}
                                className="text-lg font-black uppercase tracking-[0.2em] mr-4"
                            >
                                Cove
                            </motion.button>

                            {/* Catalog Button */}
                            <TextButton
                                active={menuState === "catalog"}
                                onClick={() => toggleState("catalog")}
                                label="Catalog"
                                icon={<Layers size={14} />}
                            />

                            {/* Brands Button */}
                            <TextButton
                                active={menuState === "brands"}
                                onClick={() => toggleState("brands")}
                                label="Brands"
                                icon={<Box size={14} />}
                            />
                        </div>

                        {/* CENTER: Search (Strictly Centered) */}
                        <div className="w-[280px] md:w-[360px]">
                            <EnhancedSearchbar
                                variant="pill"
                                expanded={menuState === "search"}
                                onExpand={() => setMenuState("search")}
                                onCollapse={closeMenu}
                            />
                        </div>

                        {/* RIGHT: Actions (No Brands Icon) */}
                        <div className="flex items-center gap-2 justify-end">

                            {/* Lang (Static) */}
                            <IconButton label="Language">
                                <Globe2 size={18} strokeWidth={2} />
                            </IconButton>

                            <div className="w-[1px] h-6 bg-black/5 mx-1 hidden md:block" />

                            {/* Cart */}
                            <IconButton
                                onClick={() => setCartOpen(true)}
                                badge={itemCount > 0 ? itemCount : undefined}
                                label="Cart"
                            >
                                <ShoppingBag size={18} strokeWidth={2} />
                            </IconButton>

                            {/* Auth State */}
                            {!isSignedIn ? (
                                <div className="flex items-center gap-2 ml-2">
                                    <button
                                        onClick={() => router.push("/sign-in")}
                                        className="hidden lg:block text-xs font-bold px-3 py-2 hover:bg-black/5 rounded-full transition-colors whitespace-nowrap"
                                    >
                                        Log In
                                    </button>
                                    <button
                                        onClick={() => router.push("/sign-up")}
                                        className="hidden sm:block text-xs font-bold bg-black text-white px-4 py-2 rounded-full hover:bg-black/80 transition-transform active:scale-95 whitespace-nowrap"
                                    >
                                        Join Us
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => router.push("/dashboard")}
                                    className="ml-2 w-8 h-8 rounded-full bg-gray-200 overflow-hidden hover:ring-2 ring-black/5 transition-all"
                                >
                                    <img src={user?.imageUrl} alt="User" className="w-full h-full object-cover" />
                                </button>
                            )}
                        </div>
                    </motion.div>

                    {/* --- DRAWER CONTENT AREA (Revealed on Expand) --- */}
                    <AnimatePresence mode="wait">
                        {isExpanded && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="absolute top-[64px] left-0 right-0 bottom-0 p-6 z-10 overflow-y-auto no-scrollbar"
                            >
                                {/* Search Drawer */}
                                {menuState === "search" && (
                                    <div className="flex flex-col h-full items-center justify-center text-center">
                                        <p className="text-xs font-bold text-black/30 uppercase tracking-widest mb-6">Popular Right Now</p>
                                        <div className="flex flex-wrap justify-center gap-3 max-w-2xl">
                                            {["Oversized Hoodie", "Cargo Pants", "Summer Linen", "Accessories", "Graphic Tees"].map(tag => (
                                                <button key={tag} className="px-5 py-3 rounded-2xl bg-gray-50 hover:bg-black hover:text-white transition-all text-sm font-medium">
                                                    {tag}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Brands Drawer - FETCHED DATA */}
                                {menuState === "brands" && (
                                    <div className="h-full flex flex-col">
                                        <div className="flex justify-between items-end mb-6 px-2">
                                            <h3 className="text-xl font-black uppercase tracking-tight">Select Brand</h3>
                                            <button className="text-xs font-bold underline opacity-50 hover:opacity-100">View All</button>
                                        </div>

                                        {loadingBrands ? (
                                            <div className="flex items-center justify-center h-40">
                                                <div className="w-6 h-6 border-2 border-black/10 border-t-black rounded-full animate-spin" />
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                                                {brands.map((brand) => (
                                                    <div
                                                        key={brand.brand_id}
                                                        onClick={() => {
                                                            closeMenu()
                                                            router.push(`/brands/${brand.slug}`)
                                                        }}
                                                        className="bg-gray-50 hover:bg-white rounded-2xl flex items-center justify-center font-bold text-black/80 text-lg sm:text-xl transition-all cursor-pointer group border border-transparent hover:border-black/5 hover:shadow-lg aspect-[3/2] relative overflow-hidden"
                                                    >
                                                        {/* Show logo if available, else text */}
                                                        {brand.logo_url ? (
                                                            <img src={brand.logo_url} alt={brand.brand_name} className="max-w-[70%] max-h-[60%] object-contain grayscale group-hover:grayscale-0 transition-all" />
                                                        ) : (
                                                            <span className="group-hover:scale-110 transition-transform text-center px-2">{brand.brand_name}</span>
                                                        )}
                                                    </div>
                                                ))}
                                                {/* Fallback if empty */}
                                                {brands.length === 0 && (
                                                    <div className="col-span-full text-center text-gray-400 py-10">
                                                        No brands found.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Catalog Drawer */}
                                {menuState === "catalog" && (
                                    <div className="h-full grid grid-cols-3 gap-6">
                                        {[
                                            { title: "Men", items: ["New Arrivals", "Best Sellers", "Clothing", "Shoes"] },
                                            { title: "Women", items: ["New Arrivals", "Trending", "Clothing", "Accessories"] },
                                            { title: "Collections", items: ["Summer '26", "Streetwear", "Minimalist", "Workwear"] }
                                        ].map((col, i) => (
                                            <div key={i} className="bg-gray-50 p-6 rounded-3xl">
                                                <h4 className="font-black uppercase tracking-tight mb-4">{col.title}</h4>
                                                <ul className="space-y-3">
                                                    {col.items.map(item => (
                                                        <li key={item}>
                                                            <button className="text-sm font-medium text-black/60 hover:text-black transition-colors">{item}</button>
                                                        </li>
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
            </div>

            <CartModal open={cartOpen} onClose={() => setCartOpen(false)} />
        </>
    )
}

// --- Subcomponents ---

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

// New Text Button Component for Left Side
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
