"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface GenderSelectionStepProps {
    onSelect: (gender: 'mens' | 'womens') => void;
}

/**
 * GenderSelectionStep - First step before building an outfit
 * Asks user to select Men's or Women's to personalize results
 */
export default function GenderSelectionStep({ onSelect }: GenderSelectionStepProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-2xl p-6 border border-white/10"
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-500/20 rounded-xl">
                    <Sparkles className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white">Let's Build Your Look</h3>
                    <p className="text-sm text-neutral-400">I'll curate 3 complete outfits for you</p>
                </div>
            </div>

            {/* Gender Selection */}
            <p className="text-sm text-neutral-300 mb-4">First, what are we shopping for?</p>

            <div className="flex gap-3">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelect('mens')}
                    className="flex-1 py-4 px-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 rounded-xl transition-all group"
                >
                    <span className="text-2xl mb-2 block">👔</span>
                    <span className="text-white font-medium">Men's</span>
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelect('womens')}
                    className="flex-1 py-4 px-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-pink-500/50 rounded-xl transition-all group"
                >
                    <span className="text-2xl mb-2 block">👗</span>
                    <span className="text-white font-medium">Women's</span>
                </motion.button>
            </div>

            <p className="text-xs text-neutral-500 mt-4 text-center">
                This helps me find the right styles and fits
            </p>
        </motion.div>
    );
}
