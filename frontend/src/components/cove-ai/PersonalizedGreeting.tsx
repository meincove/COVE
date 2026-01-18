// src/components/cove-ai/PersonalizedGreeting.tsx
"use client";

import { useUser } from "@clerk/nextjs";
import { SignInButton } from "@clerk/nextjs";
import { User } from "lucide-react";

interface PersonalizedGreetingProps {
    onQuickAction?: (text: string) => void;
}

export default function PersonalizedGreeting({ onQuickAction }: PersonalizedGreetingProps) {
    const { isSignedIn, user, isLoaded } = useUser();

    if (!isLoaded) {
        return (
            <div className="p-4 animate-pulse">
                <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 w-48 bg-gray-200 rounded"></div>
            </div>
        );
    }

    // Handle quick action click
    const handleQuickClick = (text: string) => {
        if (onQuickAction) {
            onQuickAction(text);
        }
    };

    // Signed-in personalized greeting - Friendly message from Bubbles
    if (isSignedIn && user) {
        const displayName = user.firstName || user.username || "there";

        // Check if this is the first time the user is chatting (per session or ever)
        const isFirstTimeUser = typeof window !== 'undefined' && !localStorage.getItem('cove_has_chatted');

        // Determine the greeting based on first-time vs returning user
        const greeting = isFirstTimeUser ? (
            <>
                <span className="font-semibold text-gray-900">Hey {displayName}! 🫧</span>
                <br />
                I'm Bubbles, your personal shopping assistant! I'm here to help you discover styles,
                build outfits, and find exactly what you're looking for. What can I help you with today?
            </>
        ) : (
            <>
                <span className="font-semibold text-gray-900">Hey {displayName}! 👋</span>
                <br />
                Good to see you again! What are we shopping for today?
            </>
        );

        // Quick actions differ for first-time vs returning
        const quickActions = isFirstTimeUser ? [
            { emoji: "✨", text: "Show me trending styles" },
            { emoji: "🧥", text: "I need a hoodie" },
            { emoji: "🎨", text: "Build me an outfit" },
            { emoji: "🎁", text: "Surprise me!" }
        ] : [
            { emoji: "🔥", text: "Show me what's new" },
            { emoji: "👀", text: "Continue where I left off" },
            { emoji: "🎨", text: "Build me an outfit" },
            { emoji: "📦", text: "Check my orders" }
        ];

        return (
            <div className="p-4">
                {/* Bubbles Avatar + Personalized Message */}
                <div className="flex items-start gap-3 mb-4">
                    <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-xs">B</span>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm max-w-[280px]">
                        <p className="text-sm text-gray-700 leading-relaxed">
                            {greeting}
                        </p>
                    </div>
                </div>

                {/* Quick Suggestions */}
                <div className="mt-2 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-2">{isFirstTimeUser ? "Try one of these to get started:" : "Quick actions:"}</p>
                    <div className="flex flex-wrap gap-2">
                        {quickActions.map((item, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => handleQuickClick(item.text)}
                                className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 text-xs text-gray-600 hover:text-gray-800 transition-all cursor-pointer"
                            >
                                {item.emoji} {item.text}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Guest - Welcome message like MusicBed
    return (
        <div className="p-4">
            {/* Bubbles Avatar + Welcome Message */}
            <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-xs">B</span>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm max-w-[280px]">
                    <p className="text-sm text-gray-700 leading-relaxed">
                        Hi there! I'm Bubbles - how can I help you today? I can help you discover products,
                        find the perfect fit, and create amazing outfits.
                    </p>
                </div>
            </div>

            {/* Quick Suggestions */}
            <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-2">Try one of these to get started:</p>
                <div className="flex flex-wrap gap-2">
                    {[
                        { emoji: "✨", text: "Show me trending styles" },
                        { emoji: "🧥", text: "I need a hoodie" },
                        { emoji: "👕", text: "Looking for tees" },
                        { emoji: "🎨", text: "Surprise me!" }
                    ].map((item, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => handleQuickClick(item.text)}
                            className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 text-xs text-gray-600 hover:text-gray-800 transition-all cursor-pointer"
                        >
                            {item.emoji} {item.text}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
