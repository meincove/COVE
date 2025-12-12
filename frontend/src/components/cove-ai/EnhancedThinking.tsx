// frontend/src/components/cove-ai/EnhancedThinking.tsx
"use client";

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

    if (!hasThinking && !hasTools) return null;

    if (compact) {
        // Compact view for message history
        return (
            <div className="bg-neutral-900/50 rounded-lg px-3 py-2 mb-2 border border-neutral-700/50">
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <Check className="h-3 w-3 text-green-500" />
                    <span>{thinking_events?.length || 0} steps</span>
                    {hasTools && (
                        <>
                            <span className="text-neutral-600">•</span>
                            <Clock className="h-3 w-3" />
                            <span>{tools_used?.length || 0} tools</span>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // Full view while displaying
    return (
        <div className="bg-gradient-to-br from-neutral-900/95 to-black/95 rounded-2xl p-4 border border-white/10 backdrop-blur-sm mb-4">
            {/* Thinking Events */}
            {hasThinking && (
                <div className="space-y-3 mb-4">
                    <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">AI Reasoning</h4>
                    {thinking_events.map((event, i) => (
                        <div
                            key={event.id}
                            className="flex items-start gap-3 group"
                            style={{ animationDelay: `${i * 100}ms` }}
                        >
                            {/* Agent Icon */}
                            <div className="flex-shrink-0 text-2xl">
                                {AGENT_ICONS[event.agent] || "🤖"}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-white leading-tight">
                                        {event.action}
                                    </p>
                                    {event.confidence !== undefined && (
                                        <span className="text-xs text-neutral-500">
                                            {event.confidence.toFixed(0)}%
                                        </span>
                                    )}
                                </div>
                                {event.details && (
                                    <p className="text-xs text-neutral-400 mt-0.5">
                                        {event.details}
                                    </p>
                                )}
                                {event.tool_used && (
                                    <p className="text-xs text-purple-400 mt-1">
                                        → {event.tool_used}
                                    </p>
                                )}
                            </div>

                            {/* Status indicator */}
                            <div className="flex-shrink-0">
                                {event.status === "done" ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                ) : event.status === "error" ? (
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                ) : (
                                    <Loader2 className="h-4 w-4 text-purple-400 animate-spin" />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Tools Used */}
            {hasTools && (
                <div className="border-t border-neutral-800 pt-3 mt-3">
                    <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">Tools Used</h4>
                    <div className="grid grid-cols-2 gap-2">
                        {tools_used.map((tool, i) => (
                            <div
                                key={i}
                                className={`px-3 py-2 rounded-lg border ${tool.success
                                        ? "bg-green-500/10 border-green-500/30"
                                        : "bg-red-500/10 border-red-500/30"
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-white">
                                        {tool.tool}
                                    </span>
                                    <span className="text-xs text-neutral-400">
                                        {tool.duration_ms}ms
                                    </span>
                                </div>
                                {tool.summary && (
                                    <p className="text-xs text-neutral-500 mt-1 truncate">
                                        {tool.summary}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
