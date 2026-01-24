"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Search, Sparkles, ShoppingBag } from "lucide-react";

interface ProductCandidate {
    title: string;
    price: number;
    imageUrl?: string;
    slug?: string;
    type?: string;
    vettingStatus?: "analyzing" | "rejected" | "accepted";
    rejectionReason?: string;
}

interface CategoryState {
    status: "waiting" | "searching" | "found" | "selected";
    candidates: ProductCandidate[];
    selectedItem?: ProductCandidate;
    totalFound?: number;
}

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
}

/**
 * AgenticOutfitBuilder - Shows live AI product exploration
 * 
 * Displays:
 * - Category tabs (Tops, Bottoms, Shoes, Accessories)
 * - Product cards appearing with fade-in animation
 * - "Searching..." → "Found X options" → "Selected ✓" flow
 */
import { useOutfitStore } from "@/hooks/useOutfitStore";

// ... interfaces ...

export default function AgenticOutfitBuilder({
    streamEvents,
    isActive
}: AgenticOutfitBuilderProps) {
    // Use global store
    const { categories, setCategoryState, updateCandidate, activeCategory, setActiveCategory, budgetMax } = useOutfitStore();

    // Track how many events we've processed
    const processedCountRef = useRef(0);

    // Process streaming events -> Sync to Store
    useEffect(() => {
        if (!streamEvents.length) return;

        // Process only NEW events (ones we haven't seen yet)
        const newEvents = streamEvents.slice(processedCountRef.current);

        newEvents.forEach((event) => {
            // Handle budget_set event (no category)
            if (event.event_type === "budget_set" && event.budget_max) {
                console.log('💰 Setting budget max:', event.budget_max);
                useOutfitStore.getState().setBudget(event.budget_max, 0);
                return;
            }

            // Normalize category name: capitalize first letter for consistency
            const rawCategory = event.category;
            const category = rawCategory
                ? rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1).toLowerCase()
                : null;

            if (!category) return;

            switch (event.event_type) {
                case "category_start":
                    setCategoryState(category, {
                        status: "searching",
                        candidates: [], // Clear old candidates on restart
                    });
                    setActiveCategory(category);
                    break;

                case "category_candidates":
                    console.log('📦 Storing candidates for', category, ':', event.candidates?.length || 0, 'items');
                    setCategoryState(category, {
                        status: "found",
                        candidates: event.candidates || [],
                        totalFound: event.total_found,
                    });
                    break;

                case "item_selected":
                    setCategoryState(category, {
                        status: "selected",
                        selectedItem: event.selected_item,
                    });
                    break;

                case "category_vetting":
                    if (event.slug) {
                        updateCandidate(category, event.slug, {
                            vettingStatus: event.status as any,
                            rejectionReason: event.reason
                        });
                    }
                    break;

                case "category_error":
                case "error":
                    // If specific slug failed
                    if (event.slug) {
                        updateCandidate(category, event.slug, {
                            vettingStatus: "rejected",
                            rejectionReason: event.message || "Analysis failed"
                        });
                    } else {
                        // Whole category failed
                        setCategoryState(category, {
                            status: "found",
                            candidates: [], // Or keep existing?
                            totalFound: 0
                        });
                    }
                    break;
            }
        });

        // Update processed count
        processedCountRef.current = streamEvents.length;
    }, [streamEvents, setCategoryState, updateCandidate, setActiveCategory]);

    if (!isActive) return null;

    const categoryOrder = ["Tops", "Bottoms", "Shoes", "Accessories"];
    const displayCategories = Object.keys(categories).length > 0
        ? Object.keys(categories)
        : categoryOrder;

    // DEBUG: Log store state to see what we have
    const categoryCandidateCounts = Object.entries(categories).map(([k, v]) => `${k}: ${v.candidates?.length || 0}`).join(', ');
    console.log('🔍 RENDER DEBUG:', {
        activeCategory,
        categoryCandidateCounts,
        activeCandidates: activeCategory ? categories[activeCategory]?.candidates?.slice(0, 2) : null
    });

    return (
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-2xl p-4 border border-white/10">
            {/* Header with Budget */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">Building Your Outfit</h3>
                </div>

                {/* Budget Display */}
                <div className="flex flex-col items-end">
                    <div className="text-sm font-medium text-neutral-300">
                        <span className="text-white">€{Object.values(categories).reduce((sum, c) => sum + (c.selectedItem?.price || 0), 0).toFixed(2)}</span>
                        <span className="text-neutral-500"> / €{budgetMax.toFixed(2)}</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-24 h-1 bg-neutral-800 rounded-full mt-1 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                            style={{
                                width: `${Math.min(100, (Object.values(categories).reduce((sum, c) => sum + (c.selectedItem?.price || 0), 0) / budgetMax) * 100)}%`
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Vertical Category List */}
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {displayCategories.map((cat) => {
                    const state = categories[cat];
                    const candidates = state?.candidates || [];
                    const selectedItem = state?.selectedItem;
                    const status = state?.status;

                    return (
                        <div key={cat} className="bg-white/5 rounded-xl p-3">
                            {/* Category Header */}
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    {status === "searching" && (
                                        <Search className="h-4 w-4 text-purple-400 animate-pulse" />
                                    )}
                                    {status === "found" && (
                                        <Check className="h-4 w-4 text-emerald-400" />
                                    )}
                                    {status === "selected" && (
                                        <Check className="h-4 w-4 text-green-400" />
                                    )}
                                    {!status && (
                                        <ShoppingBag className="h-4 w-4 text-neutral-500" />
                                    )}
                                    <span className="text-sm font-medium text-white">{cat}</span>
                                </div>
                                <span className="text-xs text-neutral-500">
                                    {status === "searching" && "Searching..."}
                                    {status === "found" && `${state?.totalFound || candidates.length} options`}
                                    {status === "selected" && "✓ Selected"}
                                    {!status && "Waiting..."}
                                </span>
                            </div>

                            {/* Products Row - Horizontal scrollable */}
                            {candidates.length > 0 ? (
                                <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                                    <AnimatePresence>
                                        {candidates.map((product, idx) => {
                                            const isSelected = selectedItem?.slug === product.slug;

                                            return (
                                                <motion.div
                                                    key={product.slug || idx}
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    draggable
                                                    onDragStart={(e) => {
                                                        // Store product data for drag
                                                        const dragData = JSON.stringify({ ...product, category: cat });
                                                        (e as any).dataTransfer?.setData('application/json', dragData);
                                                    }}
                                                    className={`
                                                        relative flex-shrink-0 w-24 rounded-lg overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing
                                                        ${isSelected
                                                            ? 'border-green-500 ring-2 ring-green-500/30'
                                                            : 'border-transparent hover:border-purple-500/50'
                                                        }
                                                    `}
                                                >
                                                    {/* Image */}
                                                    <div className="aspect-square bg-neutral-800">
                                                        {product.imageUrl ? (
                                                            <img
                                                                src={product.imageUrl}
                                                                alt={product.title}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <ShoppingBag className="h-6 w-6 text-neutral-600" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Info */}
                                                    <div className="p-1.5 bg-neutral-900">
                                                        <p className="text-[10px] text-neutral-300 truncate">
                                                            {product.title}
                                                        </p>
                                                        <p className="text-xs font-semibold text-white">
                                                            €{product.price?.toFixed(2) || "0.00"}
                                                        </p>
                                                    </div>

                                                    {/* Selected Badge */}
                                                    {isSelected && (
                                                        <div className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5">
                                                            <Check className="h-2.5 w-2.5 text-white" />
                                                        </div>
                                                    )}

                                                    {/* Drag Hint */}
                                                    <div className="absolute inset-0 bg-purple-500/0 hover:bg-purple-500/10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                        <span className="text-[9px] text-white/70 bg-black/50 px-1 rounded">
                                                            Drag to add
                                                        </span>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            ) : (
                                <div className="h-12 flex items-center justify-center text-neutral-500 text-xs">
                                    {status === "searching" ? (
                                        <span className="flex items-center gap-2">
                                            <div className="h-3 w-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                            Looking for products...
                                        </span>
                                    ) : status === "found" ? (
                                        "No matching products found"
                                    ) : (
                                        "Waiting to search..."
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Empty State */}
            {Object.keys(categories).length === 0 && (
                <div className="min-h-[150px] flex items-center justify-center text-neutral-500">
                    <div className="text-center">
                        <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Waiting to start search...</p>
                    </div>
                </div>
            )}
        </div>
    );
}
