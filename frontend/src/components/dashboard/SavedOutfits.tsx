"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Plus, Share2, ShoppingBag, Heart, MoreHorizontal } from "lucide-react";

interface OutfitItem {
    id: string;
    imageUrl: string;
    category: string;
}

interface SavedOutfit {
    id: string;
    name: string;
    createdAt: string;
    items: OutfitItem[];
    occasion?: string;
    liked?: boolean;
}

interface SavedOutfitsProps {
    outfits?: SavedOutfit[];
    onCreateOutfit?: () => void;
}

// Mock data
const mockOutfits: SavedOutfit[] = [
    {
        id: "1",
        name: "Weekend Casual",
        createdAt: "2 days ago",
        occasion: "Casual",
        liked: true,
        items: [
            { id: "a", imageUrl: "", category: "Top" },
            { id: "b", imageUrl: "", category: "Bottom" },
            { id: "c", imageUrl: "", category: "Shoes" },
        ]
    },
    {
        id: "2",
        name: "Office Ready",
        createdAt: "1 week ago",
        occasion: "Work",
        liked: false,
        items: [
            { id: "a", imageUrl: "", category: "Top" },
            { id: "b", imageUrl: "", category: "Bottom" },
            { id: "c", imageUrl: "", category: "Shoes" },
            { id: "d", imageUrl: "", category: "Accessory" },
        ]
    },
    {
        id: "3",
        name: "Date Night",
        createdAt: "2 weeks ago",
        occasion: "Evening",
        liked: true,
        items: [
            { id: "a", imageUrl: "", category: "Top" },
            { id: "b", imageUrl: "", category: "Bottom" },
        ]
    },
];

export default function SavedOutfits({ outfits = mockOutfits, onCreateOutfit }: SavedOutfitsProps) {
    const [filter, setFilter] = React.useState<"all" | "liked">("all");

    const filteredOutfits = filter === "liked"
        ? outfits.filter(o => o.liked)
        : outfits;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setFilter("all")}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition ${filter === "all" ? "bg-black text-white" : "bg-gray-100 text-gray-600"
                            }`}
                    >
                        All Outfits ({outfits.length})
                    </button>
                    <button
                        onClick={() => setFilter("liked")}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-2 ${filter === "liked" ? "bg-black text-white" : "bg-gray-100 text-gray-600"
                            }`}
                    >
                        <Heart className="h-4 w-4" />
                        Favorites
                    </button>
                </div>

                <button
                    onClick={onCreateOutfit}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition"
                >
                    <Sparkles className="h-4 w-4" />
                    Ask Bubbles for an Outfit
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredOutfits.map((outfit, idx) => (
                    <motion.div
                        key={outfit.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all"
                    >
                        {/* Outfit Preview - Stack of items */}
                        <div className="aspect-[4/3] bg-gray-50 p-4 relative">
                            <div className="grid grid-cols-2 gap-2 h-full">
                                {outfit.items.slice(0, 4).map((item, i) => (
                                    <div
                                        key={item.id}
                                        className="bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-xs"
                                    >
                                        {item.category}
                                    </div>
                                ))}
                            </div>

                            {/* Occasion Badge */}
                            {outfit.occasion && (
                                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-gray-700">
                                    {outfit.occasion}
                                </div>
                            )}

                            {/* Like Button */}
                            <button className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition">
                                <Heart className={`h-4 w-4 ${outfit.liked ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
                            </button>
                        </div>

                        {/* Info */}
                        <div className="p-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-900">{outfit.name}</h3>
                                    <p className="text-sm text-gray-500 mt-0.5">
                                        {outfit.items.length} items • Created {outfit.createdAt}
                                    </p>
                                </div>
                                <button className="p-2 hover:bg-gray-100 rounded-full transition">
                                    <MoreHorizontal className="h-4 w-4 text-gray-400" />
                                </button>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 mt-4">
                                <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition">
                                    <ShoppingBag className="h-4 w-4" />
                                    Shop Look
                                </button>
                                <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition">
                                    <Share2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Empty State */}
            {filteredOutfits.length === 0 && (
                <div className="text-center py-16">
                    <Sparkles className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No outfits yet</h3>
                    <p className="text-gray-500 mt-1">Ask Bubbles to create your first outfit!</p>
                    <button
                        onClick={onCreateOutfit}
                        className="mt-4 px-6 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition"
                    >
                        Create Outfit
                    </button>
                </div>
            )}
        </div>
    );
}
