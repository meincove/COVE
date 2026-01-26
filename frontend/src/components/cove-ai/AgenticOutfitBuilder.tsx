"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Search, Sparkles, ShoppingBag } from "lucide-react";
import { useOutfitStore, ProductCandidate } from "@/src/hooks/useOutfitStore";
import BrandSelectionStep from "./BrandSelectionStep";
import GenderSelectionStep from "./GenderSelectionStep";

// ... interfaces ...

interface AgenticOutfitBuilderProps {
    streamEvents: Array<{
        event_type: string;
        category?: string;
        candidates?: ProductCandidate[];
        selected_item?: ProductCandidate;
        total_found?: number;
        status?: string;
        // Vetting fields
        slug?: string;
        message?: string;
        reason?: string;
        // Budget fields
        budget_max?: number;
        source?: string;
    }>;
    isActive: boolean;
    onGenderSelect?: (gender: 'mens' | 'womens') => void;
    onBrandSelect?: (brand: string | null) => void;
}

export default function AgenticOutfitBuilder({
    streamEvents,
    isActive,
    onGenderSelect,
    onBrandSelect
}: AgenticOutfitBuilderProps) {
    // Use global store
    const { categories, setCategoryState, updateCandidate, activeCategory, setActiveCategory, budgetMax } = useOutfitStore();

    // Current outfit view (1, 2, or 3)
    const [activeOutfit, setActiveOutfit] = useState(1);

    // Flow State
    const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
    const [step, setStep] = useState<'building'>('building');

    // Track how many events we've processed
    const processedCountRef = useRef(0);

    // ... (rest of useEffect remains same) ...

    // Check if building has started (any category activity) - Force skip steps if events exist
    const hasExternalEvents = streamEvents.length > 0;

    // Determine current effective step
    // If events are flowing, we are definitely building.
    const currentStep = 'building';
    const isBuilding = true;

    // (Handlers removed as they are no longer reachable from UI)

    // (Brand Selection Block Removed)

    // ... (rest of outfits rendering) ...

    // ✨ DERIVED STATE: Group items into outfits
    const outfits: Record<string, ProductCandidate[]> = {
        outfit_1: [],
        outfit_2: [],
        outfit_3: []
    };

    // Flatten and group
    // Flatten and group
    Object.values(categories).forEach(catState => {
        // Strategy: Only add items that are officially "selected" or "accepted".
        // Raw candidates from search (status=analyzing/undefined) should NOT be in the billable outfit.

        // 1. Check for specific selected item (Single Source of Truth)
        if (catState.selectedItem) {
            const oid = catState.selectedItem.outfit_id || "outfit_1";
            if (outfits[oid]) {
                outfits[oid].push(catState.selectedItem);
            }
        }
        // 2. Fallback: Check for vetted/accepted candidates (if no single selection yet)
        else {
            catState.candidates.forEach(c => {
                // ✨ SHOW ALL: In AI Stylist mode, all candidates are part of the proposed outfit
                // We do not wait for explicit 'accepted' status
                const oid = c.outfit_id || "outfit_1";
                if (outfits[oid]) {
                    outfits[oid].push(c);
                }
            });
        }
    });

    const hasOutfits = Object.values(outfits).some(list => list.length > 0);

    const outfitTotals = [1, 2, 3].map(num => {
        const items = outfits[`outfit_${num}`] || [];
        return items.reduce((sum, item) => sum + (item.price || 0), 0);
    });

    const currentOutfitItems = outfits[`outfit_${activeOutfit}`] || [];


    return (
        <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-sm h-full flex flex-col font-sans">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-violet-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-neutral-900 leading-tight">
                            {isBuilding ? "Curating Looks..." : "Your Outfits"}
                        </h3>
                        {isBuilding && (
                            <p className="text-[10px] text-neutral-500"> finding matches...</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Content: Always show tabs/items if we have any outfits, otherwise show loader */}
            {hasOutfits || isBuilding ? (
                <>
                    {/* Outfit Tabs */}
                    <div className="flex bg-neutral-100 rounded-lg p-1 mb-4">
                        {[1, 2, 3].map((num) => {
                            const hasItems = outfits[`outfit_${num}`]?.length > 0;
                            const total = outfitTotals[num - 1] || 0;
                            const isActiveTab = activeOutfit === num;

                            return (
                                <button
                                    key={num}
                                    onClick={() => setActiveOutfit(num)}
                                    className={`
                                        flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all duration-200
                                        ${isActiveTab
                                            ? 'bg-white text-neutral-900 shadow-sm ring-1 ring-black/5'
                                            : hasItems
                                                ? 'text-neutral-500 hover:text-neutral-700 hover:bg-white/50'
                                                : 'text-neutral-400 cursor-default'
                                        }
                                    `}
                                    disabled={!hasItems && !isActiveTab}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        Look {num}
                                    </div>
                                    {hasItems && (
                                        <div className={`text-[10px] ${isActiveTab ? 'text-violet-600 font-bold' : 'opacity-75'}`}>
                                            €{total.toFixed(0)}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Current Outfit Items - Vertical Stack */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeOutfit}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="space-y-2"
                            >
                                {currentOutfitItems.length === 0 && isBuilding && (
                                    <div className="p-4 text-center text-xs text-neutral-400">
                                        Items will appear here...
                                    </div>
                                )}

                                {currentOutfitItems.map((item, idx) => (
                                    <motion.div
                                        key={item.slug || idx}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="group flex gap-3 bg-white border border-neutral-100 hover:border-violet-200 hover:shadow-md rounded-xl p-2 transition-all cursor-pointer"
                                        onClick={() => {
                                            if (item.slug) {
                                                window.location.href = `/product/${item.slug}`;
                                            }
                                        }}
                                    >
                                        {/* Image */}
                                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-neutral-50 border border-neutral-100 flex-shrink-0 relative">
                                            {item.imageUrl ? (
                                                <img
                                                    src={item.imageUrl}
                                                    alt={item.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <ShoppingBag className="h-5 w-5 text-neutral-300" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                                                        {item.type || 'Item'}
                                                    </p>
                                                    <p className="text-xs text-neutral-900 font-medium truncate pr-2">
                                                        {item.title}
                                                    </p>
                                                </div>
                                                <div className="h-5 w-5 rounded-full bg-neutral-50 flex items-center justify-center group-hover:bg-violet-50 group-hover:text-violet-600 transition-colors">
                                                    <Check className="h-3 w-3 text-neutral-300 group-hover:text-violet-600" />
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 mt-0.5">
                                                <p className="text-xs text-violet-600 font-bold">
                                                    €{item.price?.toFixed(2) || "0.00"}
                                                </p>
                                            </div>

                                            {item.stylist_note && (
                                                <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-100 rounded-md max-w-full">
                                                    <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0 animate-pulse"></span>
                                                    <p className="text-[10px] text-amber-700 font-medium leading-tight truncate">
                                                        {item.stylist_note.replace("⚠️ Stylist Note:", "").trim()}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Total & Add All Button */}
                    <div className="mt-3 pt-3 border-t border-neutral-100">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <span className="text-xs font-medium text-neutral-500">Look {activeOutfit} Total</span>
                            <span className="text-sm font-bold text-neutral-900">
                                €{currentOutfitItems.reduce((sum, item) => sum + (item.price || 0), 0).toFixed(2)}
                            </span>
                        </div>
                        <button className="w-full py-2.5 bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md">
                            <ShoppingBag className="h-3.5 w-3.5" />
                            Add Look to Cart
                        </button>
                    </div>
                </>
            ) : (
                /* Empty State */
                <div className="flex-1 flex items-center justify-center text-neutral-400">
                    <div className="text-center">
                        <div className="h-10 w-10 mx-auto mb-2 rounded-full bg-neutral-50 flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-neutral-300" />
                        </div>
                        <p className="text-xs font-medium text-neutral-500">Ready to style you</p>
                        <p className="text-[10px] text-neutral-400 mt-1">
                            "Create a date night look"
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
