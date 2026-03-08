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
    uploadedImage?: { file: File; preview: string } | null;
    onTriggerImageUpload?: () => void;
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
    onBrandSelect,
    uploadedImage,
    onTriggerImageUpload
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

    // VTO States
    const [vtoLoading, setVtoLoading] = useState<number | null>(null); // lookup by outfit number (1, 2, 3)
    const [vtoResults, setVtoResults] = useState<Record<number, string>>({}); // look num -> image url
    const [waitingForImage, setWaitingForImage] = useState(false); // ✨ UX: Track if we asked for an upload

    // ✨ AUTO-TRIGGER VTO: When image arrives and we were waiting, run it!
    useEffect(() => {
        if (waitingForImage && uploadedImage) {
            console.log("📸 Image uploaded! Auto-triggering VTO...");
            handleVTO(activeOutfit);
            setWaitingForImage(false); // Reset flag
        }
    }, [uploadedImage, waitingForImage, activeOutfit]);

    // Check if building has started (any category activity) - Force skip steps if events exist
    const hasExternalEvents = streamEvents.length > 0;

    // Determine current effective step
    // If events are flowing, we are definitely building.
    const currentStep = 'building';
    const isBuilding = true;

    // ✨ DERIVED STATE: Group items into outfits
    const outfits: Record<string, ProductCandidate[]> = {
        outfit_1: [],
        outfit_2: [],
        outfit_3: []
    };

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

    const handleVTO = async (lookNum: number) => {
        const items = outfits[`outfit_${lookNum}`];
        if (!items || items.length === 0) return;

        if (!uploadedImage) {
            setWaitingForImage(true); // ✨ Mark that we are waiting
            onTriggerImageUpload?.();
            return;
        }

        // Proceed if we have image (or it just arrived)

        setVtoLoading(lookNum);

        try {
            // Convert file to base64
            const imageData: string = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64String = reader.result as string;
                    resolve(base64String.split(',')[1] || base64String);
                };
                reader.readAsDataURL(uploadedImage.file);
            });

            const res = await fetch(`${process.env.NEXT_PUBLIC_AI_CORE_BASE_URL || 'http://localhost:8000'}/ai/vto/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: items.map(i => ({
                        title: i.title,
                        imageUrl: i.imageUrl,
                        type: i.type,
                        slug: i.slug
                    })),
                    imageData: imageData
                })
            });

            const data = await res.json();
            if (data.ok && data.vto_image_url) {
                setVtoResults(prev => ({ ...prev, [lookNum]: data.vto_image_url }));
            } else {
                console.error("VTO Failed:", data.error || data.reasoning);
                alert(`Failed to generate preview: ${data.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error("VTO Error:", err);
            alert("An error occurred while generating the virtual try-on.");
        } finally {
            setVtoLoading(null);
        }
    };


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
                        {/* VTO Preview if generated */}
                        {/* VTO Preview if generated */}
                        {vtoResults[activeOutfit] && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mb-4 rounded-xl overflow-hidden shadow-2xl relative bg-neutral-900 group ring-1 ring-white/10"
                            >
                                {/* Floating Badge */}
                                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[10px] text-white font-bold uppercase tracking-wider z-20 flex items-center gap-1.5 shadow-lg">
                                    <Sparkles className="w-3 h-3 text-emerald-400 fill-emerald-400/20" />
                                    AI Preview
                                </div>
                                <div className="absolute top-3 right-3 z-20">
                                    <div className="h-6 w-6 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-[pulse_2s_infinite]" />
                                    </div>
                                </div>

                                {/* Container - enforced 3:4 ratio */}
                                <div className="relative aspect-[3/4] w-full isolate">

                                    {/* 1. Backdrop (Blurred + Darkened) */}
                                    <div className="absolute inset-0 z-0">
                                        <img
                                            src={vtoResults[activeOutfit]}
                                            alt=""
                                            className="w-full h-full object-cover blur-2xl scale-125 opacity-50"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                                    </div>

                                    {/* 2. Main Image (Crisp + Centered) */}
                                    <img
                                        src={vtoResults[activeOutfit]}
                                        alt="Virtual Preview"
                                        className="relative w-full h-full object-contain z-10 drop-shadow-2xl transition-transform duration-700 group-hover:scale-[1.02]"
                                    />

                                    {/* 3. Subtle shine/vignette */}
                                    <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/10 z-20 rounded-xl" />
                                </div>
                            </motion.div>
                        )}

                        <div className="flex gap-2">
                            <button
                                onClick={() => handleVTO(activeOutfit)}
                                disabled={vtoLoading !== null}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md
                                    ${vtoLoading === activeOutfit
                                        ? 'bg-emerald-100 text-emerald-700 cursor-wait'
                                        : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                    }`}
                            >
                                {vtoLoading === activeOutfit ? (
                                    <>
                                        <div className="h-3 w-3 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-3.5 w-3.5" />
                                        Virtual Try-On
                                    </>
                                )}
                            </button>

                            <button className="flex-1 py-2.5 bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md">
                                <ShoppingBag className="h-3.5 w-3.5" />
                                Add Look to Cart
                            </button>
                        </div>
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
