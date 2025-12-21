// frontend/src/components/cove-ai/EnhancedThinking.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Check, Loader2, AlertCircle, Clock } from "lucide-react";

// Agent icon mapping
const AGENT_ICONS: Record<string, string> = {
    classifier: "🧠",
    search: "🔍",
    stylist: "✨",
    filter: "⚙️",
    budget: "💰",
    cart: "🛒",
    checkout: "💳",
    fit: "📏",
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
};

export default function EnhancedThinking({ thinking_events, tools_used, compact = false }: Props) {
    const hasThinking = thinking_events && thinking_events.length > 0;
    const hasTools = tools_used && tools_used.length > 0;

    // Sequential reveal state
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [isComplete, setIsComplete] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    // Handle sequential animation
    useEffect(() => {
        if (!thinking_events || thinking_events.length === 0 || compact) {
            setIsComplete(true);
            return;
        }

        if (currentIndex < thinking_events.length) {
            const timeout = setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
            }, 1200); // 1.2s per step to allow reading
            return () => clearTimeout(timeout);
        } else {
            // Animation done
            setIsComplete(true);
        }
    }, [currentIndex, thinking_events, compact]);

    // Reset if events change
    useEffect(() => {
        setCurrentIndex(0);
        setIsComplete(false);
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
            <div
                onClick={() => setIsExpanded(true)}
                className="bg-neutral-900/40 rounded-xl p-3 border border-white/5 mb-4 cursor-pointer hover:bg-neutral-900/60 transition-colors group"
            >
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <Check className="h-3 w-3 text-green-500" />
                    <span className="group-hover:text-neutral-300">
                        Processed {thinking_events?.length} steps & {tools_used?.length || 0} tools
                    </span>
                    <span className="ml-auto text-[10px] uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">View Details</span>
                </div>
            </div>
        );
    }

    // Expanded View (History) or Active Animation Step
    const activeEvent = !isComplete && thinking_events ? thinking_events[currentIndex] : null;

    return (
        <div className="bg-gradient-to-br from-neutral-900/95 to-black/95 rounded-2xl p-4 border border-white/10 backdrop-blur-sm mb-4">

            {/* Active Animation Step (One at a time) */}
            {!isComplete && activeEvent && (
                <div key={activeEvent.id} className="animate-fade-in-up">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 text-2xl animate-pulse">
                            {AGENT_ICONS[activeEvent.agent] || "🤖"}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-white leading-tight">
                                {activeEvent.action}
                            </p>
                            <p className="text-xs text-neutral-400 mt-1">
                                {activeEvent.details || "Processing..."}
                            </p>
                        </div>
                        <Loader2 className="h-4 w-4 text-purple-400 animate-spin" />
                    </div>
                </div>
            )}

            {/* Full History (Only when expanded) */}
            {isExpanded && (
                <div className="space-y-4 animate-fade-in-up">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Full Reasoning</h4>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                            className="text-xs text-neutral-500 hover:text-white"
                        >
                            Collapse
                        </button>
                    </div>

                    <div className="space-y-3 relative">
                        {/* Vertical line connecting steps */}
                        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-neutral-800" />

                        {thinking_events?.map((event, i) => (
                            <div key={event.id} className="flex items-start gap-3 relative">
                                <div className="flex-shrink-0 z-10 bg-neutral-900 rounded-full">
                                    <div className="text-lg">
                                        {AGENT_ICONS[event.agent] || "🤖"}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0 py-0.5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-neutral-300">
                                            {event.action}
                                        </span>
                                        {event.status === "done" && <Check className="h-3 w-3 text-green-500" />}
                                    </div>
                                    {event.tool_used && (
                                        <div className="text-[10px] text-purple-400 mt-0.5 bg-purple-500/10 inline-block px-1.5 py-0.5 rounded">
                                            Used: {event.tool_used}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Tools Summary */}
                    {hasTools && (
                        <div className="border-t border-neutral-800 pt-3 mt-2">
                            <div className="grid grid-cols-2 gap-2">
                                {tools_used.map((tool, i) => (
                                    <div key={i} className="px-2 py-1.5 rounded border border-neutral-800 bg-neutral-900/50">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-neutral-400">{tool.tool}</span>
                                            <span className="text-[10px] text-neutral-500">{tool.duration_ms}ms</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
