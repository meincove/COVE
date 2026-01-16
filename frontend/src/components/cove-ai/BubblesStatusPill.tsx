// src/components/cove-ai/BubblesStatusPill.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, ThumbsDown, ChevronDown } from "lucide-react";
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
    const [isExpanded, setIsExpanded] = useState(false);

    // Auto-expand/collapse based on thinking state
    useEffect(() => {
        if (isThinking) {
            setIsExpanded(true);
        } else {
            // Collapse when done, user can click to expand for feedback
            setIsExpanded(false);
        }
    }, [isThinking]);

    // Limit to last 2 steps for cleaner UI
    const visibleSteps = thinkingSteps.slice(-2);

    return (
        <div className={`flex justify-center ${className}`}>
            <motion.div
                layout
                onClick={() => !isThinking && setIsExpanded(!isExpanded)}
                className={`bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden cursor-pointer transition-shadow hover:shadow-xl relative z-50`}
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
                {/* Main Pill Content - Compact Design */}
                <motion.div layout className="px-3 py-2 flex items-center gap-2.5">
                    {/* Logo - Smaller */}
                    <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-white font-bold text-xs">B</span>
                    </div>

                    {/* Name & Status */}
                    <div className="flex flex-col min-w-[80px]">
                        <span className="font-semibold text-gray-900 text-xs">Bubbles</span>
                        {isThinking ? (
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-[10px] text-gray-500 font-medium"
                            >
                                Thinking...
                            </motion.span>
                        ) : (
                            <span className="text-[10px] text-gray-400">
                                {isExpanded ? "Rate response" : "Click to rate"}
                            </span>
                        )}
                    </div>

                    {/* Chevron or Feedback Actions */}
                    <div className="ml-1 flex items-center">
                        <AnimatePresence mode="popLayout">
                            {!isThinking && isExpanded && (
                                <motion.div
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: 'auto' }}
                                    exit={{ opacity: 0, width: 0 }}
                                    className="flex items-center gap-1 overflow-hidden"
                                >
                                    <motion.button
                                        initial={{ x: 20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.1, type: "spring" }}
                                        className="p-1.5 rounded-full hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors"
                                        onClick={(e) => { e.stopPropagation(); /* Handle like */ }}
                                    >
                                        <ThumbsUp className="h-3.5 w-3.5" />
                                    </motion.button>
                                    <motion.button
                                        initial={{ x: 20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.2, type: "spring" }}
                                        className="p-1.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                                        onClick={(e) => { e.stopPropagation(); /* Handle dislike */ }}
                                    >
                                        <ThumbsDown className="h-3.5 w-3.5" />
                                    </motion.button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Thinking Steps - Scrolling Animation */}
                <AnimatePresence>
                    {isThinking && thinkingSteps.length > 0 && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-gray-50/50 backdrop-blur-[2px]"
                        >
                            <div className="px-3 pb-2 pt-1 border-t border-gray-100 max-h-[60px] overflow-hidden relative">
                                {/* Gradient Masks for blur effect */}
                                <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-b from-white/80 to-transparent z-10 pointer-events-none" />
                                <div className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-t from-white/80 to-transparent z-10 pointer-events-none" />

                                <motion.div
                                    className="flex flex-col justify-end"
                                    layout
                                >
                                    <AnimatePresence mode="popLayout" initial={false}>
                                        {visibleSteps.map((step) => (
                                            <motion.div
                                                key={step.icon + step.status} // Unique key for animation
                                                layout
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: -10, scale: 0.95, position: "absolute" }} // Absolute exit to prevent jumping
                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                className="flex items-center gap-2 py-0.5"
                                            >
                                                <span className="text-xs">{step.icon}</span>
                                                <span className="text-[10px] text-gray-600 font-medium truncate max-w-[140px]">
                                                    {step.status}
                                                </span>
                                                <div className="ml-auto">
                                                    {!step.done ? (
                                                        <motion.div
                                                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                                            transition={{ duration: 1.5, repeat: Infinity }}
                                                            className="h-1.5 w-1.5 rounded-full bg-green-500"
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
