"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Shirt,
    Heart,
    Package,
    Sparkles,
    User,
    ChevronRight,
    LogOut,
    Settings,
    Home,
    LayoutDashboard
} from "lucide-react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";

interface NavItem {
    id: string;
    label: string;
    icon: any;
    badge?: number;
}

interface DashboardLayoutProps {
    children: React.ReactNode;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
    user?: any; // Accepting user prop from parent
}

const navItems: NavItem[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "closet", label: "My Closet", icon: Shirt },
    { id: "outfits", label: "Saved Outfits", icon: Sparkles },
    { id: "orders", label: "Order History", icon: Package },
    { id: "wishlist", label: "Wishlist", icon: Heart },
    { id: "profile", label: "Style Profile", icon: User },
];

export default function DashboardLayout({
    children,
    activeTab = "overview",
    onTabChange,
    user: propUser
}: DashboardLayoutProps) {
    const { user: clerkUser, isLoaded } = useUser();
    const { signOut } = useClerk();
    const router = useRouter();
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);

    const displayName = clerkUser?.firstName || clerkUser?.username || "Fashion Lover";
    const userInitial = displayName.charAt(0).toUpperCase();

    return (
        <div className="min-h-screen bg-neutral-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-100 flex flex-col fixed h-screen">
                {/* Logo */}
                <div className="p-6 border-b border-gray-100">
                    <button
                        onClick={() => router.push('/')}
                        className="flex items-center gap-2 text-black font-bold tracking-[0.2em] text-lg hover:opacity-70 transition"
                    >
                        <Home className="h-5 w-5" />
                        COVE
                    </button>
                </div>

                {/* User Card */}
                <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50">
                        <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold">
                            {userInitial}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{displayName}</p>
                            <p className="text-xs text-gray-500">My Wardrobe</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = activeTab === item.id;
                        const isHovered = hoveredItem === item.id;

                        return (
                            <motion.button
                                key={item.id}
                                onClick={() => onTabChange?.(item.id)}
                                onMouseEnter={() => setHoveredItem(item.id)}
                                onMouseLeave={() => setHoveredItem(null)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${isActive
                                    ? "bg-black text-white"
                                    : "text-gray-600 hover:bg-gray-100"
                                    }`}
                                whileTap={{ scale: 0.98 }}
                            >
                                <item.icon className={`h-5 w-5 ${isActive ? "text-white" : "text-gray-400"}`} />
                                <span className="font-medium">{item.label}</span>
                                {item.badge && (
                                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"
                                        }`}>
                                        {item.badge}
                                    </span>
                                )}
                                <ChevronRight className={`h-4 w-4 ml-auto transition-transform ${isActive || isHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                                    }`} />
                            </motion.button>
                        );
                    })}
                </nav>

                {/* Bottom Actions */}
                <div className="p-4 border-t border-gray-100 space-y-2">
                    <button
                        onClick={() => router.push('/shopping')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 transition"
                    >
                        <Package className="h-5 w-5 text-gray-400" />
                        <span className="font-medium">Continue Shopping</span>
                    </button>
                    <button
                        onClick={() => signOut()}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 transition"
                    >
                        <LogOut className="h-5 w-5" />
                        <span className="font-medium">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64">
                {/* Top Bar */}
                <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-40">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">
                            {navItems.find(item => item.id === activeTab)?.label || "Dashboard"}
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="p-2 rounded-full hover:bg-gray-100 transition">
                            <Settings className="h-5 w-5 text-gray-500" />
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
