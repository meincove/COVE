"use client";

import React from "react";
import { motion } from "framer-motion";
import { Heart, ShoppingBag, Trash2, Bell, BellOff, TrendingDown } from "lucide-react";

interface WishlistItem {
    id: string;
    name: string;
    brand: string;
    price: number;
    originalPrice?: number;
    imageUrl?: string;
    inStock: boolean;
    priceDropped?: boolean;
}

interface WishlistSectionProps {
    items?: WishlistItem[];
    onRemove?: (id: string) => void;
    onAddToCart?: (id: string) => void;
}

// Mock data
const mockItems: WishlistItem[] = [
    { id: "1", name: "Oversized Wool Coat", brand: "COS", price: 299, originalPrice: 350, inStock: true, priceDropped: true },
    { id: "2", name: "Leather Chelsea Boots", brand: "Dr. Martens", price: 180, inStock: true },
    { id: "3", name: "Cashmere Sweater", brand: "Everlane", price: 150, inStock: false },
    { id: "4", name: "Tailored Trousers", brand: "Theory", price: 265, inStock: true },
];

export default function WishlistSection({
    items = mockItems,
    onRemove,
    onAddToCart
}: WishlistSectionProps) {
    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="flex items-center gap-6 p-4 bg-white rounded-2xl border border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                        <Heart className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{items.length}</p>
                        <p className="text-sm text-gray-500">Saved Items</p>
                    </div>
                </div>
                <div className="h-10 w-px bg-gray-200" />
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                        <TrendingDown className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{items.filter(i => i.priceDropped).length}</p>
                        <p className="text-sm text-gray-500">Price Drops</p>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map((item, idx) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition"
                    >
                        {/* Image */}
                        <div className="aspect-square bg-gray-100 relative">
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Heart className="h-12 w-12 text-gray-200" />
                            </div>

                            {/* Badges */}
                            <div className="absolute top-3 left-3 flex flex-col gap-2">
                                {item.priceDropped && (
                                    <span className="bg-green-500 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                                        <TrendingDown className="h-3 w-3" />
                                        Price Drop
                                    </span>
                                )}
                                {!item.inStock && (
                                    <span className="bg-gray-800 text-white text-xs font-medium px-2 py-1 rounded-full">
                                        Out of Stock
                                    </span>
                                )}
                            </div>

                            {/* Remove Button */}
                            <button
                                onClick={() => onRemove?.(item.id)}
                                className="absolute top-3 right-3 p-2 bg-white/90 rounded-full hover:bg-red-50 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Info */}
                        <div className="p-4">
                            <p className="text-sm text-gray-500">{item.brand}</p>
                            <p className="font-medium text-gray-900 truncate mt-0.5">{item.name}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="font-bold text-gray-900">${item.price}</span>
                                {item.originalPrice && (
                                    <span className="text-sm text-gray-400 line-through">${item.originalPrice}</span>
                                )}
                            </div>

                            {/* Add to Cart */}
                            <button
                                onClick={() => onAddToCart?.(item.id)}
                                disabled={!item.inStock}
                                className={`w-full mt-3 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition ${item.inStock
                                        ? "bg-black text-white hover:bg-gray-800"
                                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    }`}
                            >
                                <ShoppingBag className="h-4 w-4" />
                                {item.inStock ? "Add to Cart" : "Notify When Available"}
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Empty State */}
            {items.length === 0 && (
                <div className="text-center py-16">
                    <Heart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">Your wishlist is empty</h3>
                    <p className="text-gray-500 mt-1">Save items you love to keep track of them.</p>
                </div>
            )}
        </div>
    );
}
