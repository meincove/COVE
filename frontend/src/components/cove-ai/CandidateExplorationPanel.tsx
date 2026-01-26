"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Check, ShoppingBag, Sparkles, Loader2 } from "lucide-react";

interface ProductCandidate {
    title: string;
    price: number;
    imageUrl?: string;
    slug: string;
    type?: string;
    gender?: string;
    vettingStatus?: 'analyzing' | 'accepted' | 'rejected';
}

interface CategoryState {
    status: 'waiting' | 'searching' | 'found' | 'selected' | null;
    candidates: ProductCandidate[];
    totalFound?: number;
    selectedItem?: ProductCandidate;
}

interface CandidateExplorationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    categories: { [key: string]: CategoryState };
    isBuilding: boolean;
}

/**
 * CandidateExplorationPanel - Sliding panel showing live product candidates
 * Visible from the Chat tab during outfit building
 */
export default function CandidateExplorationPanel({
    isOpen,
    onClose,
    categories,
    isBuilding
}: CandidateExplorationPanelProps) {
    if (!isOpen) return null;

    // ✨ DYNAMIC CATEGORIES: Show whatever the agent has found, don't hardcode!
    // Sort logically: Tops -> Bottoms -> Shoes -> Accessories/Outerwear
    const categoryOrder = ["Tops", "Bottoms", "Shoes", "Outerwear", "Accessories", "Dress"];
    const categoryList = Object.keys(categories).sort((a, b) => {
        const idxA = categoryOrder.indexOf(a);
        const idxB = categoryOrder.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
    });

    const totalCandidates = categoryList.reduce((sum, cat) =>
        sum + (categories[cat]?.candidates?.length || 0), 0
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop - Transparent to see thinking bubbles */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/10 z-[60]"
                    />

                    {/* Centered Modal */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed inset-0 m-auto w-[90vw] max-w-2xl h-[85vh] bg-white border border-gray-200 rounded-2xl shadow-2xl z-[61] flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-emerald-500" />
                                <h3 className="text-gray-900 font-semibold text-lg">
                                    {isBuilding ? "Finding Products..." : "Candidates Found"}
                                </h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-900"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Status Bar */}
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                            <p className="text-sm text-gray-600 flex items-center gap-2">
                                {isBuilding ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                                        <span>Searching catalog for your perfect outfit...</span>
                                    </>
                                ) : (
                                    <span>Found <b>{totalCandidates}</b> products across {categoryList.length} categories</span>
                                )}
                            </p>
                        </div>

                        {/* Categories & Candidates */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white">
                            {categoryList.map((cat) => {
                                const state = categories[cat];
                                const status = state?.status;
                                const candidates = state?.candidates || [];
                                const isSearching = status === "searching";

                                return (
                                    <div key={cat} className="space-y-4">
                                        {/* Category Header with Badge */}
                                        <div className="flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-10 py-2 border-b border-transparent transition-colors duration-200">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-xl transition-colors duration-300 ${status === 'found' || status === 'selected' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
                                                    {isSearching ? (
                                                        <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                                                    ) : (
                                                        <ShoppingBag className="h-5 w-5" />
                                                    )}
                                                </div>
                                                <span className="text-lg font-bold text-gray-900 tracking-tight">{cat}</span>
                                            </div>

                                            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-300 ${isSearching
                                                ? 'bg-emerald-50 text-emerald-600 animate-pulse'
                                                : status === 'found'
                                                    ? 'bg-gray-100 text-gray-700'
                                                    : 'bg-gray-50 text-gray-400'
                                                }`}>
                                                {isSearching && "Analysing Trends..."}
                                                {status === "found" && `${state?.totalFound || candidates.length} Options Found`}
                                                {status === "selected" && "Item Selected"}
                                                {!status && "Waiting"}
                                            </span>
                                        </div>

                                        {/* Candidates Grid */}
                                        {(candidates.length > 0 || isSearching) ? (
                                            <div className="grid grid-cols-2 min-[480px]:grid-cols-3 sm:grid-cols-4 gap-4">
                                                {/* Premium Loading Skeletons */}
                                                {isSearching && Array.from({ length: 4 }).map((_, i) => (
                                                    <div key={`skel-${i}`} className="space-y-3 animate-pulse">
                                                        <div className="aspect-[3/4] bg-gray-100 rounded-xl" />
                                                        <div className="h-3 bg-gray-100 rounded w-3/4 mx-auto" />
                                                    </div>
                                                ))}

                                                {/* Product Cards */}
                                                <AnimatePresence mode="popLayout">
                                                    {candidates.slice(0, 12).map((candidate, idx) => (
                                                        <motion.div
                                                            key={candidate.slug || idx}
                                                            layout
                                                            initial={{ opacity: 0, scale: 0.9 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            transition={{ delay: idx * 0.05 }}
                                                            className={`group relative rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer ${candidate.vettingStatus === 'accepted'
                                                                ? 'ring-2 ring-emerald-500 ring-offset-2'
                                                                : 'border border-gray-100'
                                                                }`}
                                                        >
                                                            {/* Image Container */}
                                                            <div className="aspect-[3/4] bg-gray-50 relative overflow-hidden">
                                                                {candidate.imageUrl ? (
                                                                    <img
                                                                        src={candidate.imageUrl}
                                                                        alt={candidate.title}
                                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-2">
                                                                        <ShoppingBag className="h-8 w-8" />
                                                                    </div>
                                                                )}

                                                                {/* Overlay Gradient on Hover */}
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                            </div>

                                                            {/* Minimal Info */}
                                                            <div className="p-3 bg-white">
                                                                <p className="font-semibold text-gray-900 text-sm truncate" title={candidate.title}>
                                                                    {candidate.title}
                                                                </p>
                                                                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                                                    <span>€{candidate.price?.toFixed(0)}</span>
                                                                    {candidate.gender && (
                                                                        <>
                                                                            <span className="text-gray-300">•</span>
                                                                            <span className="uppercase text-[10px] font-bold tracking-wider text-gray-400">
                                                                                {candidate.gender === 'male' ? 'MEN' : candidate.gender === 'female' ? 'WOMEN' : candidate.gender === 'unisex' ? 'UNISEX' : candidate.gender}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </p>
                                                            </div>

                                                            {/* Match Badge */}
                                                            {candidate.vettingStatus === 'accepted' && (
                                                                <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md z-10 flex items-center gap-1">
                                                                    <Sparkles className="h-2.5 w-2.5" /> MATCH
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    ))}
                                                </AnimatePresence>
                                            </div>
                                        ) : (
                                            /* Refined Empty State */
                                            !isSearching && (
                                                <div className="py-8 flex flex-col items-center justify-center text-center opacity-50">
                                                    <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                                                        <Search className="h-5 w-5 text-gray-300" />
                                                    </div>
                                                    <p className="text-sm font-medium text-gray-400">Waiting to search...</p>
                                                </div>
                                            )
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 bg-white/80 backdrop-blur-md flex justify-between items-center z-20">
                            <span className="text-xs text-gray-400 font-medium">
                                AI is filtering for fit & budget
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="text-xs text-emerald-600 font-semibold tracking-wide uppercase">Live Processing</span>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
