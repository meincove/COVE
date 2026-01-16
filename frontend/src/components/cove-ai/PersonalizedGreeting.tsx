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

    // Signed-in personalized greeting - User info card like MusicBed
    if (isSignedIn && user) {
        const firstName = user.firstName || user.username || "there";
        const email = user.primaryEmailAddress?.emailAddress || "";

        return (
            <div className="p-4">
                {/* User Info Card - MusicBed Style */}
                <div className="flex items-start gap-3 mb-4">
                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Name:</span>
                            </div>
                            <p className="text-sm font-medium text-gray-800">{user.fullName || firstName}</p>

                            {email && (
                                <>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-xs text-gray-500">E-mail:</span>
                                    </div>
                                    <p className="text-sm text-gray-700">{email}</p>
                                </>
                            )}
                        </div>
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
