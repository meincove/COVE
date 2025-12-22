"use client";

import React, { useState, useEffect, useRef } from "react";
import { Check, Loader2, AlertCircle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Agent configuration with visual identity
const AGENT_CONFIG: Record<string, {
    icon: string;
    color: string;
    gradient: string;
    label: string;
}> = {
    classifier: {
        icon: "🧠",
        color: "#8B5CF6",
        gradient: "from-purple-500/20 to-purple-600/10",
        label: "Understanding"
    },
    search: {
        icon: "🔍",
        color: "#3B82F6",
        gradient: "from-blue-500/20 to-blue-600/10",
        label: "Searching"
    },
    stylist: {
        icon: "✨",
        color: "#F59E0B",
        gradient: "from-amber-500/20 to-amber-600/10",
        label: "Styling"
    },
    filter: {
        icon: "⚙️",
        color: "#6366F1",
        gradient: "from-indigo-500/20 to-indigo-600/10",
        label: "Filtering"
    },
    budget: {
        icon: "💰",
        color: "#10B981",
        gradient: "from-green-500/20 to-green-600/10",
        label: "Optimizing"
    },
    cart: {
        icon: "🛒",
        color: "#EC4899",
        gradient: "from-pink-500/20 to-pink-600/10",
        label: "Cart"
    },
    checkout: {
        icon: "💳",
        color: "#14B8A6",
        gradient: "from-teal-500/20 to-teal-600/10",
        label: "Checkout"
    },
    fit: {
        icon: "📏",
        color: "#F97316",
        gradient: "from-orange-500/20 to-orange-600/10",
        label: "Sizing"
    },
};

type ThinkingEvent = {
    id: string;
    timestamp: number;
    agent: string;
    action: string;
    status: "pending" | "done" | "error";
    details?: string;
    confidence?: number;
    tool_used?: string;
};

type ToolUsage = {
    tool: string;
    duration_ms: number;
    success: boolean;
    summary: string;
    error?: string;
};

type Props = {
    thinking_events?: ThinkingEvent[];
    tools_used?: ToolUsage[];
    compact?: boolean;
    loading?: boolean;
};

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring" as const,
            stiffness: 300,
            damping: 24
        }
    }
};

const toolCardVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            type: "spring" as const,
            stiffness: 260,
            damping: 20
        }
    }
};

