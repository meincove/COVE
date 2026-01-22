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

    const categoryList = ["Tops", "Bottoms", "Shoes"];
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
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
                            {categoryList.map((cat) => {
                                const state = categories[cat];
                                const status = state?.status;
                                const candidates = state?.candidates || [];

                                return (
                                    <div key={cat} className="space-y-3">
                                        {/* Category Header */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-lg ${status === 'found' || status === 'selected' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {status === "searching" ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <ShoppingBag className="h-4 w-4" />
                                                    )}
                                                </div>
                                                <span className="text-base font-semibold text-gray-900">{cat}</span>
                                            </div>

                                            <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                                                {status === "searching" && "Searching..."}
                                                {status === "found" && `${state?.totalFound || candidates.length} options`}
                                                {status === "selected" && "Selection Made"}
                                                {!status && "Waiting"}
                                            </span>
                                        </div>

                                        {/* Candidates Grid */}
                                        {candidates.length > 0 ? (
                                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                                {candidates.slice(0, 8).map((candidate, idx) => (
                                                    <div
                                                        key={candidate.slug || idx}
                                                        className={`group relative rounded-xl overflow-hidden border bg-gray-50 transition-all ${candidate.vettingStatus === 'accepted'
                                                            ? 'border-emerald-500 ring-2 ring-emerald-500/10'
                                                            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                                                            }`}
                                                    >
                                                        {/* Product Image */}
                                                        <div className="aspect-[3/4] bg-white relative">
                                                            {candidate.imageUrl ? (
                                                                <img
                                                                    src={candidate.imageUrl}
                                                                    alt={candidate.title}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                                    <ShoppingBag className="h-6 w-6" />
                                                                </div>
                                                            )}

                                                            {/* Vetting Badge */}
                                                            {candidate.vettingStatus === 'accepted' && (
                                                                <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                                                    MATCH
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Price Overlay */}
                                                        <div className="absolute bottom-0 inset-x-0 bg-white/90 backdrop-blur-sm p-2 border-t border-gray-100">
                                                            <p className="text-xs font-semibold text-gray-900 text-center">
                                                                €{candidate.price?.toFixed(0) || '0'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            /* Empty State per Category */
                                            status !== "searching" && (
                                                <div className="h-24 rounded-xl border border-dashed border-gray-200 flex items-center justify-center bg-gray-50/50">
                                                    <span className="text-sm text-gray-400">No items found yet</span>
                                                </div>
                                            )
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-center">
                            <div className="flex items-center gap-2 text-xs text-gray-500 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
                                <Sparkles className="h-3 w-3 text-emerald-500" />
                                <span>The AI is selecting the best matches for your outfit</span>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
