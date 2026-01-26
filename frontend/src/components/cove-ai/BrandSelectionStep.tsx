"use client";

import React from "react";
import { motion } from "framer-motion";
import { Crown } from "lucide-react";

interface BrandSelectionStepProps {
    onSelect: (brand: string | null) => void;
    onBack: () => void;
    hideBack?: boolean; // ✨ Optional prop
}

/**
 * BrandSelectionStep - Second step (optional) for Premium Pilot
 * Allows users to restrict outfits to specific premium brands.
 */
export default function BrandSelectionStep({ onSelect, onBack, hideBack }: BrandSelectionStepProps) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-2xl p-6 border border-white/10 h-full flex flex-col"
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-500/20 rounded-xl">
                    <Crown className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white">Select a Collection</h3>
                    <p className="text-sm text-neutral-400">Choose a brand aesthetic</p>
                </div>
            </div>

            {/* Brand Options */}
            <div className="flex-1 space-y-3">
                <motion.button
                    whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.08)" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelect('Aura Minimalist')}
                    className="w-full text-left p-4 bg-white/5 border border-white/10 rounded-xl transition-all group"
                >
                    <div className="flex justify-between items-center">
                        <div>
                            <span className="text-white font-bold block">Aura Minimalist</span>
                            <span className="text-xs text-neutral-400">Clean, organic, timeless.</span>
                        </div>
                        <div className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div>
                    </div>
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.08)" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelect('Vortex Streetwear')}
                    className="w-full text-left p-4 bg-white/5 border border-white/10 rounded-xl transition-all group"
                >
                    <div className="flex justify-between items-center">
                        <div>
                            <span className="text-white font-bold block">Vortex Streetwear</span>
                            <span className="text-xs text-neutral-400">Bold, tech, glitch.</span>
                        </div>
                        <div className="h-2 w-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
                    </div>
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelect(null)}
                    className="w-full text-left p-4 bg-transparent border border-white/5 hover:bg-white/5 rounded-xl transition-all"
                >
                    <span className="text-neutral-300 font-medium">All Brands (Standard)</span>
                </motion.button>
            </div>

            {!hideBack && (
                <button
                    onClick={onBack}
                    className="mt-4 text-xs text-neutral-500 hover:text-white transition-colors self-center py-2"
                >
                    ← Back to Gender
                </button>
            )}
        </motion.div>
    );
}
