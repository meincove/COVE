// src/components/cove-ai/BubblesStatusPill.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface ThinkingStep {
    icon: string;
    status: string;
    detail?: string;
    done?: boolean;
}

interface BubblesStatusPillProps {
    isThinking: boolean;
    thinkingSteps?: ThinkingStep[];
    className?: string;
}

export default function BubblesStatusPill({
    isThinking,
    thinkingSteps = [],
    className = "",
}: BubblesStatusPillProps) {
    const [showSteps, setShowSteps] = useState(false);

    // Auto-expand to show steps when thinking
    useEffect(() => {
        if (isThinking && thinkingSteps.length > 0) {
            setShowSteps(true);
        } else {
            setShowSteps(false);
        }
    }, [isThinking, thinkingSteps.length]);

    // Limit to last 2 steps for cleaner UI
    const visibleSteps = thinkingSteps.slice(-2);

    return (
        <div className={`flex justify-center ${className}`}>
            <motion.div
                layout
                className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden relative z-50 -mt-2"
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
                {/* Main Pill Content */}
                <motion.div layout className="px-3 py-2 flex items-center gap-2.5">
                    {/* Logo - Black circular icon with B letter + green dot */}
                    <div className="relative">
                        <div className="h-7 w-7 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-sm font-bold">B</span>
                        </div>
                        {/* Green active dot - overlay on icon when thinking */}
                        <AnimatePresence>
                            {isThinking && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0 }}
                                    className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-[1.5px] border-white animate-pulse"
                                />
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Name & Status */}
                    <div className="flex flex-col min-w-[70px]">
                        <span className="font-bold text-gray-900 text-sm tracking-tight">Bubbles</span>
                        <AnimatePresence mode="wait">
                            {isThinking && (
                                <motion.span
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    className="text-[10px] text-gray-500 font-medium"
                                >
                                    Thinking...
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Thinking Steps - Expandable section */}
                <AnimatePresence>
                    {showSteps && visibleSteps.length > 0 && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="bg-gray-50/50 backdrop-blur-[2px] overflow-hidden"
                        >
                            <div className="px-3 pb-2 pt-1 border-t border-gray-100 max-h-[60px] overflow-hidden relative">
                                {/* Gradient Masks for blur effect */}
                                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-b from-white/60 to-transparent z-10 pointer-events-none" />
                                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-t from-white/60 to-transparent z-10 pointer-events-none" />

                                <motion.div className="flex flex-col justify-end" layout>
                                    <AnimatePresence mode="popLayout" initial={false}>
                                        {visibleSteps.map((step, idx) => (
                                            <motion.div
                                                key={step.icon + step.status + idx}
                                                layout
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                className="flex items-center gap-2 py-0.5"
                                            >
                                                <span className="text-xs">{step.icon}</span>
                                                <span className="text-[10px] text-gray-600 font-medium truncate max-w-[160px]">
                                                    {step.status}
                                                </span>
                                                <div className="ml-auto">
                                                    {!step.done ? (
                                                        <motion.div
                                                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                                            transition={{ duration: 1.5, repeat: Infinity }}
                                                            className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                                                        />
                                                    ) : (
                                                        <motion.div
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                            className="h-1.5 w-1.5 rounded-full bg-gray-300"
                                                        />
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </motion.div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