export default function EnhancedThinking({ thinking_events, tools_used, compact = false, loading = false }: Props) {
    const hasThinking = thinking_events && thinking_events.length > 0;
    const hasTools = tools_used && tools_used.length > 0;

    // Sequential reveal state
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [isComplete, setIsComplete] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const lastStreamStartId = useRef<string | null>(null);

    // Handle sequential animation
    useEffect(() => {
        if (!thinking_events || thinking_events.length === 0 || compact) {
            // Only mark complete if we are NOT loading
            if (!loading) {
                setIsComplete(true);
            }
            return;
        }

        if (currentIndex < thinking_events.length) {
            const timeout = setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
            }, 500); // 0.5s per step for snappier feedback
            return () => clearTimeout(timeout);
        } else {
            // Animation done for current batch
            // CRITICAL FIX: Only mark complete if stream is finished
            if (!loading) {
                setIsComplete(true);
            }
        }
    }, [currentIndex, thinking_events, compact, loading]);

    // Handle streaming updates
    useEffect(() => {
        if (!thinking_events || thinking_events.length === 0) return;

        const currentStartId = thinking_events[0].id;

        if (lastStreamStartId.current !== currentStartId) {
            // New stream detected - reset everything
            setCurrentIndex(0);
            setIsComplete(false);
            lastStreamStartId.current = currentStartId;
        } else {
            // Existing stream updated - if we have new items, ensure animation continues
            if (thinking_events.length > currentIndex) {
                setIsComplete(false);
            }
        }
    }, [thinking_events]);

    if (!hasThinking && !hasTools) return null;

    if (compact) {
        return (
            <div className="bg-neutral-900/50 rounded-lg px-3 py-2 mb-2 border border-neutral-700/50">
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <Check className="h-3 w-3 text-green-500" />
                    <span>{thinking_events?.length || 0} steps</span>
                </div>
            </div>
        );
    }

    // Finished state: Show summary with expand option
    if (isComplete && !isExpanded) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01, backgroundColor: "rgba(23, 23, 23, 0.6)" }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setIsExpanded(true)}
                className="bg-neutral-900/40 rounded-xl p-3 border border-white/5 mb-4 cursor-pointer transition-colors group"
            >
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <Check className="h-3 w-3 text-green-500" />
                    <span className="group-hover:text-neutral-300">
                        Processed {thinking_events?.length} steps & {tools_used?.length || 0} tools
                    </span>
                    <span className="ml-auto text-[10px] uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">View Details</span>
                </div>
            </motion.div>
        );
    }

    // Expanded View (History) or Active Animation Step
    const visibleEvents = !isComplete && thinking_events
        ? thinking_events.slice(0, currentIndex + 1)
        : [];

    return (
        <div className="bg-gradient-to-br from-neutral-900/95 to-black/95 rounded-2xl p-4 border border-white/10 backdrop-blur-sm mb-4">

            {/* Thinking Header */}
            {!isComplete && (
                <div className="flex items-center gap-2 mb-3 px-1">
                    <Loader2 className="h-3 w-3 text-purple-400 animate-spin" />
                    <span className="text-xs font-medium text-neutral-400 animate-pulse">Thinking...</span>
                </div>
            )}

            {/* Stacking Steps List */}
            <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                    {!isComplete && visibleEvents.map((event, idx) => (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: -10, height: 0 }}
                            animate={{ opacity: 1, x: 0, height: "auto" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        >
                            <div className={`flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r ${AGENT_CONFIG[event.agent]?.gradient || 'from-neutral-800/20 to-neutral-900/10'} border border-white/5`}>
                                <div className="flex-shrink-0 mt-0.5">
                                    <div className="text-lg">
                                        {AGENT_CONFIG[event.agent]?.icon || "🤖"}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-neutral-200 leading-tight">
                                        {event.action}
                                    </p>
                                    {event.details && (
                                        <p className="text-xs text-neutral-500 mt-0.5 truncate">
                                            {event.details}
                                        </p>
                                    )}
                                </div>
                                {idx === visibleEvents.length - 1 && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse mt-1.5 mr-1" />
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Full History (Only when expanded) */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="space-y-4 pt-2"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Full Reasoning</h4>
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                                className="text-xs text-neutral-500 hover:text-white"
                            >
                                Collapse
                            </button>
                        </div>

                        <motion.div
                            className="space-y-3 relative"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            {/* Vertical line connecting steps */}
                            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-neutral-800" />

                            {thinking_events?.map((event, i) => (
                                <motion.div
                                    key={event.id}
                                    variants={itemVariants}
                                    className="flex items-start gap-3 relative"
                                >
                                    <div className="flex-shrink-0 z-10">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 duration-200" style={{ backgroundColor: `${AGENT_CONFIG[event.agent]?.color || '#666'}20` }}>
                                            <div className="text-base">
                                                {AGENT_CONFIG[event.agent]?.icon || "🤖"}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0 py-0.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-neutral-300">
                                                {event.action}
                                            </span>
                                            {event.status === "done" && <Check className="h-3 w-3 text-green-500" />}
                                            {event.status === "error" && <AlertCircle className="h-3 w-3 text-red-500" />}
                                            {event.status === "pending" && <Loader2 className="h-3 w-3 text-purple-500 animate-spin" />}
                                        </div>
                                        {event.tool_used && (
                                            <motion.div
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="text-[10px] text-purple-400 mt-0.5 bg-purple-500/10 inline-block px-1.5 py-0.5 rounded"
                                            >
                                                Used: {event.tool_used}
                                            </motion.div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>

                        {/* Enhanced Tools Summary */}
                        {hasTools && (
                            <div className="border-t border-neutral-800 pt-4 mt-3">
                                <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-3">🔧 Tools Used</h4>
                                <motion.div
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    className="grid grid-cols-1 md:grid-cols-2 gap-3"
                                >
                                    {tools_used.map((tool, i) => (
                                        <motion.div
                                            key={i}
                                            variants={toolCardVariants}
                                            whileHover={{ scale: 1.02, borderColor: "rgba(168, 85, 247, 0.3)" }}
                                            whileTap={{ scale: 0.98 }}
                                            className="bg-neutral-900/80 border border-neutral-700/50 rounded-xl p-3 transition-colors cursor-pointer"
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center text-xs">
                                                    🔧
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-semibold text-white truncate">
                                                        {tool.tool}
                                                    </div>
                                                    <div className="text-[10px] text-neutral-500">
                                                        {tool.duration_ms}ms
                                                    </div>
                                                </div>
                                            </div>
                                            {tool.summary && (
                                                <div className="text-[10px] text-neutral-400 line-clamp-2">
                                                    {tool.summary}
                                                </div>
                                            )}
                                            {tool.success && (
                                                <div className="mt-2 flex items-center gap-1">
                                                    <Check className="h-3 w-3 text-green-500" />
                                                    <span className="text-[10px] text-green-500">Success</span>
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </motion.div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
