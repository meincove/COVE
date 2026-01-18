"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Palette, Shirt, Heart, Edit3, TrendingUp } from "lucide-react";
import { useUser } from "@clerk/nextjs";

interface StyleProfileProps {
    onEditPreferences?: () => void;
}

// Mock style data (would come from AI analysis)
const styleData = {
    styleType: "Modern Minimalist",
    description: "You gravitate towards clean lines, neutral palettes, and timeless pieces. Quality over quantity is your mantra.",
    topColors: ["Black", "White", "Navy", "Beige"],
    preferredBrands: ["COS", "Everlane", "Arket", "Theory"],
    topCategories: [
        { name: "Outerwear", percentage: 35 },
        { name: "Tops", percentage: 28 },
        { name: "Bottoms", percentage: 22 },
        { name: "Footwear", percentage: 15 },
    ],
    sizes: {
        tops: "M",
        bottoms: "32",
        shoes: "10",
    },
    styleInsights: [
        "You prefer structured silhouettes",
        "Earth tones appear frequently in your choices",
        "You value sustainable brands",
    ]
};

export default function StyleProfile({ onEditPreferences }: StyleProfileProps) {
    const { user } = useUser();
    const displayName = user?.firstName || "there";

    return (
        <div className="space-y-6">
            {/* Hero Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 text-white relative overflow-hidden"
            >
                {/* Decorative */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10">
                    <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
                        <Sparkles className="h-4 w-4" />
                        AI-Generated Style Profile
                    </div>
                    <h2 className="text-3xl font-bold mb-2">{displayName}'s Style</h2>
                    <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-lg font-medium">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                        {styleData.styleType}
                    </div>
                    <p className="mt-4 text-white/70 max-w-xl leading-relaxed">
                        {styleData.description}
                    </p>
                </div>
            </motion.div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Color Palette */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl border border-gray-100 p-6"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <Palette className="h-5 w-5 text-gray-400" />
                        <h3 className="font-semibold text-gray-900">Color Palette</h3>
                    </div>
                    <div className="flex gap-3">
                        {styleData.topColors.map((color) => (
                            <div key={color} className="flex flex-col items-center gap-2">
                                <div
                                    className="w-12 h-12 rounded-xl border border-gray-200 shadow-sm"
                                    style={{
                                        backgroundColor: color.toLowerCase() === "beige" ? "#F5F5DC" :
                                            color.toLowerCase() === "navy" ? "#000080" :
                                                color.toLowerCase()
                                    }}
                                />
                                <span className="text-xs text-gray-500">{color}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Favorite Brands */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl border border-gray-100 p-6"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <Heart className="h-5 w-5 text-gray-400" />
                        <h3 className="font-semibold text-gray-900">Favorite Brands</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {styleData.preferredBrands.map((brand) => (
                            <span
                                key={brand}
                                className="px-3 py-1.5 bg-gray-100 rounded-full text-sm font-medium text-gray-700"
                            >
                                {brand}
                            </span>
                        ))}
                    </div>
                </motion.div>

                {/* Sizes */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-2xl border border-gray-100 p-6"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Shirt className="h-5 w-5 text-gray-400" />
                            <h3 className="font-semibold text-gray-900">Your Sizes</h3>
                        </div>
                        <button
                            onClick={onEditPreferences}
                            className="p-2 hover:bg-gray-100 rounded-full transition"
                        >
                            <Edit3 className="h-4 w-4 text-gray-400" />
                        </button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        {Object.entries(styleData.sizes).map(([category, size]) => (
                            <div key={category} className="text-center">
                                <div className="w-12 h-12 mx-auto bg-gray-100 rounded-xl flex items-center justify-center font-bold text-gray-900">
                                    {size}
                                </div>
                                <p className="text-xs text-gray-500 mt-2 capitalize">{category}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Category Breakdown */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white rounded-2xl border border-gray-100 p-6 md:col-span-2 lg:col-span-3"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="h-5 w-5 text-gray-400" />
                        <h3 className="font-semibold text-gray-900">Wardrobe Composition</h3>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                        {styleData.topCategories.map((cat) => (
                            <div key={cat.name}>
                                <div className="flex items-end gap-2 mb-2">
                                    <span className="text-2xl font-bold text-gray-900">{cat.percentage}%</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${cat.percentage}%` }}
                                        transition={{ duration: 1, delay: 0.5 }}
                                        className="h-full bg-black rounded-full"
                                    />
                                </div>
                                <p className="text-sm text-gray-500 mt-2">{cat.name}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Style Insights */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-amber-50 border border-amber-100 rounded-2xl p-6"
            >
                <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-5 w-5 text-amber-600" />
                    <h3 className="font-semibold text-amber-900">Bubbles' Style Insights</h3>
                </div>
                <ul className="space-y-2">
                    {styleData.styleInsights.map((insight, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-amber-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                            {insight}
                        </li>
                    ))}
                </ul>
            </motion.div>
        </div>
    );
}
