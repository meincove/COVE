"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Search, Sparkles, ShoppingBag } from "lucide-react";
import GenderSelectionStep from "./GenderSelectionStep";

interface ProductCandidate {
    title: string;
    price: number;
    imageUrl?: string;
    slug?: string;
    type?: string;
    vettingStatus?: "analyzing" | "rejected" | "accepted";
    rejectionReason?: string;
    stylist_note?: string; // New field for harmony alerts
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
    onGenderSelect?: (gender: 'mens' | 'womens') => void;
}

/**
 * AgenticOutfitBuilder - Shows live AI product exploration
 * 
 * Displays:
 * - Category tabs (Tops, Bottoms, Shoes, Accessories)
 * - Product cards appearing with fade-in animation
 * - "Searching..." → "Found X options" → "Selected ✓" flow
 */
import { useOutfitStore } from "@/src/hooks/useOutfitStore";

// ... interfaces ...

export default function AgenticOutfitBuilder({
    streamEvents,
    isActive,
    onGenderSelect
}: AgenticOutfitBuilderProps) {
    // Use global store
    const { categories, setCategoryState, updateCandidate, activeCategory, setActiveCategory, budgetMax } = useOutfitStore();

    // Current outfit view (1, 2, or 3)
    const [activeOutfit, setActiveOutfit] = useState(1);

    // Gender selection state
    const [selectedGender, setSelectedGender] = useState<'mens' | 'womens' | null>(null);

    // Track how many events we've processed
    const processedCountRef = useRef(0);

    // Group items by outfit_id from stream events
    const [outfits, setOutfits] = useState<{ [key: string]: ProductCandidate[] }>({});

    // Process streaming events -> Sync to Store AND track outfits
    useEffect(() => {
        if (!streamEvents.length) return;

        // Process only NEW events (ones we haven't seen yet)
        const newEvents = streamEvents.slice(processedCountRef.current);

        newEvents.forEach((event) => {
            // Handle budget_set event (no category)
            if (event.event_type === "budget_set" && event.budget_max) {
                console.log('💰 Setting budget max:', event.budget_max);
                // Budget handled by global hook
                return;
            }

            // Normalize category name to match store schema (Tops, Bottoms, Shoes, Outerwear, Accessories, Other)
            let category = event.category;
            if (category) {
                const lower = category.toLowerCase();
                if (lower.includes('top') || lower.includes('shirt') || lower.includes('tee') || lower.includes('blouse')) category = 'Tops';
                else if (lower.includes('bottom') || lower.includes('pant') || lower.includes('jean') || lower.includes('short') || lower.includes('skirt')) category = 'Bottoms';
                else if (lower.includes('shoe') || lower.includes('sneaker') || lower.includes('boot') || lower.includes('loafer') || lower.includes('sandal')) category = 'Shoes';
                else if (lower.includes('outer') || lower.includes('jacket') || lower.includes('coat') || lower.includes('blazer') || lower.includes('cardigan') || lower.includes('vest')) category = 'Outerwear';
                else if (lower.includes('access') || lower.includes('bag') || lower.includes('belt') || lower.includes('hat') || lower.includes('scarf') || lower.includes('jewel') || lower === 'other') category = 'Accessories';
                else category = category.charAt(0).toUpperCase() + category.slice(1);
            }

            if (!category) return;

            switch (event.event_type) {
                case "category_start":
                    // Handled by global hook
                    break;

                case "category_candidates":
                    // Handled by global hook
                    break;

                case "item_selected":
                    // Store update handled by global hook
                    // We only handle local outfit grouping here

                    // Track items by category, then distribute across 3 outfits
                    const item = event.selected_item;
                    // Add stylist note if present in event (it might be attached to the item or event)
                    // The backend sends it in the item object usually, or we need to extract it.
                    // Assuming item has it or we add it.

                    if (item && category) {
                        setOutfits(prev => {
                            // Track items grouped by category
                            const byCategory: { [cat: string]: ProductCandidate[] } = {
                                Outerwear: [],
                                Tops: [],
                                Bottoms: [],
                                Shoes: [],
                                Accessories: []
                            };

                            // Collect existing items by category (flatten all outfits)
                            Object.values(prev).forEach(outfitItems => {
                                outfitItems.forEach(existingItem => {
                                    const itemCat = existingItem.type?.charAt(0).toUpperCase() +
                                        (existingItem.type?.slice(1).toLowerCase() || '');
                                    const lowerType = itemCat.toLowerCase();

                                    // Map item types to categories
                                    if (['jacket', 'coat', 'blazer', 'vest', 'cardigan', 'outer'].some(t => lowerType.includes(t))) {
                                        byCategory.Outerwear.push(existingItem);
                                    } else if (['tee', 'hoodie', 'shirt', 'sweater', 'top', 'blouse'].some(t => lowerType.includes(t))) {
                                        byCategory.Tops.push(existingItem);
                                    } else if (['pants', 'jeans', 'shorts', 'trousers', 'bottom', 'skirt'].some(t => lowerType.includes(t))) {
                                        byCategory.Bottoms.push(existingItem);
                                    } else if (['sneakers', 'shoes', 'boots', 'loafers', 'sandals', 'heels', 'pumps'].some(t => lowerType.includes(t))) {
                                        byCategory.Shoes.push(existingItem);
                                    } else {
                                        byCategory.Accessories.push(existingItem); // Default to accessories for belts/bags/etc
                                    }
                                });
                            });

                            // Add the new item to its category (using the 'category' we just derived from event which is accurate)
                            if (category === 'Outerwear') byCategory.Outerwear.push(item);
                            else if (category === 'Tops') byCategory.Tops.push(item);
                            else if (category === 'Bottoms') byCategory.Bottoms.push(item);
                            else if (category === 'Shoes') byCategory.Shoes.push(item);
                            else byCategory.Accessories.push(item);

                            // Now build outfits by taking 1st item from each category for Look 1, 2nd for Look 2, etc.
                            const grouped: { [key: string]: ProductCandidate[] } = {
                                'outfit_1': [],
                                'outfit_2': [],
                                'outfit_3': [],
                            };

                            // Layering Order: Outerwear -> Tops -> Bottoms -> Shoes -> Accessories
                            const layerOrder = ['Outerwear', 'Tops', 'Bottoms', 'Shoes', 'Accessories'];

                            layerOrder.forEach(cat => {
                                if (byCategory[cat][0]) grouped['outfit_1'].push(byCategory[cat][0]);
                                if (byCategory[cat][1]) grouped['outfit_2'].push(byCategory[cat][1]);
                                if (byCategory[cat][2]) grouped['outfit_3'].push(byCategory[cat][2]);
                            });

                            return grouped;
                        });
                    }
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
                    // Handled by global hook
                    break;
            }
        });

        // Update processed count
        processedCountRef.current = streamEvents.length;
    }, [streamEvents, setCategoryState, updateCandidate, setActiveCategory]);

    if (!isActive) return null;

    // Get outfit arrays
    const outfitIds = Object.keys(outfits).sort();

    // Check if building has started (any category activity)
    const hasBuildingStarted = Object.keys(categories).length > 0 || streamEvents.length > 0;
    const hasOutfits = outfitIds.length > 0;
    const currentOutfitItems = outfits[`outfit_${activeOutfit}`] || [];

    // Calculate outfit totals
    const outfitTotals = outfitIds.map(id => {
        const items = outfits[id] || [];
        return items.reduce((sum, item) => sum + (item.price || 0), 0);
    });

    // Check if we're still building (any category is searching/found but not all selected)
    const isBuilding = Object.values(categories).some(c =>
        c.status === 'searching' || (c.status === 'found' && !c.selectedItem)
    );

    // Handler for gender selection
    const handleGenderSelect = (gender: 'mens' | 'womens') => {
        setSelectedGender(gender);
        onGenderSelect?.(gender);
    };

    // Show gender selection if no building started yet
    if (!hasBuildingStarted && !selectedGender) {
        return <GenderSelectionStep onSelect={handleGenderSelect} />;
    }

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
