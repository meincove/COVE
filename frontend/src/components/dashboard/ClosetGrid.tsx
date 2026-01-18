"use client";

import React from "react";
import { motion } from "framer-motion";
import { Plus, Grid3X3, List, Filter, Shirt, Search } from "lucide-react";

interface ClosetItem {
    id: string;
    name: string;
    category: string;
    imageUrl: string;
    brand?: string;
    color?: string;
    wornCount?: number;
}

interface ClosetGridProps {
    items?: ClosetItem[];
    onAddItem?: () => void;
}

// Mock data for demo
const mockItems: ClosetItem[] = [
    { id: "1", name: "Classic White Tee", category: "Tops", imageUrl: "/placeholder-tee.jpg", brand: "COVE Basics", color: "White", wornCount: 12 },
    { id: "2", name: "Slim Fit Jeans", category: "Bottoms", imageUrl: "/placeholder-jeans.jpg", brand: "Levi's", color: "Blue", wornCount: 8 },
    { id: "3", name: "Leather Jacket", category: "Outerwear", imageUrl: "/placeholder-jacket.jpg", brand: "AllSaints", color: "Black", wornCount: 5 },
    { id: "4", name: "White Sneakers", category: "Shoes", imageUrl: "/placeholder-shoes.jpg", brand: "Nike", color: "White", wornCount: 15 },
];

const categories = ["All", "Tops", "Bottoms", "Outerwear", "Shoes", "Accessories"];

export default function ClosetGrid({ items = mockItems, onAddItem }: ClosetGridProps) {
    const [activeCategory, setActiveCategory] = React.useState("All");
    const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
    const [searchQuery, setSearchQuery] = React.useState("");

    const filteredItems = items.filter(item => {
        const matchesCategory = activeCategory === "All" || item.category === activeCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.brand?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="space-y-6">
            {/* Stats Bar */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: "Total Items", value: items.length, icon: Shirt },
                    { label: "Most Worn", value: "White Tee", icon: Shirt },
                    { label: "Favorite Brand", value: "Nike", icon: Shirt },
                    { label: "Categories", value: categories.length - 1, icon: Shirt },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white rounded-2xl p-4 border border-gray-100">
                        <p className="text-sm text-gray-500">{stat.label}</p>
                        <p className="text-xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4">
                {/* Search */}
                <div className="flex-1 max-w-md relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search your closet..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 transition"
                    />
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-2">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition ${activeCategory === cat
                                    ? "bg-black text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                    <button
                        onClick={() => setViewMode("grid")}
                        className={`p-2 rounded-lg transition ${viewMode === "grid" ? "bg-white shadow-sm" : ""}`}
                    >
                        <Grid3X3 className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setViewMode("list")}
                        className={`p-2 rounded-lg transition ${viewMode === "list" ? "bg-white shadow-sm" : ""}`}
                    >
                        <List className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className={`grid gap-4 ${viewMode === "grid" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1"}`}>
                {/* Add Item Card */}
                <motion.button
                    onClick={onAddItem}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition flex flex-col items-center justify-center gap-3"
                >
                    <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center">
                        <Plus className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-medium text-gray-600">Add Item</span>
                </motion.button>

                {/* Item Cards */}
                {filteredItems.map((item, idx) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    >
                        {/* Image */}
                        <div className="aspect-square bg-gray-100 relative">
                            <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                <Shirt className="h-16 w-16" />
                            </div>
                            {/* Worn badge */}
                            {item.wornCount && (
                                <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                                    Worn {item.wornCount}x
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="p-4">
                            <p className="font-medium text-gray-900 truncate">{item.name}</p>
                            <div className="flex items-center justify-between mt-1">
                                <p className="text-sm text-gray-500">{item.brand}</p>
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                                    {item.category}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Empty State */}
            {filteredItems.length === 0 && (
                <div className="text-center py-16">
                    <Shirt className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No items found</h3>
                    <p className="text-gray-500 mt-1">Try adjusting your filters or add new items to your closet.</p>
                </div>
            )}
        </div>
    );
}
