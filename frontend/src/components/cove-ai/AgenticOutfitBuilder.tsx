"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Search, Sparkles, ShoppingBag } from "lucide-react";
import { useOutfitStore, ProductCandidate } from "@/hooks/useOutfitStore";
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

/**
 * AgenticOutfitBuilder - Shows live AI product exploration
 * 
 * Displays:
 * - Category tabs (Tops, Bottoms, Shoes, Accessories)
 * - Product cards appearing with fade-in animation
 * - "Searching..." → "Found X options" → "Selected ✓" flow
 */
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


    // State for image generation simulation
    const [generatingId, setGeneratingId] = useState<string | null>(null);

    // Use store actions
    const { setAnchoredItem, anchoredItem } = useOutfitStore();

    // Helper to group items by slot for a specific outfit
    const getGroupedItems = (items: ProductCandidate[]) => {
        const groups = {
            Tops: items.filter(i => ['top', 'tops', 'outerwear'].includes(i.category || '')),
            Bottoms: items.filter(i => ['bottom', 'bottoms'].includes(i.category || '')),
            Shoes: items.filter(i => ['shoe', 'shoes'].includes(i.category || ''))
        };
        // Catch-all for others
        const others = items.filter(i => !['top', 'tops', 'outerwear', 'bottom', 'bottoms', 'shoe', 'shoes'].includes(i.category || ''));
        if (others.length > 0) (groups as any)['Accessories'] = others;
        return groups;
    };

    const handleImageGenerate = (slug: string) => {
        setGeneratingId(slug);
        // Mock generation delay
        setTimeout(() => {
            setGeneratingId(null);
            // In a real app, this would trigger a store update or open a modal
        }, 2000);
    };

    return (
        <div className="h-full flex flex-col font-sans overflow-hidden">
            {/* Header - Minimal & Floating */}
            <div className="flex items-center justify-between px-1 py-4 flex-shrink-0">
                <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/50 shadow-sm">
                    <div className="h-8 w-8 rounded-full bg-violet-50 flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-violet-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-neutral-900 leading-tight">
                            {isBuilding ? "Curating Collection..." : "Your Curated Collection"}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Content: Side-by-Side Layout on Canvas */}
            {hasOutfits || isBuilding ? (
                <div className="flex-1 overflow-y-auto px-1 pb-6 custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                        {/* Column 1: Standard Match */}
                        {[1, 2].map((outfitNum) => {
                            const isPremium = outfitNum === 2;
                            const items = outfits[`outfit_${outfitNum}`] || [];
                            const total = outfitTotals[outfitNum - 1] || 0;
                            const grouped = getGroupedItems(items);
                            const hasItems = items.length > 0;

                            return (
                                <div key={outfitNum} className="flex flex-col h-full rounded-3xl transition-all duration-500">
                                    {/* Column Header - Floating Badge */}
                                    <div className="mb-4 flex items-center justify-between px-2">
                                        <div className={`px-4 py-1.5 rounded-full flex items-center gap-2 border shadow-sm ${isPremium
                                            ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                                            : 'bg-white/90 border-neutral-200 text-neutral-900'
                                            } backdrop-blur-md`}>
                                            {isPremium && <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                                            <span className="text-xs font-bold">
                                                {isPremium ? "Premium Collection" : "Standard Match"}
                                            </span>
                                        </div>
                                        {hasItems && (
                                            <span className="text-sm font-bold text-neutral-900 bg-white/80 px-3 py-1 rounded-full shadow-sm border border-white/50 backdrop-blur-md">
                                                €{total.toFixed(0)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Items Area */}
                                    <div className="flex-1 space-y-6">
                                        {!hasItems && isBuilding ? (
                                            <div className="h-64 flex flex-col items-center justify-center text-neutral-400 space-y-3 opacity-50 bg-white/20 rounded-3xl border-2 border-dashed border-neutral-200/50">
                                                <div className="w-8 h-8 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                                <p className="text-xs font-medium">Finding items...</p>
                                            </div>
                                        ) : (
                                            Object.entries(grouped).map(([category, catItems]) => {
                                                if (catItems.length === 0) return null;
                                                return (
                                                    <div key={category} className="space-y-3">
                                                        <h4 className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 pl-2 opacity-80 backdrop-blur-sm self-start inline-block rounded-md">{category}</h4>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            {catItems.map((item, idx) => {
                                                                const isAnchored = anchoredItem?.slug === item.slug;
                                                                const isGenerating = generatingId === item.slug;

                                                                return (
                                                                    <motion.div
                                                                        key={item.slug || idx}
                                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                                        animate={{ opacity: 1, scale: 1 }}
                                                                        transition={{ delay: idx * 0.05 }}
                                                                        className={`group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full ring-1 ${isAnchored ? 'ring-violet-500 ring-2' : 'ring-black/5 hover:ring-violet-200'}`}
                                                                    >
                                                                        {/* Image - Compact Aspect Ratio */}
                                                                        <div className="aspect-[4/5] bg-neutral-100 relative overflow-hidden">
                                                                            {item.imageUrl ? (
                                                                                <img
                                                                                    src={item.imageUrl}
                                                                                    alt={item.title}
                                                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                                                />
                                                                            ) : (
                                                                                <div className="w-full h-full flex items-center justify-center">
                                                                                    <ShoppingBag className="h-6 w-6 text-neutral-300" />
                                                                                </div>
                                                                            )}

                                                                            {/* Floating Actions on Image - Added z-10 for clickability */}
                                                                            <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                                                                                {/* Anchor Button */}
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setAnchoredItem(isAnchored ? null : { category: item.category || '', slug: item.slug });
                                                                                    }}
                                                                                    className={`p-2 rounded-full shadow-md backdrop-blur-md transition-all hover:scale-110 active:scale-95 cursor-pointer ${isAnchored ? 'bg-violet-600 text-white' : 'bg-white/90 text-neutral-600 hover:text-violet-600'}`}
                                                                                    title={isAnchored ? "Unanchor" : "Anchor Item"}
                                                                                >
                                                                                    <div className={`w-3.5 h-3.5 border-2 border-current rounded-full ${isAnchored ? 'bg-white' : ''}`} />
                                                                                </button>
                                                                            </div>

                                                                            {/* Image Build / Generate Action */}
                                                                            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleImageGenerate(item.slug);
                                                                                    }}
                                                                                    className={`p-2 rounded-full shadow-md backdrop-blur-md transition-all hover:scale-110 active:scale-95 cursor-pointer ${isGenerating ? 'bg-violet-100 text-violet-600' : 'bg-white/90 text-neutral-700 hover:bg-violet-50 hover:text-violet-600'
                                                                                        }`}
                                                                                    title="Generate Image"
                                                                                    disabled={isGenerating}
                                                                                >
                                                                                    {isGenerating ? (
                                                                                        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                                                    ) : (
                                                                                        <Sparkles className="w-3.5 h-3.5" />
                                                                                    )}
                                                                                </button>
                                                                            </div>
                                                                        </div>

                                                                        {/* Info - Compact */}
                                                                        <div className="p-3 flex flex-col flex-1 gap-1">
                                                                            <div className="flex justify-between items-start gap-2">
                                                                                <h5 className="text-xs font-medium text-neutral-900 line-clamp-2 leading-snug flex-1" title={item.title}>
                                                                                    {item.title}
                                                                                </h5>
                                                                                <span className="text-xs font-bold text-neutral-900 whitespace-nowrap">
                                                                                    €{item.price?.toFixed(0)}
                                                                                </span>
                                                                            </div>

                                                                            {item.stylist_note && (
                                                                                <div className="mt-auto pt-2">
                                                                                    <p className="text-[9px] leading-tight text-amber-700 bg-amber-50 px-1.5 py-1 rounded border border-amber-100 line-clamp-2">
                                                                                        {item.stylist_note.replace("⚠️ Stylist Note:", "").trim()}
                                                                                    </p>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </motion.div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Action Footer - Floating */}
                                    <div className="mt-4">
                                        <button
                                            className={`w-full py-3 rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:scale-95 ${isPremium
                                                    ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-200'
                                                    : 'bg-neutral-900 text-white hover:bg-black border border-neutral-900'
                                                }`}
                                            disabled={!hasItems}
                                            onClick={() => window.open('/shopping', '_blank')}
                                        >
                                            {isPremium ? <Sparkles className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />}
                                            {isPremium ? "View Premium Details" : "Add Standard Match"}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                /* Empty State - Transparent */
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center opacity-0">
                        {/* Hidden until content loads to keep canvas clean */}
                    </div>
                </div>
            )}
        </div>
    );
}
